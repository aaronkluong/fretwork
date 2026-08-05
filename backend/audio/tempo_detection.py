# tempo_detection.py
# Estimates tempo (BPM) from an audio file using librosa's onset-strength
# beat tracker.

import os
import librosa


def analyze_audio_tempo(audio_filename):
    """Load an audio file and return its estimated tempo in BPM."""
    if not os.path.exists(audio_filename):
        raise FileNotFoundError(f"Could not find: {audio_filename}")

    y, sr = librosa.load(audio_filename, sr=None)
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo, _ = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)

    # librosa returns a 1-element array in some versions, a scalar in others.
    bpm = float(tempo[0]) if hasattr(tempo, "__len__") else float(tempo)
    return round(bpm, 1)
