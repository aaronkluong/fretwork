# backend/fretboard/algorithms.py
# Onset note grouping, candidate generation, transition matrices, and Viterbi sequence optimization.

import math
from itertools import product
import numpy as np

from . import config as cfg
from .scoring import (
    DEFAULT_TUNED_WEIGHTS,
    CAGED_WEIGHTS,
    SOLO_BOX_SCALE,
    SOLO_MOVE_SCALE,
    SHIFT_FREE,
    context_cost,
    estimate_hand_position_from_frets,
    get_difficulty_profile,
    group_playability_cost,
    group_playability_cost_caged,
    group_span,
    old_theory_group_cost,
    candidate_window_cost,
    box_anchors_for_key,
    voicing_bonus,
)


def group_notes_by_onset(notes, tolerance=cfg.ONSET_TOLERANCE_SECONDS):
    if not notes:
        return []
    notes_sorted = sorted(
        notes,
        key=lambda x: (
            x["start"],
            x.get("true_string") if x.get("true_string") is not None else 99,
            x["midi"],
        ),
    )
    groups, current = [], [notes_sorted[0]]
    group_start = notes_sorted[0]["start"]
    for n in notes_sorted[1:]:
        if abs(n["start"] - group_start) <= tolerance:
            current.append(n)
        else:
            groups.append(current)
            current = [n]
            group_start = n["start"]
    groups.append(current)
    return groups


def enrich_candidate(candidate):
    positions = candidate["positions"]
    frets = [p["fret"] for p in positions]
    strings = [p["string"] for p in positions]
    candidate["center"] = estimate_hand_position_from_frets(frets)
    candidate["avg_string"] = float(np.mean(strings)) if strings else 0.0
    candidate["is_single"] = len(positions) == 1
    candidate["single_fret"] = positions[0]["fret"] if len(positions) == 1 else float("nan")
    candidate["single_string"] = positions[0]["string"] if len(positions) == 1 else float("nan")
    return candidate


def candidate_groups_for_notes(group_notes, max_candidates=cfg.MAX_GROUP_CANDIDATES):
    position_lists = []
    for n in group_notes:
        pos = cfg.get_possible_positions(n["midi"])
        if not pos:
            return []
        position_lists.append(pos)
    candidates = []
    for combo in product(*position_lists):
        combo = list(combo)
        if len(combo) > 1 and len({p["string"] for p in combo}) != len(combo):
            continue
        base_cost = group_playability_cost(combo) + context_cost(group_notes, combo)
        if math.isfinite(base_cost):
            candidates.append(enrich_candidate({"positions": combo, "base_cost": base_cost}))
    if not candidates:
        for combo in product(*position_lists):
            combo = list(combo)
            base_cost = group_playability_cost(combo)
            if math.isinf(base_cost):
                base_cost = 1000.0
            candidates.append(enrich_candidate({"positions": combo, "base_cost": base_cost}))
    return sorted(candidates, key=lambda c: c["base_cost"])[:max_candidates]


def transition_cost_matrix(prev_cands, curr_cands):
    prev_center = np.array([c["center"] for c in prev_cands], dtype=float)
    curr_center = np.array([c["center"] for c in curr_cands], dtype=float)
    prev_str = np.array([c["avg_string"] for c in prev_cands], dtype=float)
    curr_str = np.array([c["avg_string"] for c in curr_cands], dtype=float)
    mat = 1.2 * np.abs(prev_center[:, None] - curr_center[None, :])
    mat += 0.25 * np.abs(prev_str[:, None] - curr_str[None, :])

    prev_single = np.array([c["is_single"] for c in prev_cands], dtype=bool)
    curr_single = np.array([c["is_single"] for c in curr_cands], dtype=bool)
    single_mask = prev_single[:, None] & curr_single[None, :]
    if single_mask.any():
        pf = np.array([c["single_fret"] for c in prev_cands], dtype=float)[:, None]
        cf = np.array([c["single_fret"] for c in curr_cands], dtype=float)[None, :]
        ps = np.array([c["single_string"] for c in prev_cands], dtype=float)[:, None]
        cs = np.array([c["single_string"] for c in curr_cands], dtype=float)[None, :]
        fret_diff = np.abs(cf - pf)
        string_diff = np.abs(cs - ps)
        extra = 0.8 * fret_diff + 0.35 * string_diff
        extra += np.where(fret_diff > cfg.LARGE_JUMP_THRESHOLD, 4.0 + fret_diff - cfg.LARGE_JUMP_THRESHOLD, 0.0)
        extra += np.where((cf == 0) & (pf > 7), 2.0, 0.0)
        mat += np.where(single_mask, extra, 0.0)
    return mat


