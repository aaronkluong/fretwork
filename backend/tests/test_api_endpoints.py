# backend/tests/test_api_endpoints.py
# Unit tests for FastAPI modular routers and error responses.

import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import sys

_backend_dir = Path(__file__).parent.parent.resolve()
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from app import app

client = TestClient(app)


def test_health_endpoint():
    """Verify /health returns 200 OK and status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_transcribe_missing_file():
    """Verify /transcribe returns 422 Unprocessable Entity when audio file is missing."""
    response = client.post("/transcribe")
    assert response.status_code == 422


def test_process_jams_missing_file():
    """Verify /process-jams returns 422 Unprocessable Entity when jams file is missing."""
    response = client.post("/process-jams")
    assert response.status_code == 422


def test_detect_chords_from_basic_pitch_notes():
    """Verify sliding-window chord detection fallback from July21.ipynb."""
    try:
        from backend.audio.chord_detection import detect_chords_from_basic_pitch_notes
    except ImportError:
        from audio.chord_detection import detect_chords_from_basic_pitch_notes

    # C major triad notes over a 1 second window: C4 (60), E4 (64), G4 (67)
    notes = [
        {"start": 0.0, "duration": 1.0, "midi": 60, "pitch_class": 0},
        {"start": 0.0, "duration": 1.0, "midi": 64, "pitch_class": 4},
        {"start": 0.0, "duration": 1.0, "midi": 67, "pitch_class": 7},
    ]
    chords = detect_chords_from_basic_pitch_notes(notes, window_seconds=1.0, hop_seconds=0.5)
    assert len(chords) >= 1
    assert chords[0]["chord"] == "C"

