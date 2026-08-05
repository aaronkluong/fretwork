# backend/fretboard/scoring.py
# Playability scoring, fingering penalties, transition costs, and CAGED box calculations.

import numpy as np
from . import config as cfg

OLD_THEORY_WEIGHTS = {
    "key_alignment": 1.0,
    "chord_tone": 2.0,
    "open_string_bonus": 1.0,
    "low_position_bonus": 0.5,
    "middle_neck_bonus": 0.3,
    "position_continuity": 0.5,
    "continuity_cap": 5.0,
}

DEFAULT_TUNED_WEIGHTS = {
    "playability": 0.70,
    "context": 0.35,
    "old_theory": 0.45,
    "position_prior": 1.15,
    "hand_shift": 1.05,
    "string_shift": 0.22,
    "single_fret_shift": 0.65,
    "single_string_shift": 0.30,
    "large_jump_extra": 4.50,
    "open_after_high_extra": 2.25,
    "group_span_extra": 0.15,
}

CAGED_WEIGHTS = {
    "playability": 0.80,
    "context": 0.30,
    "box_window": 1.00,
    "hand_move": 0.70,
    "position_prior": 1.00,
    "voicing": 1.0,
}
SOLO_MOVE_SCALE = 0.35
SOLO_BOX_SCALE = 0.30

COMFORTABLE_CHORD_SPAN = 3
MAX_CHORD_SPAN = 4
BOX_WINDOW = 4
SHIFT_FREE = 2
BOX_CENTER_COST = 0.15
BOX_OUTSIDE_COST = 3.00
OPEN_OUT_OF_BOX_COST = 0.60
BOX_OFFBOX_COST = 0.60
BOX_NONHOME_COST = 1.00
BOX_LOWNECK_COST = 0.04

DIFFICULTY_PROFILES = {
    "expert": {
        "comfortable_span": COMFORTABLE_CHORD_SPAN,
        "max_span": MAX_CHORD_SPAN,
        "high_fret_threshold": None,
        "high_fret_cost": 0.0,
        "barre_penalty": 0.0,
        "w_playability": CAGED_WEIGHTS["playability"],
        "w_prior": CAGED_WEIGHTS["position_prior"],
        "w_voicing": CAGED_WEIGHTS["voicing"],
        "w_hand_move": CAGED_WEIGHTS["hand_move"],
        "anchor_threshold": None,
        "anchor_cost": 0.0,
    },
    "beginner": {
        "comfortable_span": 2,
        "max_span": 3,
        "high_fret_threshold": 5,
        "high_fret_cost": 6.0,
        "barre_penalty": 10.0,
        "w_playability": 1.5,
        "w_prior": 1.2,
        "w_voicing": 0.5,
        "w_hand_move": 2.0,
        "anchor_threshold": 5,
        "anchor_cost": 3.0,
    },
    "intermediate": {
        "comfortable_span": COMFORTABLE_CHORD_SPAN,
        "max_span": MAX_CHORD_SPAN,
        "high_fret_threshold": 7,
        "high_fret_cost": 3.5,
        "barre_penalty": 3.0,
        "w_playability": 1.2,
        "w_prior": CAGED_WEIGHTS["position_prior"],
        "w_voicing": CAGED_WEIGHTS["voicing"],
        "w_hand_move": 1.3,
        "anchor_threshold": 7,
        "anchor_cost": 1.5,
    },
}

PENTATONIC = {"major": [0, 2, 4, 7, 9], "minor": [0, 3, 5, 7, 10]}


def resolve_difficulty(difficulty):
    """Normalize difficulty; unknown / empty values fall back to expert (as-is)."""
    if difficulty is None:
        return "expert"
    key = str(difficulty).strip().lower()
    if key not in DIFFICULTY_PROFILES:
        return "expert"
    return key


def get_difficulty_profile(difficulty="expert"):
    return DIFFICULTY_PROFILES[resolve_difficulty(difficulty)]


def estimate_hand_position_from_frets(frets):
    fretted = [f for f in frets if f > 0]
    return 0 if not fretted else int(round(np.median(fretted)))


def group_span(frets):
    fretted = [f for f in frets if f > 0]
    return 0 if len(fretted) <= 1 else max(fretted) - min(fretted)


def awkward_fingering_penalty(position, hand_center):
    fret = position["fret"]
    if fret == 0:
        return 0.0
    distance = abs(fret - hand_center)
    if distance <= 2:
        return 0.0
    if distance <= cfg.COMFORTABLE_SPAN:
        return 0.5 * (distance - 2)
    if distance <= cfg.MAX_REACHABLE_SPAN:
        return 2.0 + (distance - cfg.COMFORTABLE_SPAN)
    return 10.0 + 2.0 * (distance - cfg.MAX_REACHABLE_SPAN)


