# backend/fretboard/transformer.py
# Transformer position prior, causal seq-to-seq scoring, and fingering variant decoding.

import warnings
from collections import defaultdict
from pathlib import Path
import numpy as np

from . import config as cfg
from .theory import get_key_info
from .scoring import get_difficulty_profile, resolve_difficulty
from .algorithms import group_notes_by_onset, candidate_groups_voiced
from .api import _prepare_enriched_notes, _predictions_to_output

_models_dir = Path(__file__).parent.parent / "models"
_TRANSFORMER_PATH = _models_dir / "tab_transformer_final.pt" if (_models_dir / "tab_transformer_final.pt").exists() else Path(__file__).parent.parent / "tab_transformer_final.pt"
_TP_MIN_MIDI, _TP_N_PITCH, _TP_N_POS = 40, 49, 150
_TP_BOS = 150
TRANSFORMER_WEIGHT = 2.0
BEAM_WIDTH = 8

ANCHOR_PULL = 0.9
MIN_DISTINCT_FRAC = 0.25
DEFAULT_VARIANT_ANCHORS = (None, 3, 8, 12)

TP_MODEL = None
_TP_CTX = None
_VALID_T = None
_TP_DEVICE = None
_TRANSFORMER_LOAD_ERROR = None


def _load_transformer_prior():
    global TP_MODEL, _TP_CTX, _VALID_T, _TP_DEVICE, _TRANSFORMER_LOAD_ERROR
    if TP_MODEL is not None or _TRANSFORMER_LOAD_ERROR is not None:
        return
    try:
        import torch
        import torch.nn as nn

        _TP_DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        class _TabTransformer(nn.Module):
            def __init__(self, d, layers, heads, ctx):
                super().__init__()
                self.ctx = ctx
                self.emb_pitch = nn.Embedding(_TP_N_PITCH, d)
                self.emb_prev = nn.Embedding(_TP_N_POS + 1, d)
                self.emb_flag = nn.Embedding(2, d)
                self.emb_time = nn.Embedding(ctx, d)
                layer = nn.TransformerEncoderLayer(
                    d_model=d, nhead=heads, dim_feedforward=4 * d,
                    dropout=0.1, batch_first=True, norm_first=True,
                )
                self.encoder = nn.TransformerEncoder(layer, num_layers=layers)
                self.head = nn.Linear(d, _TP_N_POS)

            def forward(self, pitch, prev_pos, flag):
                B, T = pitch.shape
                t_idx = torch.arange(T, device=pitch.device).unsqueeze(0).expand(B, T)
                x = (self.emb_pitch(pitch) + self.emb_prev(prev_pos)
                     + self.emb_flag(flag) + self.emb_time(t_idx))
                causal = torch.triu(torch.ones(T, T, dtype=torch.bool, device=pitch.device), 1)
                return self.head(self.encoder(x, mask=causal))

        if not _TRANSFORMER_PATH.exists():
            raise FileNotFoundError(str(_TRANSFORMER_PATH))

        ckpt = torch.load(_TRANSFORMER_PATH, map_location=_TP_DEVICE, weights_only=False)
        cfg_dict = ckpt["config"]
        model = _TabTransformer(cfg_dict["d"], cfg_dict["layers"], cfg_dict["heads"], cfg_dict["ctx"]).to(_TP_DEVICE)
        model.load_state_dict(ckpt["model"])
        model.eval()

        valid = np.zeros((_TP_N_PITCH, _TP_N_POS), dtype=bool)
        for s, open_midi in enumerate(cfg.OPEN_STRING_MIDI):
            for f in range(25):
                m = open_midi + f
                if _TP_MIN_MIDI <= m <= _TP_MIN_MIDI + _TP_N_PITCH - 1:
                    valid[m - _TP_MIN_MIDI, s * 25 + f] = True

        TP_MODEL = model
        _TP_CTX = cfg_dict["ctx"]
        _VALID_T = torch.tensor(valid, dtype=torch.bool, device=_TP_DEVICE)
    except Exception as exc:
        _TRANSFORMER_LOAD_ERROR = exc
        warnings.warn(f"Transformer position prior unavailable, falling back to assign_caged_voiced: {exc}")


