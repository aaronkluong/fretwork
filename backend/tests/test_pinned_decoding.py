# backend/tests/test_pinned_decoding.py
# Unit tests for pinned tab decoding and POST /transcribe/pinned endpoint.

import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.fretboard import assign_notes_to_fretboard_pinned, assign_transformer_pinned

client = TestClient(app)

SAMPLE_NOTES = [
    {"start": 0.0, "duration": 0.5, "midi": 64.0, "pitch_class": 4},  # High E open (string 5, fret 0) or B (string 4, fret 5)
    {"start": 0.5, "duration": 0.5, "midi": 67.0, "pitch_class": 7},  # High G (string 5, fret 3)
    {"start": 1.0, "duration": 0.5, "midi": 71.0, "pitch_class": 11}, # High B (string 5, fret 7)
]


def test_pinned_decoding_physics_validation():
    # Pinning note index 0 (MIDI 64) to string 0 (low E) fret 0 (MIDI 40) is invalid
    with pytest.raises(ValueError, match="Invalid pin for note index 0"):
        assign_transformer_pinned(
            SAMPLE_NOTES,
            pins={0: (0, 0)},  # string 0 fret 0 = MIDI 40 != 64
        )


def test_pinned_decoding_constraint_enforcement():
    # Pin note index 0 (MIDI 64) to string 4 (B string), fret 5
    result = assign_transformer_pinned(
        SAMPLE_NOTES,
        pins={0: (4, 5)},
    )
    assert len(result) == 3
    # Note 0 must be assigned to string 4, fret 5
    note_0 = [r for r in result if abs(r["start"] - 0.0) < 1e-3][0]
    assert note_0["pred_string"] == 4
    assert note_0["pred_fret"] == 5


def test_pinned_decoding_deletion():
    # Delete note index 1 (the middle note)
    result = assign_transformer_pinned(
        SAMPLE_NOTES,
        delete=[1],
    )
    assert len(result) == 2
    starts = [r["start"] for r in result]
    assert 0.5 not in starts


def test_pinned_endpoint_success():
    response = client.post(
        "/transcribe/pinned",
        json={
            "notes": SAMPLE_NOTES,
            "pins": {"0": [4, 5]},
            "delete": [],
            "tuning": "standard",
            "capo": 0,
            "difficulty": "expert",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "tab_segments" in data
    assert "notes" in data
    assert len(data["notes"]) == 3
    # First note should have string 2 (1-based high E is 1, B is 2) and fret 5
    first_note = data["notes"][0]
    assert first_note["string"] == 2
    assert first_note["fret"] == 5


def test_pinned_delete_all_raises():
    with pytest.raises(ValueError, match="removes all notes"):
        assign_transformer_pinned(SAMPLE_NOTES, delete=[0, 1, 2])

    response = client.post(
        "/transcribe/pinned",
        json={
            "notes": SAMPLE_NOTES,
            "delete": [0, 1, 2],
        },
    )
    assert response.status_code == 422