def candidate_groups_combined_all(group_notes, max_candidates=cfg.MAX_GROUP_CANDIDATES):
    position_lists = []
    for n in group_notes:
        pos = cfg.get_possible_positions(n["midi"])
        if not pos:
            return []
        position_lists.append(pos)
    candidates = []
    for combo in product(*position_lists):
        combo = list(combo)
        if len(combo) > 1 and len({p["string"] for p in combo}) != len(combo):
            continue
        base_cost = (
            group_playability_cost(combo)
            + context_cost(group_notes, combo)
            + old_theory_group_cost(group_notes, combo)
        )
        if math.isfinite(base_cost):
            candidates.append(enrich_candidate({"positions": combo, "base_cost": base_cost}))
    if not candidates:
        return candidate_groups_for_notes(group_notes, max_candidates=max_candidates)
    return sorted(candidates, key=lambda c: c["base_cost"])[:max_candidates]


def assign_combined_all(notes):
    groups = group_notes_by_onset(notes)
    all_candidates = [candidate_groups_combined_all(g) for g in groups]
    if any(len(cands) == 0 for cands in all_candidates):
        raise ValueError("At least one group has no valid candidates.")

    dp = [np.array([c["base_cost"] for c in all_candidates[0]], dtype=float)]
    backptr = [np.full(len(dp[0]), -1, dtype=int)]

    for i in range(1, len(groups)):
        prev_cands, curr_cands = all_candidates[i - 1], all_candidates[i]
        trans = transition_cost_matrix(prev_cands, curr_cands)
        curr_base = np.array([c["base_cost"] for c in curr_cands], dtype=float)
        scores = dp[i - 1][:, None] + trans + curr_base[None, :]
        curr_back = np.argmin(scores, axis=0).astype(int)
        curr_costs = scores[curr_back, np.arange(scores.shape[1])]
        dp.append(curr_costs)
        backptr.append(curr_back)

    idx = int(np.argmin(dp[-1]))
    chosen_indices = [idx]
    for i in range(len(groups) - 1, 0, -1):
        idx = int(backptr[i][idx])
        chosen_indices.append(idx)
    chosen_indices = list(reversed(chosen_indices))

    pred_rows = []
    for g, cands, ci in zip(groups, all_candidates, chosen_indices):
        positions = cands[ci]["positions"]
        for n, p in zip(g, positions):
            row = dict(n)
            row.update({"pred_string": p["string"], "pred_fret": p["fret"], "method": "combined_all"})
            pred_rows.append(row)
    return sorted(
        pred_rows,
        key=lambda x: (x["start"], x.get("true_string") if x.get("true_string") is not None else 99, x["midi"]),
    )


def candidate_groups_combined_all_tuned(group_notes, weights=None, max_candidates=cfg.MAX_GROUP_CANDIDATES):
    if weights is None:
        weights = DEFAULT_TUNED_WEIGHTS
    position_lists = []
    for n in group_notes:
        pos = cfg.get_possible_positions(n["midi"])
        if not pos:
            return []
        position_lists.append(pos)
    candidates = []
    for combo in product(*position_lists):
        combo = list(combo)
        if len(combo) > 1 and len({p["string"] for p in combo}) != len(combo):
            continue
        play_cost = group_playability_cost(combo)
        if not math.isfinite(play_cost):
            continue
        ctx_cost = context_cost(group_notes, combo)
        old_cost = old_theory_group_cost(group_notes, combo)
        prior_cost = float(np.mean([cfg.position_prior_cost(n["midi"], p) for n, p in zip(group_notes, combo)]))
        frets = [p["fret"] for p in combo]
        span_extra = group_span(frets)
        base_cost = (
            weights["playability"] * play_cost
            + weights["context"] * ctx_cost
            + weights["old_theory"] * old_cost
            + weights["position_prior"] * prior_cost
            + weights["group_span_extra"] * span_extra
        )
        if math.isfinite(base_cost):
            cand = enrich_candidate({
                "positions": combo,
                "base_cost": float(base_cost),
                "playability_cost": float(play_cost),
                "context_cost": float(ctx_cost),
                "old_theory_cost": float(old_cost),
                "position_prior_cost": float(prior_cost),
            })
            candidates.append(cand)
    if not candidates:
        return candidate_groups_combined_all(group_notes, max_candidates=max_candidates)
    return sorted(candidates, key=lambda c: c["base_cost"])[:max_candidates]