def _tp_score_extensions(histories, extensions):
    import torch

    seq_p, seq_prev, seq_g, meta = [], [], [], []
    for b, (hp, hq, hg) in enumerate(histories):
        for c, (ep, eq, eg) in enumerate(extensions[b]):
            p = (hp + ep)[-_TP_CTX:]
            q = (hq + eq)[-_TP_CTX:]
            g = (hg + eg)[-_TP_CTX:]
            prev = [_TP_BOS] + q[:-1]
            seq_p.append(p)
            seq_prev.append(prev)
            seq_g.append(g)
            meta.append((b, c, len(ep), len(p)))

    if not seq_p:
        return defaultdict(dict)

    maxlen = max(len(s) for s in seq_p)

    def pad(seqs, val):
        return torch.tensor([s + [val] * (maxlen - len(s)) for s in seqs], dtype=torch.long, device=_TP_DEVICE)

    P, PR, G = pad(seq_p, 0), pad(seq_prev, _TP_BOS), pad(seq_g, 0)
    with torch.no_grad():
        logits = TP_MODEL(P, PR, G)
        logits = logits.masked_fill(~_VALID_T[P], -1e9)
        logp = torch.log_softmax(logits, dim=-1)

    out = defaultdict(dict)
    for row, (b, c, n_new, L) in enumerate(meta):
        nll = 0.0
        full_q = (histories[b][1] + list(extensions[b][c][1]))[-_TP_CTX:]
        for t in range(L - n_new, L):
            nll -= float(logp[row, t, full_q[t]])
        out[b][c] = nll
    return out


def assign_transformer_anchored(notes, key=None, difficulty="expert", anchor=None, candidate_groups_override=None):
    _load_transformer_prior()
    if TP_MODEL is None:
        raise RuntimeError(f"transformer position prior not loaded: {_TRANSFORMER_LOAD_ERROR}")

    profile = get_difficulty_profile(difficulty)
    # NOTE July21.ipynb: Uses CAGED_WEIGHTS['hand_move'] = 0.70 (fixed).
    # Backend uses profile["w_hand_move"] (which equals 0.70 when difficulty="expert").
    w_hand_move = profile["w_hand_move"]

    groups = group_notes_by_onset(notes)
    if not groups:
        return []

    beams = [{"hp": [], "hq": [], "hg": [], "cost": 0.0, "centers": None, "choice": []}]
    if candidate_groups_override is not None:
        allc = [c or None for c in candidate_groups_override]
    else:
        allc = [candidate_groups_voiced(g, difficulty=difficulty) or None for g in groups]

    for gi, g in enumerate(groups):
        cands = allc[gi]
        if cands is None:
            for b in beams:
                b["choice"].append(None)
            continue
        pos_sorted_per_cand = [sorted(c["positions"], key=lambda p_: p_["midi"]) for c in cands]
        exts_per_cand = []
        for pos_sorted in pos_sorted_per_cand:
            ep = [int(p_["midi"]) - _TP_MIN_MIDI for p_ in pos_sorted]
            eq = [int(p_["string"]) * 25 + int(p_["fret"]) for p_ in pos_sorted]
            eg = [1] + [0] * (len(pos_sorted) - 1)
            exts_per_cand.append((ep, eq, eg))

        histories = [(b["hp"], b["hq"], b["hg"]) for b in beams]
        extensions = [exts_per_cand for _ in beams]
        nll = _tp_score_extensions(histories, extensions)

        scored = []
        for bi, b in enumerate(beams):
            for ci, c in enumerate(cands):
                cf = [p_["fret"] for p_ in c["positions"] if p_["fret"] > 0]
                cc = float(np.mean(cf)) if cf else 0.0
                move = 0.0
                if b["centers"] is not None:
                    move = w_hand_move * abs(cc - b["centers"])
                anchor_cost = ANCHOR_PULL * abs(cc - anchor) if (anchor is not None and cf) else 0.0
                total = b["cost"] + c["base_cost"] + move + anchor_cost + TRANSFORMER_WEIGHT * nll[bi][ci]
                scored.append((total, bi, ci, cc if cf else b["centers"]))
        scored.sort(key=lambda x: x[0])

        new_beams = []
        for total, bi, ci, center in scored[:BEAM_WIDTH]:
            b = beams[bi]
            ep, eq, eg = exts_per_cand[ci]
            new_beams.append({
                "hp": (b["hp"] + ep)[-_TP_CTX:], "hq": (b["hq"] + eq)[-_TP_CTX:],
                "hg": (b["hg"] + eg)[-_TP_CTX:], "cost": total,
                "centers": center, "choice": b["choice"] + [ci],
            })
        beams = new_beams

    best = min(beams, key=lambda b: b["cost"])
    out = []
    for gi, (g, ci) in enumerate(zip(groups, best["choice"])):
        if ci is None or allc[gi] is None:
            continue
        c = allc[gi][ci]
        pos_sorted = sorted(c["positions"], key=lambda p_: p_["midi"])
        g_sorted = sorted(g, key=lambda n_: n_["midi"])
        for note, p in zip(g_sorted, pos_sorted):
            row = dict(note)
            # NOTE July21.ipynb: Notebook variant rows omit 'method' tag.
            # Backend includes 'method' on all output rows for API traceability.
            row.update({"pred_string": p["string"], "pred_fret": p["fret"],
                        "method": "prox_viterbi_transformer"})
            out.append(row)
    return sorted(out, key=lambda x: (x["start"], x["midi"]))



