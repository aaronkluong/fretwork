# backend/audio/__init__.py
"""
Audio processing, key/chord/tempo analysis, and Basic Pitch transcription package.
"""

from .audio_io import ensure_wav
from .transcribe import (
    run_transcription,
    apply_xgb_note_repair,
    AMPLITUDE_THRESHOLD,
    ONSET_THRESHOLD,
    FRAME_THRESHOLD,
    MIN_MIDI,
    MAX_MIDI,
)
from .recode import filter_phantom_notes
from .key_detection import analyze_audio_key
from .chord_detection import detect_chords, detect_chords_from_basic_pitch_notes, make_audio_record_from_gt
from .tempo_detection import analyze_audio_tempo
from .stem_separation import separate_guitar_stem

__all__ = [
    "ensure_wav",
    "run_transcription",
    "separate_guitar_stem",
    "apply_xgb_note_repair",
    "filter_phantom_notes",
    "analyze_audio_key",
    "detect_chords",
    "detect_chords_from_basic_pitch_notes",
    "make_audio_record_from_gt",
    "analyze_audio_tempo",
    "AMPLITUDE_THRESHOLD",
    "ONSET_THRESHOLD",
    "FRAME_THRESHOLD",
    "MIN_MIDI",
    "MAX_MIDI",
]



