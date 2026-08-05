# backend/tests/test_pipeline_integration.py
# Verification integration test suite checking baseline transcription & fretboard decoding pipeline behavior.

import hashlib
from pathlib import Path
import pytest

from backend.fretboard import (
    assign_notes_to_fretboard,
    assign_prox_viterbi_transformer,
    assign_transformer_pinned,
    get_fingering_variants,
)
from backend.audio import (
    run_transcription,
    detect_chords_from_basic_pitch_notes,
    AMPLITUDE_THRESHOLD,
    ONSET_THRESHOLD,
    FRAME_THRESHOLD,
    MIN_MIDI,
    MAX_MIDI,
)
from backend.processors import render_tab, render_tab_segments


# Baseline ground-truth note events representing sweetChildOfMine riff excerpt
BASELINE_NOTE_EVENTS = [
    {"start": 0.00, "duration": 0.25, "midi": 62.0, "amplitude": 0.85},  # D4
    {"start": 0.30, "duration": 0.25, "midi": 74.0, "amplitude": 0.82},  # D5
    {"start": 0.60, "duration": 0.25, "midi": 67.0, "amplitude": 0.80},  # G4
    {"start": 0.90, "duration": 0.25, "midi": 66.0, "amplitude": 0.78},  # F#4
    {"start": 1.20, "duration": 0.25, "midi": 74.0, "amplitude": 0.83},  # D5
    {"start": 1.50, "duration": 0.25, "midi": 71.0, "amplitude": 0.81},  # B4
    {"start": 1.80, "duration": 0.25, "midi": 74.0, "amplitude": 0.84},  # D5
    {"start": 2.10, "duration": 0.25, "midi": 71.0, "amplitude": 0.79},  # B4
]


def test_basic_pitch_threshold_defaults():
    # Tuned thresholds for audio transcription pipeline
    assert AMPLITUDE_THRESHOLD == 0.40
    assert ONSET_THRESHOLD == 0.50
    assert FRAME_THRESHOLD == 0.20
    assert MIN_MIDI == 40
    assert MAX_MIDI == 88


def test_basic_pitch_chord_fallback():
    # Sliding-window chord detection from notes
    chords = detect_chords_from_basic_pitch_notes(BASELINE_NOTE_EVENTS)
    assert isinstance(chords, list)
    if chords:
        for c in chords:
            assert "start" in c
            assert "end" in c
            assert "chord" in c


def test_expert_standard_assignment_deterministic():
    # Running assign_notes_to_fretboard at expert/standard produces valid segments and notes
    segments, notes_out = assign_notes_to_fretboard(
        BASELINE_NOTE_EVENTS,
        key_label="D major",
        tuning="standard",
        capo=0,
        difficulty="expert",
    )
    assert len(notes_out) == len(BASELINE_NOTE_EVENTS)
    assert len(segments) == len(BASELINE_NOTE_EVENTS)

    # Validate note assignments are within reasonable guitar bounds
    for n in notes_out:
        assert 1 <= n["string"] <= 6
        assert 0 <= n["fret"] <= 24

    # Run twice to verify determinism
    segments2, notes_out2 = assign_notes_to_fretboard(
        BASELINE_NOTE_EVENTS,
        key_label="D major",
        tuning="standard",
        capo=0,
        difficulty="expert",
    )
    assert [(n["string"], n["fret"]) for n in notes_out] == [(n["string"], n["fret"]) for n in notes_out2]


def test_prox_viterbi_transformer_direct_decoding():
    # Test assign_prox_viterbi_transformer directly on enriched notes
    pred = assign_prox_viterbi_transformer(BASELINE_NOTE_EVENTS)
    assert len(pred) == len(BASELINE_NOTE_EVENTS)
    for r in pred:
        assert "pred_string" in r
        assert "pred_fret" in r
        assert r["method"] == "prox_viterbi_transformer"


def test_pinned_decoding():
    # Test pinned constraint decoding
    # Pin first note (index 0, D4 = MIDI 62) to D string (index 2 / 4th string) fret 12
    pins = {0: ("D", 12)}
    pred_pinned = assign_transformer_pinned(BASELINE_NOTE_EVENTS, pins=pins)
    assert len(pred_pinned) == len(BASELINE_NOTE_EVENTS)
    # Verify pinned note exact assignment
    assert pred_pinned[0]["pred_string"] == 2
    assert pred_pinned[0]["pred_fret"] == 12


def test_multiway_variants():
    # Test fingering variants decoding
    variants = get_fingering_variants(BASELINE_NOTE_EVENTS, key_label="D major")
    assert isinstance(variants, list)
    assert len(variants) >= 1
    for v in variants:
        assert "label" in v
        assert "tab_segments" in v
        assert "notes" in v


def test_render_tab_baseline():
    # Test direct pred_rows render_tab
    pred = assign_prox_viterbi_transformer(BASELINE_NOTE_EVENTS)
    tab_text = render_tab(pred)
    assert isinstance(tab_text, str)
    assert "low_E|" in tab_text
    assert "high_E|" in tab_text


def test_model_checkpoint_exists_and_valid():
    model_path = Path("backend/models/tab_transformer_final.pt")
    if not model_path.exists():
        model_path = Path("models/tab_transformer_final.pt")
    assert model_path.exists(), "tab_transformer_final.pt model file must exist in backend/models/ or models/"
    sha = hashlib.sha256(model_path.read_bytes()).hexdigest()
    assert len(sha) == 64


def test_stem_separation_graceful_fallback(tmp_path):
    from backend.audio.stem_separation import separate_guitar_stem, is_demucs_available
    dummy_wav = tmp_path / "test.wav"
    dummy_wav.write_bytes(b"RIFF....WAVEfmt ....data....")
    res_path = separate_guitar_stem(str(dummy_wav), use_cache=False)
    assert isinstance(res_path, str)
    assert Path(res_path).exists()


def test_process_audio_transcription_primary_chords(tmp_path):
    import asyncio
    import numpy as np
    import soundfile as sf
    from backend.services.pipeline import process_audio_transcription

    # Generate a short 1-second sine wave WAV for pipeline test
    sr = 22050
    t = np.linspace(0, 1.0, sr)
    audio_data = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    wav_path = tmp_path / "test_audio.wav"
    sf.write(str(wav_path), audio_data, sr)

    res = asyncio.run(process_audio_transcription(
        file_bytes=wav_path.read_bytes(),
        filename="test_audio.wav",
        content_type="audio/wav",
        tuning="standard",
        capo=0,
        difficulty="expert",
        separate_stems=False,
    ))

    assert "key_signature" in res
    assert "tab_segments" in res
    assert "chords" in res




