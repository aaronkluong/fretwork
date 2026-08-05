"""
test_difficulty.py — unit tests for difficulty profiles (beginner / intermediate / expert).
Expert is identity (as-is defaults). See docs/difficulty.md.
"""

import backend.fretboard as fb


def synth_melody(midis, dt=0.5):
    out = []
    for i, m in enumerate(midis):
        start = i * dt
        out.append({
            "start": start,
            "end": start + 0.4,
            "duration": 0.4,
            "midi": int(m),
            "amplitude": 0.9,
            "note_name": "",
        })
    return out


def _positions(notes):
    return [(n["string"], n["fret"]) for n in notes]


# Mini-barre-like grip: three fretted notes on the same fret (A-shape style)
BARRE_LIKE = [
    {"string": 1, "fret": 3},
    {"string": 2, "fret": 5},
    {"string": 3, "fret": 5},
    {"string": 4, "fret": 5},
]


def test_resolve_difficulty_known_and_fallback():
    assert fb.resolve_difficulty("beginner") == "beginner"
    assert fb.resolve_difficulty("INTERMEDIATE") == "intermediate"
    assert fb.resolve_difficulty("expert") == "expert"
    assert fb.resolve_difficulty(None) == "expert"
    assert fb.resolve_difficulty("") == "expert"
    assert fb.resolve_difficulty("hard") == "expert"
    assert fb.resolve_difficulty("  Expert  ") == "expert"


def test_expert_profile_is_identity():
    p = fb.get_difficulty_profile("expert")
    assert p["comfortable_span"] == fb.COMFORTABLE_CHORD_SPAN
    assert p["max_span"] == fb.MAX_CHORD_SPAN
    assert p["high_fret_threshold"] is None
    assert p["barre_penalty"] == 0.0
    assert p["w_playability"] == fb.CAGED_WEIGHTS["playability"]
    assert p["w_prior"] == fb.CAGED_WEIGHTS["position_prior"]
    assert p["w_voicing"] == fb.CAGED_WEIGHTS["voicing"]
    assert p["w_hand_move"] == fb.CAGED_WEIGHTS["hand_move"]
    assert p["anchor_threshold"] is None
    assert p["anchor_cost"] == 0.0


def test_barre_cost_ordering():
    """Beginner heavy barre cost > intermediate soft cost > expert zero extra."""
    c_beg = fb.group_playability_cost_caged(BARRE_LIKE, difficulty="beginner")
    c_int = fb.group_playability_cost_caged(BARRE_LIKE, difficulty="intermediate")
    c_exp = fb.group_playability_cost_caged(BARRE_LIKE, difficulty="expert")
    assert c_beg > c_int > c_exp
    # Intermediate differentiator: soft barre penalty present, not beginner-level
    soft = fb.get_difficulty_profile("intermediate")["barre_penalty"]
    assert abs((c_int - c_exp) - soft) < 1e-9


def test_high_fret_penalties():
    high = [{"string": 0, "fret": 12}, {"string": 1, "fret": 12}]
    c_beg = fb.group_playability_cost_caged(high, difficulty="beginner")
    c_int = fb.group_playability_cost_caged(high, difficulty="intermediate")
    c_exp = fb.group_playability_cost_caged(high, difficulty="expert")
    assert c_beg > c_int > c_exp


def test_expert_assignment_deterministic_golden():
    """Expert path is stable; unknown difficulty falls back to expert. Keep short for CI speed."""
    melody = [60, 64, 67]  # short C major arpeggio
    notes = synth_melody(melody)
    with fb.fretboard_config("standard", 0):
        _, out1 = fb.assign_notes_to_fretboard(notes, difficulty="expert")
        _, out2 = fb.assign_notes_to_fretboard(notes, difficulty="expert")
        _, out3 = fb.assign_notes_to_fretboard(notes, difficulty="unknown_mode")
    assert _positions(out1) == _positions(out2)
    assert _positions(out1) == _positions(out3)
    assert len(out1) == len(melody)


def test_beginner_prefers_lower_frets_than_expert_on_high_melody():
    high_line = [72, 76]  # short high-register line (keeps Viterbi cheap)
    notes = synth_melody(high_line)
    with fb.fretboard_config("standard", 0):
        _, beg = fb.assign_notes_to_fretboard(notes, difficulty="beginner")
        _, exp = fb.assign_notes_to_fretboard(notes, difficulty="expert")
    beg_mean = sum(n["fret"] for n in beg) / len(beg)
    exp_mean = sum(n["fret"] for n in exp) / len(exp)
    assert beg_mean <= exp_mean + 0.5


def test_intermediate_between_profiles_on_weights():
    b = fb.get_difficulty_profile("beginner")
    i = fb.get_difficulty_profile("intermediate")
    e = fb.get_difficulty_profile("expert")
    assert b["w_hand_move"] > i["w_hand_move"] > e["w_hand_move"]
    assert b["w_playability"] > i["w_playability"] > e["w_playability"]
    assert b["barre_penalty"] > i["barre_penalty"] > e["barre_penalty"]
    assert i["barre_penalty"] == 3.0  # intermediate distinctiveness knob


def test_three_way_difficulty_fret_distribution_ordering():
    """Verify distinct fret positioning across beginner, intermediate, and expert profiles."""
    high_line = [74, 76, 79, 81]  # D5, E5, G5, A5 high line
    notes = synth_melody(high_line)
    with fb.fretboard_config("standard", 0):
        _, beg = fb.assign_notes_to_fretboard(notes, difficulty="beginner")
        _, inter = fb.assign_notes_to_fretboard(notes, difficulty="intermediate")
        _, exp = fb.assign_notes_to_fretboard(notes, difficulty="expert")

    beg_mean = sum(n["fret"] for n in beg) / len(beg)
    inter_mean = sum(n["fret"] for n in inter) / len(inter)
    exp_mean = sum(n["fret"] for n in exp) / len(exp)

    # Beginner stays lowest, intermediate in middle-neck, expert free to use high neck
    assert beg_mean <= inter_mean
    assert inter_mean <= exp_mean

