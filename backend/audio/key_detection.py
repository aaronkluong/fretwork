# key_detection.py
# Extracted from jupyter_notebooks/KeyDetection_structured.ipynb
# Uses librosa chroma_cqt + Krumhansl-Schmuckler profiles to detect the musical key
# of an audio file. Original logic unchanged — only the Colab/Drive mount removed.

import os
import numpy as np
import librosa

# ---------------------------------------------------------------------------
# Krumhansl-Schmuckler key profiles (empirical templates starting from C)
# ---------------------------------------------------------------------------
_MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
                            2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
_MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53,
                            2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

_PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


# ---------------------------------------------------------------------------
# Core detection functions (verbatim from notebook)
# ---------------------------------------------------------------------------

def detect_key(chroma_avg):
    """Rank all 24 major/minor keys by correlation with the audio pitch profile."""
    correlations = {}

    for tonic in range(12):
        major_template = np.roll(_MAJOR_PROFILE, tonic)
        minor_template = np.roll(_MINOR_PROFILE, tonic)

        major_corr = np.corrcoef(chroma_avg, major_template)[0, 1]
        minor_corr = np.corrcoef(chroma_avg, minor_template)[0, 1]

        correlations[f"{_PITCH_CLASSES[tonic]} major"] = major_corr
        correlations[f"{_PITCH_CLASSES[tonic]} minor"] = minor_corr

    return sorted(correlations.items(), key=lambda item: item[1], reverse=True)


def detect_key_with_confidence(chroma_avg, low_confidence_threshold=0.05):
    """Return the top key plus a simple confidence label based on the top-2 gap."""
    ranked = detect_key(chroma_avg)
    top_key, top_score = ranked[0]
    second_key, second_score = ranked[1]
    gap = top_score - second_score

    if gap < low_confidence_threshold:
        confidence = "low"
        note = f"Top guesses {top_key} and {second_key} are nearly tied — treat as uncertain."
    elif gap < 0.10:
        confidence = "medium"
        note = f"Reasonable confidence in {top_key}."
    else:
        confidence = "high"
        note = f"High confidence in {top_key}."

    return {
        "key": top_key,
        "confidence": confidence,
        "gap": gap,
        "note": note,
        "ranked": ranked,
    }


def analyze_audio_key(audio_filename):
    """Load an audio file, compute its chromagram, and return key-detection results."""
    if not os.path.exists(audio_filename):
        raise FileNotFoundError(f"Could not find: {audio_filename}")

    y, sr = librosa.load(audio_filename, sr=None, mono=True)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_avg = np.nan_to_num(np.mean(chroma, axis=1))
    result = detect_key_with_confidence(chroma_avg)

    return {
        "audio_filename": audio_filename,
        "duration_seconds": len(y) / sr,
        "sample_rate": sr,
        "key": result["key"],
        "confidence": result["confidence"],
        "ranked": result["ranked"],
    }
