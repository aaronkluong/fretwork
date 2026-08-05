# backend/fretboard/config.py
# Fretboard configuration, layout builders, constants, and global state context managers.

import json
import math
import threading
import warnings
from collections import defaultdict
from contextlib import contextmanager
from pathlib import Path

def _load_theory_config():
    base_dir = Path(__file__).resolve().parent.parent.parent
    candidates = [
        base_dir / "config" / "theory_config.json",
        base_dir / "fretwork" / "src" / "config" / "theory_config.json",
        Path(__file__).resolve().parent / "theory_config.json",
    ]
    for p in candidates:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                warnings.warn(f"Failed to parse theory config from {p}: {e}")
    return {}

_THEORY_CONFIG = _load_theory_config()

MAX_FRET = _THEORY_CONFIG.get("max_fret", 24)
STANDARD_TUNING = _THEORY_CONFIG.get("standard_tuning", [40, 45, 50, 55, 59, 64])
OPEN_STRING_MIDI = list(STANDARD_TUNING)
STRING_NAMES = _THEORY_CONFIG.get("string_names", ["low_E", "A", "D", "G", "B", "high_E"])
STRING_DISPLAY_LABELS = _THEORY_CONFIG.get("string_display_labels", ["e", "B", "G", "D", "A", "E"])

_erg = _THEORY_CONFIG.get("ergonomics", {})
ONSET_TOLERANCE_SECONDS = _erg.get("onset_tolerance_seconds", 0.035)
COMFORTABLE_SPAN = _erg.get("comfortable_span", 5)
MAX_REACHABLE_SPAN = _erg.get("max_reachable_span", 7)
LARGE_JUMP_THRESHOLD = _erg.get("large_jump_threshold", 5)
MAX_GROUP_CANDIDATES = _erg.get("max_group_candidates", 25)

TUNINGS = _THEORY_CONFIG.get("tunings", {
    "standard": [40, 45, 50, 55, 59, 64],
    "drop_d": [38, 45, 50, 55, 59, 64],
    "drop_c": [36, 43, 48, 53, 57, 62],
    "eb_standard": [39, 44, 49, 54, 58, 63],
    "dadgad": [38, 45, 50, 55, 57, 62],
    "open_g": [38, 43, 50, 55, 59, 62],
})


_FRETBOARD_LOCK = threading.RLock()
_VOICING_VALID = True
_LOW_E_PC = OPEN_STRING_MIDI[0] % 12

POSITION_PRIOR_COSTS: dict = {}


def build_fretboard(open_string_midi=OPEN_STRING_MIDI, max_fret=MAX_FRET):
    rows = []
    for string_idx, open_midi in enumerate(open_string_midi):
        for fret in range(max_fret + 1):
            midi = open_midi + fret
            rows.append({
                "string": string_idx,
                "string_name": STRING_NAMES[string_idx],
                "fret": fret,
                "midi": midi,
                "pitch_class": midi % 12,
            })
    return rows


_fretboard_rows = build_fretboard()
MIDI_TO_POSITIONS = defaultdict(list)
for _row in _fretboard_rows:
    MIDI_TO_POSITIONS[int(_row["midi"])].append({
        "string": int(_row["string"]),
        "string_name": _row["string_name"],
        "fret": int(_row["fret"]),
        "midi": int(_row["midi"]),
        "pitch_class": int(_row["pitch_class"]),
    })


def get_possible_positions(midi_note, max_fret=MAX_FRET):
    midi_note = int(round(midi_note))
    return [p for p in MIDI_TO_POSITIONS.get(midi_note, []) if 0 <= p["fret"] <= max_fret]


def _load_exported_position_prior(path=None):
    """Load a pre-exported {"midi,string,fret": cost} JSON into POSITION_PRIOR_COSTS.
    Safe no-op if the file is missing or malformed."""
    global POSITION_PRIOR_COSTS
    if path is None:
        models_path = Path(__file__).parent.parent / "models" / "guitarset_position_prior.json"
        path = models_path if models_path.exists() else Path(__file__).parent.parent / "guitarset_position_prior.json"
    else:
        path = Path(path)
    if not path.exists():
        return
    try:
        with open(path) as f:
            raw = json.load(f)
        POSITION_PRIOR_COSTS = {
            tuple(int(part) for part in key.split(",")): float(cost)
            for key, cost in raw.items()
        }
    except Exception as exc:
        warnings.warn(f"Failed to load exported position prior from {path}: {exc}")