def group_playability_cost(group_positions):
    if not group_positions:
        return 0.0
    strings = [p["string"] for p in group_positions]
    frets = [p["fret"] for p in group_positions]
    fretted = [f for f in frets if f > 0]
    cost = 0.0
    if len(strings) != len(set(strings)):
        return float("inf")
    span = group_span(frets)
    if span > cfg.COMFORTABLE_SPAN:
        cost += 2.0 * (span - cfg.COMFORTABLE_SPAN)
    if span > cfg.MAX_REACHABLE_SPAN:
        cost += 25.0 * (span - cfg.MAX_REACHABLE_SPAN)
    if fretted and min(fretted) <= 2 and max(fretted) >= 9:
        cost += 8.0
    if len(strings) >= 2:
        string_span = max(strings) - min(strings)
        if string_span > 4 and len(strings) <= 3:
            cost += 1.5 * (string_span - 4)
    hand_center = estimate_hand_position_from_frets(frets)
    cost += sum(awkward_fingering_penalty(p, hand_center) for p in group_positions)
    if any(f == 0 for f in frets) and fretted and max(fretted) > 7:
        cost += 3.0
    return cost


def group_playability_cost_caged(gp, difficulty="expert"):
    if not gp:
        return 0.0
    profile = get_difficulty_profile(difficulty)
    strings = [p["string"] for p in gp]
    frets = [p["fret"] for p in gp]
    fretted = [f for f in frets if f > 0]
    if len(strings) != len(set(strings)):
        return float("inf")
    cost = 0.0

    comp_span = profile["comfortable_span"]
    max_span = profile["max_span"]

    span = group_span(frets)
    if span > comp_span:
        cost += 2.0 * (span - comp_span)
    if span > max_span:
        cost += 25.0 * (span - max_span)
    if fretted and min(fretted) <= 2 and max(fretted) >= 9:
        cost += 8.0
    if len(strings) >= 2:
        ss = max(strings) - min(strings)
        if ss > 4 and len(strings) <= 3:
            cost += 1.5 * (ss - 4)
    hc = estimate_hand_position_from_frets(frets)
    cost += sum(awkward_fingering_penalty(p, hc) for p in gp)
    if any(f == 0 for f in frets) and fretted and max(fretted) > 7:
        cost += 3.0

    thr = profile["high_fret_threshold"]
    if thr is not None:
        hf_cost = profile["high_fret_cost"]
        for f in fretted:
            if f > thr:
                cost += hf_cost * (f - thr)

    barre_pen = profile["barre_penalty"]
    if barre_pen and len(fretted) >= 3:
        fret_counts = {}
        for f in fretted:
            fret_counts[f] = fret_counts.get(f, 0) + 1
        if any(cnt >= 3 for cnt in fret_counts.values()):
            cost += barre_pen

    return cost


def transition_cost(prev_group, curr_group):
    if prev_group is None or curr_group is None:
        return 0.0
    prev_frets = [p["fret"] for p in prev_group]
    curr_frets = [p["fret"] for p in curr_group]
    prev_strings = [p["string"] for p in prev_group]
    curr_strings = [p["string"] for p in curr_group]
    prev_center = estimate_hand_position_from_frets(prev_frets)
    curr_center = estimate_hand_position_from_frets(curr_frets)
    cost = 1.2 * abs(curr_center - prev_center) + 0.25 * abs(np.mean(curr_strings) - np.mean(prev_strings))
    if len(prev_group) == 1 and len(curr_group) == 1:
        pf, cf = prev_group[0]["fret"], curr_group[0]["fret"]
        ps, cs = prev_group[0]["string"], curr_group[0]["string"]
        cost += 0.8 * abs(cf - pf) + 0.35 * abs(cs - ps)
        if abs(cf - pf) > cfg.LARGE_JUMP_THRESHOLD:
            cost += 4.0 + abs(cf - pf) - cfg.LARGE_JUMP_THRESHOLD
        if cf == 0 and pf > 7:
            cost += 2.0
    return cost


def context_cost(group_notes, group_positions):
    cost = 0.0
    for n, p in zip(group_notes, group_positions):
        if n.get("in_chord") is False:
            cost += 0.15
        if n.get("in_key") is False:
            cost += 0.10
    return cost


def old_position_score(midi, position, note_row=None, previous_position=None, weights=None):
    if weights is None:
        weights = OLD_THEORY_WEIGHTS
    fret = position["fret"]
    score = 0.0
    if note_row is not None and note_row.get("in_key") is True:
        score += weights["key_alignment"]
    if note_row is not None and note_row.get("in_chord") is True:
        score += weights["chord_tone"]
    if fret == 0:
        score += weights["open_string_bonus"]
    elif fret <= 3:
        score += weights["low_position_bonus"]
    elif 4 <= fret <= 12:
        score += weights["middle_neck_bonus"]
    if previous_position is not None:
        prev_fret = previous_position["fret"]
        if prev_fret > 0 and fret > 0:
            fret_distance = min(abs(fret - prev_fret), weights["continuity_cap"])
            score -= weights["position_continuity"] * (fret_distance ** 0.5)
    return float(score)


def old_theory_group_cost(group_notes, group_positions):
    if not group_notes or not group_positions:
        return 0.0
    scores = [
        old_position_score(n["midi"], p, note_row=n, previous_position=None)
        for n, p in zip(group_notes, group_positions)
    ]
    return -0.35 * float(np.mean(scores))