def assign_prox_viterbi_transformer(notes, key=None, difficulty="expert"):
    return assign_transformer_anchored(notes, key=key, difficulty=difficulty, anchor=None)


def _norm_string_idx(s):
    if isinstance(s, int):
        if 0 <= s <= 5:
            return s
        if 1 <= s <= 6:
            return 6 - s
    s_str = str(s).strip()
    if s_str.isdigit():
        val = int(s_str)
        if 0 <= val <= 5:
            return val
        if 1 <= val <= 6:
            return 6 - val
    m_names = {"low_E": 0, "E2": 0, "E": 0, "A": 1, "D": 2, "G": 3, "B": 4, "high_E": 5, "e": 5, "E4": 5}
    if s_str in m_names:
        return m_names[s_str]
    raise ValueError(f"Unknown string identifier: {s}")


def assign_transformer_pinned(notes, key=None, difficulty="expert", pins=None, delete=None):
    """
    Run Prox-Viterbi Transformer beam decode with pinned note position constraints
    and optional note deletion set (matching July21.ipynb pin & re-decode feature).

    pins: dict mapping note index -> (string, fret) tuple or [string, fret]
    delete: set or list of note indices to exclude before onset grouping
    """
    if not notes:
        return []

    pins_normalized = {}
    if pins:
        for idx_k, val in pins.items():
            try:
                idx = int(idx_k)
                if isinstance(val, (list, tuple)) and len(val) == 2:
                    s_raw, f_raw = val[0], val[1]
                    s = _norm_string_idx(s_raw)
                    f = int(f_raw)
                    pins_normalized[idx] = (s, f)
            except Exception as e:
                warnings.warn(f"Invalid pin specification {idx_k}: {val} ({e})")

    delete_set = set(int(i) for i in (delete or []))

    ordered = sorted(notes, key=lambda n: (float(n["start"]), int(n["midi"])))
    if delete_set and len(delete_set) >= len(ordered):
        raise ValueError("The 'delete' set removes all notes — at least one note must remain for decoding.")
    # Validate pins against physics before decoding
    for idx, (s, f) in pins_normalized.items():
        if idx >= len(ordered):
            raise ValueError(f"Pin index {idx} out of range ({len(ordered)} notes)")
        n_midi = int(ordered[idx]["midi"])
        expected_midi = cfg.OPEN_STRING_MIDI[s] + f
        if expected_midi != n_midi:
            raise ValueError(
                f"Invalid pin for note index {idx} (MIDI {n_midi}): "
                f"string {s}, fret {f} produces MIDI {expected_midi}."
            )

    kept, kept_idx = [], []
    for i, n in enumerate(ordered):
        if i in delete_set:
            continue
        kept.append(n)
        kept_idx.append(i)

    groups = group_notes_by_onset(kept)
    if not groups:
        return []

    id_to_orig = {id(n): kept_idx[i] for i, n in enumerate(kept)}
    all_cands = []

    for g in groups:
        cands = candidate_groups_voiced(g, difficulty=difficulty)
        g_sorted = sorted(g, key=lambda n_: n_["midi"])
        group_pins = {}
        for slot, note in enumerate(g_sorted):
            oi = id_to_orig[id(note)]
            if oi in pins_normalized:
                group_pins[slot] = pins_normalized[oi]

        if cands and group_pins:
            filtered = []
            for c in cands:
                pos_sorted = sorted(c["positions"], key=lambda p_: p_["midi"])
                if all(
                    pos_sorted[slot]["string"] == s and pos_sorted[slot]["fret"] == f
                    for slot, (s, f) in group_pins.items()
                    if slot < len(pos_sorted)
                ):
                    filtered.append(c)
            if filtered:
                cands = filtered
            else:
                warnings.warn(f"Pin constraint for group at t={g[0]['start']:.2f}s yielded 0 candidates; retaining original candidate pool.")
        all_cands.append(cands if cands else None)

    return assign_transformer_anchored(
        kept, key=key, difficulty=difficulty, anchor=None, candidate_groups_override=all_cands
    )