def tuned_transition_cost_matrix(prev_cands, curr_cands, weights=None):
    if weights is None:
        weights = DEFAULT_TUNED_WEIGHTS
    prev_center = np.array([c["center"] for c in prev_cands], dtype=float)
    curr_center = np.array([c["center"] for c in curr_cands], dtype=float)
    prev_str = np.array([c["avg_string"] for c in prev_cands], dtype=float)
    curr_str = np.array([c["avg_string"] for c in curr_cands], dtype=float)
    mat = weights["hand_shift"] * np.abs(prev_center[:, None] - curr_center[None, :])
    mat += weights["string_shift"] * np.abs(prev_str[:, None] - curr_str[None, :])
    prev_single = np.array([c["is_single"] for c in prev_cands], dtype=bool)
    curr_single = np.array([c["is_single"] for c in curr_cands], dtype=bool)
    single_mask = prev_single[:, None] & curr_single[None, :]
    if single_mask.any():
        pf = np.array([c["single_fret"] for c in prev_cands], dtype=float)[:, None]
        cf = np.array([c["single_fret"] for c in curr_cands], dtype=float)[None, :]
        ps = np.array([c["single_string"] for c in prev_cands], dtype=float)[:, None]
        cs = np.array([c["single_string"] for c in curr_cands], dtype=float)[None, :]
        fret_diff = np.abs(cf - pf)
        string_diff = np.abs(cs - ps)
        extra = weights["single_fret_shift"] * fret_diff
        extra += weights["single_string_shift"] * string_diff
        extra += np.where(
            fret_diff > cfg.LARGE_JUMP_THRESHOLD,
            weights["large_jump_extra"] + fret_diff - cfg.LARGE_JUMP_THRESHOLD,
            0.0,
        )
        extra += np.where((cf == 0) & (pf > 7), weights["open_after_high_extra"], 0.0)
        mat += np.where(single_mask, extra, 0.0)
    return mat


def assign_combined_all_tuned_with_weights(notes, weights=None, method_name="combined_all_tuned"):
    if weights is None:
        weights = DEFAULT_TUNED_WEIGHTS
    groups = group_notes_by_onset(notes)
    all_candidates = [candidate_groups_combined_all_tuned(g, weights=weights) for g in groups]
    if any(len(cands) == 0 for cands in all_candidates):
        raise ValueError("At least one group has no valid candidates.")

    dp = [np.array([c["base_cost"] for c in all_candidates[0]], dtype=float)]
    backptr = [np.full(len(dp[0]), -1, dtype=int)]
    for i in range(1, len(groups)):
        prev_cands, curr_cands = all_candidates[i - 1], all_candidates[i]
        trans = tuned_transition_cost_matrix(prev_cands, curr_cands, weights=weights)
        curr_base = np.array([c["base_cost"] for c in curr_cands], dtype=float)
        scores = dp[i - 1][:, None] + trans + curr_base[None, :]
        curr_back = np.argmin(scores, axis=0).astype(int)
        curr_costs = scores[curr_back, np.arange(scores.shape[1])]
        dp.append(curr_costs)
        backptr.append(curr_back)

    idx = int(np.argmin(dp[-1]))
    chosen_indices = [idx]
    for i in range(len(groups) - 1, 0, -1):
        idx = int(backptr[i][idx])
        chosen_indices.append(idx)
    chosen_indices = list(reversed(chosen_indices))

    pred_rows = []
    for g, cands, ci in zip(groups, all_candidates, chosen_indices):
        positions = cands[ci]["positions"]
        for n, p in zip(g, positions):
            row = dict(n)
            row.update({"pred_string": p["string"], "pred_fret": p["fret"], "method": method_name})
            pred_rows.append(row)
    return sorted(
        pred_rows,
        key=lambda x: (x["start"], x.get("true_string") if x.get("true_string") is not None else 99, x["midi"]),
    )


def assign_combined_all_tuned(notes):
    return assign_combined_all_tuned_with_weights(
        notes, weights=DEFAULT_TUNED_WEIGHTS, method_name="combined_all_tuned"
    )


def candidate_groups_caged(group_notes, max_candidates=cfg.MAX_GROUP_CANDIDATES, difficulty="expert"):
    pls = []
    for n in group_notes:
        pos = cfg.get_possible_positions(n["midi"])
        if not pos:
            return []
        pls.append(pos)

    def _greedy(cost):
        used = set()
        pick = {}
        for i in sorted(range(len(group_notes)), key=lambda k: -group_notes[k]["midi"]):
            opts = sorted(pls[i], key=lambda p: (p["fret"], p["string"]))
            chosen = next((p for p in opts if p["string"] not in used), opts[0])
            used.add(chosen["string"])
            pick[i] = chosen
        return enrich_candidate({"positions": [pick[i] for i in range(len(group_notes))], "base_cost": cost})

    space = 1
    for pl in pls:
        space *= len(pl)
    if space > 20000:
        return [_greedy(10.0)]

    cands = []
    profile = get_difficulty_profile(difficulty)
    w_playability = profile["w_playability"]
    w_context = CAGED_WEIGHTS["context"]
    w_prior = profile["w_prior"]

    for combo in product(*pls):
        combo = list(combo)
        if len(combo) > 1 and len({p["string"] for p in combo}) != len(combo):
            continue
        play = group_playability_cost_caged(combo, difficulty=difficulty)
        if not math.isfinite(play):
            continue
        prior = float(np.mean([cfg.position_prior_cost(n["midi"], p) for n, p in zip(group_notes, combo)]))
        base = (w_playability * play
                + w_context * context_cost(group_notes, combo)
                + w_prior * prior)
        cands.append(enrich_candidate({"positions": combo, "base_cost": float(base)}))

    if not cands:
        cands.append(_greedy(100.0))

    return sorted(cands, key=lambda c: c["base_cost"])[:max_candidates]