def box_anchors_for_key(key, max_fret=cfg.MAX_FRET, window=BOX_WINDOW):
    rng = range(0, max_fret - window + 1)
    if key is None:
        return [{"anchor": a, "key_cost": BOX_LOWNECK_COST * a} for a in rng]
    r = key["root_pc"]
    penta = PENTATONIC.get(key["mode"], PENTATONIC["minor"])
    box = set()
    for deg in penta:
        f = (deg + (r - cfg._LOW_E_PC)) % 12
        while f <= max_fret - 1:
            box.add(f)
            f += 12
    home = set()
    h = (r - cfg._LOW_E_PC) % 12
    while h <= max_fret - 1:
        home.add(h)
        h += 12
    out = []
    for a in rng:
        d = min((abs(a - b) for b in box), default=0)
        kc = BOX_OFFBOX_COST * d + (0.0 if a in home else BOX_NONHOME_COST) + BOX_LOWNECK_COST * a
        out.append({"anchor": a, "key_cost": kc})
    return out


def position_window_cost(p, anchor, window=BOX_WINDOW):
    f = p["fret"]
    if f == 0:
        return 0.0 if anchor <= 2 else OPEN_OUT_OF_BOX_COST
    if anchor <= f <= anchor + window:
        return BOX_CENTER_COST * abs(f - (anchor + window / 2.0))
    return BOX_OUTSIDE_COST * ((anchor - f) if f < anchor else (f - (anchor + window)))


def candidate_window_cost(c, anchor):
    return sum(position_window_cost(p, anchor) for p in c["positions"])


VOICING_SHAPES = [
    {"name": "E-maj",    "offsets": {0: 0, 1: 2, 2: 2, 3: 1, 4: 0, 5: 0}, "power": False},
    {"name": "A-maj",    "offsets": {1: 0, 2: 2, 3: 2, 4: 2, 5: 0},        "power": False},
    {"name": "D-maj",    "offsets": {2: 0, 3: 2, 4: 3, 5: 2},               "power": False},
    {"name": "C-maj",    "offsets": {1: 3, 2: 2, 3: 0, 4: 1, 5: 0},        "power": False},
    {"name": "G-maj",    "offsets": {0: 3, 1: 2, 2: 0, 3: 0, 4: 0, 5: 3},  "power": False},
    {"name": "E-min",    "offsets": {0: 0, 1: 2, 2: 2, 3: 0, 4: 0, 5: 0},  "power": False},
    {"name": "A-min",    "offsets": {1: 0, 2: 2, 3: 2, 4: 1, 5: 0},        "power": False},
    {"name": "E-7",      "offsets": {0: 0, 1: 2, 2: 0, 3: 1, 4: 0, 5: 0},  "power": False},
    {"name": "A-7",      "offsets": {1: 0, 2: 2, 3: 0, 4: 2, 5: 0},        "power": False},
    {"name": "E-m7",     "offsets": {0: 0, 1: 2, 2: 0, 3: 0, 4: 0, 5: 0},  "power": False},
    {"name": "A-m7",     "offsets": {1: 0, 2: 2, 3: 0, 4: 1, 5: 0},        "power": False},
    {"name": "Emaj7",    "offsets": {0: 0, 1: 2, 2: 1, 3: 1, 4: 0, 5: 0},  "power": False},
    {"name": "Amaj7",    "offsets": {1: 0, 2: 2, 3: 1, 4: 2, 5: 0},        "power": False},
    {"name": "5-E",      "offsets": {0: 0, 1: 2},                            "power": True},
    {"name": "5-A",      "offsets": {1: 0, 2: 2},                            "power": True},
    {"name": "5-D",      "offsets": {2: 0, 3: 2},                            "power": True},
    {"name": "5-E-oct",  "offsets": {0: 0, 1: 2, 2: 2},                     "power": True},
    {"name": "5-A-oct",  "offsets": {1: 0, 2: 2, 3: 2},                     "power": True},
    {"name": "5-D-oct",  "offsets": {2: 0, 3: 2, 4: 2},                     "power": True},
    {"name": "oct-E",    "offsets": {0: 0, 2: 2},                            "power": True},
    {"name": "oct-A",    "offsets": {1: 0, 3: 2},                            "power": True},
]


def _off_from_min(d):
    m = min(d.values())
    return {k: v - m for k, v in d.items()}


def voicing_bonus(positions):
    pts = {p["string"]: p["fret"] for p in positions}
    strings = sorted(pts)
    if len(strings) < 2:
        return 0.0
    cand_off = _off_from_min(pts)
    n = len(strings)
    best = 0.0
    for sh in VOICING_SHAPES:
        if (n < 2) if sh["power"] else (n < 3):
            continue
        smap = sh["offsets"]
        if not all(s in smap for s in strings):
            continue
        if _off_from_min({s: smap[s] for s in strings}) == cand_off:
            best = max(best, 0.6 + 0.4 * (n / len(smap)))
    return best