_load_exported_position_prior()


def build_position_prior(records, alpha=0.50):
    """Build an empirical prior over guitar positions: P(string, fret | midi)."""
    counts: dict = {}
    for rec in records:
        for n in rec.get("notes", []):
            midi = n.get("midi")
            s = n.get("true_string")
            f = n.get("true_fret")
            if midi is None or s is None or f is None:
                continue
            try:
                midi, s, f = int(midi), int(s), int(f)
            except Exception:
                continue
            if not (0 <= s < len(OPEN_STRING_MIDI) and 0 <= f <= MAX_FRET):
                continue
            if OPEN_STRING_MIDI[s] + f != midi:
                continue
            counts[(midi, s, f)] = counts.get((midi, s, f), 0) + 1

    prior_costs: dict = {}
    for midi in range(min(MIDI_TO_POSITIONS.keys()), max(MIDI_TO_POSITIONS.keys()) + 1):
        positions = get_possible_positions(midi)
        if not positions:
            continue
        total = sum(counts.get((midi, p["string"], p["fret"]), 0) for p in positions)
        denom = total + alpha * len(positions)
        raw_costs = []
        for p in positions:
            prob = (counts.get((midi, p["string"], p["fret"]), 0) + alpha) / denom
            raw_costs.append(-math.log(prob))
        min_cost = min(raw_costs)
        for p, cost in zip(positions, raw_costs):
            prior_costs[(midi, p["string"], p["fret"])] = cost - min_cost

    return prior_costs


def build_and_load_position_prior(records, alpha=0.50):
    """Build the prior and store it in the module-level POSITION_PRIOR_COSTS dict."""
    global POSITION_PRIOR_COSTS
    POSITION_PRIOR_COSTS = build_position_prior(records, alpha=alpha)


def position_prior_cost(midi, position):
    """Lower cost = position is more common for this MIDI note in GuitarSet."""
    key = (int(midi), int(position["string"]), int(position["fret"]))
    return float(POSITION_PRIOR_COSTS.get(key, 0.75))


def _intervals_match_standard(open_midi):
    return all(open_midi[i] - open_midi[0] == STANDARD_TUNING[i] - STANDARD_TUNING[0]
               for i in range(6))


@contextmanager
def fretboard_config(tuning="standard", capo=0):
    """Configure the global fretboard for `tuning` + `capo` for the duration of the
    block, under a lock, then restore standard tuning. Frets are capo-relative.
    """
    global OPEN_STRING_MIDI, MIDI_TO_POSITIONS, _LOW_E_PC, _VOICING_VALID

    base = TUNINGS[tuning] if isinstance(tuning, str) else list(tuning)
    if len(base) != 6:
        raise ValueError("tuning must have 6 open-string MIDI values")
    if not (0 <= capo <= MAX_FRET - 1):
        raise ValueError(f"capo must be between 0 and {MAX_FRET - 1}")

    with _FRETBOARD_LOCK:
        saved = (OPEN_STRING_MIDI, MIDI_TO_POSITIONS, _LOW_E_PC, _VOICING_VALID)
        try:
            open_eff = [m + capo for m in base]
            rows = build_fretboard(open_string_midi=open_eff, max_fret=MAX_FRET - capo)
            m2p = defaultdict(list)
            for r in rows:
                m2p[int(r["midi"])].append({
                    "string": int(r["string"]), "string_name": r["string_name"],
                    "fret": int(r["fret"]), "midi": int(r["midi"]),
                    "pitch_class": int(r["pitch_class"]),
                })
            OPEN_STRING_MIDI = open_eff
            MIDI_TO_POSITIONS = m2p
            _LOW_E_PC = open_eff[0] % 12
            _VOICING_VALID = _intervals_match_standard(open_eff)
            yield
        finally:
            OPEN_STRING_MIDI, MIDI_TO_POSITIONS, _LOW_E_PC, _VOICING_VALID = saved


def tab_capo_header(tuning="standard", capo=0):
    """One-line header for ASCII/notation output, e.g. 'Tuning: drop_d | Capo 2'."""
    parts = []
    name = tuning if isinstance(tuning, str) else "custom"
    if name != "standard":
        parts.append(f"Tuning: {name}")
    if capo:
        parts.append(f"Capo {capo}")
    return " | ".join(parts) if parts else "Standard tuning, no capo"
