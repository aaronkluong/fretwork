"""
test_tuning_capo.py — unit/smoke tests for the alternate-tuning + capo feature.
Can be run via pytest:
    pytest backend/test_tuning_capo.py
Or standalone:
    python backend/test_tuning_capo.py
"""

import pytest
import backend.fretboard as fb

def synth_melody(midis, dt=0.5):
    """Minimal note_events shaped like transcribe.run_transcription() output."""
    out = []
    for i, m in enumerate(midis):
        start = i * dt
        out.append({"start": start, "end": start + 0.4, "duration": 0.4,
                    "midi": int(m), "amplitude": 0.9, "note_name": ""})
    return out

MELODY = [64, 66, 67, 69, 71, 72, 71, 69]   # mid-neck stepwise line, reachable in every config

def test_roundtrip_pitch_invariant():
    """roundtrip: candidate generation reproduces pitch under each config"""
    for tuning, capo in [("standard", 0), ("drop_d", 0), ("drop_c", 0),
                         ("standard", 3), ("dadgad", 2), ("eb_standard", 0)]:
        ok = True
        with fb.fretboard_config(tuning, capo):
            base = fb.TUNINGS[tuning]
            for m in range(30, 90):
                for p in fb.get_possible_positions(m):
                    produced = (base[p["string"]] + capo) + p["fret"]
                    if produced != m or not (0 <= p["fret"] <= fb.MAX_FRET - capo):
                        ok = False
        assert ok, f"failed roundtrip for {tuning} capo {capo}"

def test_capo_transpose_equivalence():
    """capo transpose-equivalence (pure fretboard property)"""
    def positions_set(midi):
        return {(p["string"], p["fret"]) for p in fb.get_possible_positions(midi)}

    for capo in (1, 2, 5, 7):
        ok = True
        with fb.fretboard_config("standard", 0):
            base = {m: {(p["string"], p["fret"]) for p in fb.get_possible_positions(m)
                        if p["fret"] <= fb.MAX_FRET - capo}
                    for m in range(45, 80)}
        with fb.fretboard_config("standard", capo):
            for m, want in base.items():
                if positions_set(m + capo) != want:
                    ok = False
                    break
        assert ok, f"capo {capo} does not absorb a +{capo} transposition"

def test_drop_d_functional():
    """Drop-D functional"""
    with fb.fretboard_config("standard", 0):
        std_38 = fb.get_possible_positions(38)
    with fb.fretboard_config("drop_d", 0):
        dd_38 = fb.get_possible_positions(38)
    assert std_38 == [], "D2 should be unreachable in standard"
    assert any(p["string"] == 0 and p["fret"] == 0 for p in dd_38), "D2 should be open low string in Drop D"

def test_capo_masking():
    """capo masking"""
    CAPO = 5
    with fb.fretboard_config("standard", CAPO):
        lowest = fb.STANDARD_TUNING[0] + CAPO
        below = fb.get_possible_positions(lowest - 1)
        at = fb.get_possible_positions(lowest)
    assert below == [], f"pitch below capo {CAPO} should be unreachable"
    assert any(p["fret"] == 0 for p in at), "lowest capoed pitch should be an open fret 0 string"

def test_voicing_gate():
    """voicing-bonus gate (_VOICING_VALID)"""
    for tuning, capo, want in [("standard", 0, True), ("eb_standard", 0, True),
                               ("standard", 4, True), ("drop_d", 0, False),
                               ("drop_c", 0, False), ("dadgad", 0, False), ("open_g", 0, False)]:
        with fb.fretboard_config(tuning, capo):
            got = fb._VOICING_VALID
        assert got == want, f"voicing mismatch for ({tuning}, capo {capo}): expected {want}, got {got}"

def test_end_to_end():
    """assign_notes_to_fretboard end-to-end"""
    for tuning, capo in [("standard", 0), ("drop_d", 0), ("standard", 2)]:
        notes = synth_melody(MELODY)
        segments, notes_out = fb.assign_notes_to_fretboard(notes, tuning=tuning, capo=capo)
        in_range = all(0 <= n["fret"] <= fb.MAX_FRET - capo for n in notes_out)
        base = fb.TUNINGS[tuning]
        pitch_ok = all((base[6 - n["string"]] + capo) + n["fret"] == n["midi"] for n in notes_out)
        assert len(notes_out) == len(MELODY) and in_range and pitch_ok, \
            f"end-to-end failure for {tuning} capo {capo}: n={len(notes_out)} in_range={in_range} pitch_ok={pitch_ok}"

def test_backward_compatibility():
    """backward compatibility"""
    notes = synth_melody(MELODY)
    seg_default, notes_default = fb.assign_notes_to_fretboard(notes)
    seg_std, notes_std = fb.assign_notes_to_fretboard(notes, tuning="standard", capo=0)
    assert notes_default == notes_std, "default call should match explicit standard call"

if __name__ == "__main__":
    import sys
    sys.exit(pytest.main([__file__]))