def _variant_fingerprint(rows):
    return [(int(r["pred_string"]), int(r["pred_fret"])) for r in rows
            if r.get("pred_string") is not None and r.get("pred_fret") is not None]


def _distinct_frac(a, b):
    n = min(len(a), len(b))
    if n == 0:
        return 1.0
    return sum(1 for i in range(n) if a[i] != b[i]) / n


def _label_for_predictions(rows):
    frets = [r["pred_fret"] for r in rows if r.get("pred_fret")]
    if not frets:
        return "open position"
    med = float(np.median(frets))
    return "open position" if med <= 3 else f"around fret {int(round(med))}"


def get_fingering_variants(note_events, chords=None, key_label=None, tuning="standard",
                            capo=0, difficulty="expert", anchors=DEFAULT_VARIANT_ANCHORS):
    if not note_events:
        return []
    if chords is None:
        chords = []
    try:
        with cfg.fretboard_config(tuning=tuning, capo=capo):
            enriched = _prepare_enriched_notes(note_events, chords, key_label)
            if not enriched:
                return []
            key_info = get_key_info(key_label) if key_label else None
            resolved_difficulty = resolve_difficulty(difficulty)

            seen_fps = []
            variants = []
            for a in anchors:
                rows = assign_transformer_anchored(
                    enriched, key=key_info, difficulty=resolved_difficulty, anchor=a
                )
                if not rows:
                    continue
                fp = _variant_fingerprint(rows)
                if any(_distinct_frac(fp, seen) < MIN_DISTINCT_FRAC for seen in seen_fps):
                    continue
                seen_fps.append(fp)
                v_segments, v_notes = _predictions_to_output(rows, chords)
                variants.append({
                    "anchor": a,
                    "label": _label_for_predictions(rows),
                    "tab_segments": v_segments,
                    "notes": v_notes,
                })
            return variants
    except Exception as exc:
        warnings.warn(f"get_fingering_variants failed, returning no variants: {exc}")
        return []