def candidate_groups_voiced(group_notes, max_candidates=cfg.MAX_GROUP_CANDIDATES, difficulty="expert"):
    # NOTE July21.ipynb: Notebook signature has no difficulty param (defaults to expert span 3/4).
    # Backend adds difficulty profile parameter to support beginner/intermediate user profiles.
    # Output is numerically identical to the notebook when difficulty="expert".
    pool = candidate_groups_caged(group_notes, max_candidates=max(max_candidates * 3, 24), difficulty=difficulty)
    profile = get_difficulty_profile(difficulty)
    # NOTE July21.ipynb: Notebook applies voicing unconditionally for chord groups.
    # Backend gates on cfg._VOICING_VALID to disable VOICING_SHAPES (which assume standard tuning intervals)
    # when alternate tunings alter inter-string interval geometry.
    w = profile["w_voicing"] if cfg._VOICING_VALID else 0.0

    if w and len(group_notes) >= 2:
        for c in pool:
            b = voicing_bonus(c["positions"])
            if b:
                c["base_cost"] = c["base_cost"] - w * b
        pool = sorted(pool, key=lambda c: c["base_cost"])
    return pool[:max_candidates]


def assign_caged_voiced(notes, key=None, difficulty="expert"):
    groups = group_notes_by_onset(notes)
    if not groups:
        return []
    all_cands = [candidate_groups_voiced(g, difficulty=difficulty) for g in groups]
    if any(len(c) == 0 for c in all_cands):
        raise ValueError("An onset group had no playable candidate positions.")
    is_chord = [len(g) >= 2 for g in groups]

    anchors = box_anchors_for_key(key)
    A = len(anchors)
    af = np.array([a["anchor"] for a in anchors], dtype=float)
    n = len(groups)
    ec = np.empty((n, A))
    ecand = [[0] * A for _ in range(n)]

    profile = get_difficulty_profile(difficulty)
    w_hand_move = profile["w_hand_move"]
    w_box_window = CAGED_WEIGHTS["box_window"]
    anchor_thr = profile["anchor_threshold"]
    anchor_cost = profile["anchor_cost"]

    for i, cands in enumerate(all_cands):
        kc_scale = 1.0 if is_chord[i] else SOLO_BOX_SCALE
        for j, anc in enumerate(anchors):
            a = anc["anchor"]
            difficulty_anchor_penalty = 0.0
            if anchor_thr is not None and a > anchor_thr:
                difficulty_anchor_penalty = anchor_cost * (a - anchor_thr)

            best, bci = None, 0
            for ci, c in enumerate(cands):
                tot = c["base_cost"] + w_box_window * candidate_window_cost(c, a)
                if best is None or tot < best:
                    best, bci = tot, ci
            ec[i, j] = best + kc_scale * anc["key_cost"] + difficulty_anchor_penalty
            ecand[i][j] = bci

    delta = np.abs(af[:, None] - af[None, :])
    base_trans = (w_hand_move * np.maximum(delta - SHIFT_FREE, 0.0)
                  + 0.5 * np.maximum(delta - cfg.LARGE_JUMP_THRESHOLD, 0.0) ** 2)

    dp = np.empty((n, A))
    back = np.zeros((n, A), dtype=int)
    dp[0] = ec[0]
    back[0] = -1
    for i in range(1, n):
        chordy = is_chord[i] or is_chord[i - 1]
        step_trans = base_trans if chordy else base_trans * SOLO_MOVE_SCALE
        scores = dp[i - 1][:, None] + step_trans + ec[i][None, :]
        back[i] = np.argmin(scores, axis=0)
        dp[i] = scores[back[i], np.arange(A)]

    j = int(np.argmin(dp[-1]))
    chosen = [j]
    for i in range(n - 1, 0, -1):
        j = int(back[i][j])
        chosen.append(j)
    chosen = list(reversed(chosen))

    pred = []
    for i, (g, cands) in enumerate(zip(groups, all_cands)):
        c = cands[ecand[i][chosen[i]]]
        for note, p in zip(g, c["positions"]):
            row = dict(note)
            row.update({"pred_string": p["string"], "pred_fret": p["fret"],
                        "method": "caged_voiced", "anchor": anchors[chosen[i]]["anchor"]})
            pred.append(row)
    return sorted(pred, key=lambda x: (x["start"], x["midi"]))
