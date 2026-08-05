# chord_detection.py
# Extracted from jupyter_notebooks/ChordDetection.ipynb
# Uses autochord to recognize chord progressions from audio.
# Original logic unchanged — only the Colab/Drive mount removed.

import os

try:
    import autochord
    _AUTOCHORD_AVAILABLE = True
except ImportError:
    _AUTOCHORD_AVAILABLE = False


# ---------------------------------------------------------------------------
# Normalization helper (verbatim from notebook)
# ---------------------------------------------------------------------------

def normalize_chord_label(label):
    """Convert autochord's flat naming to guitarist-friendly sharp naming."""
    enharmonic_map = {
        'Ab': 'G#',
        'Bb': 'A#',
        'Db': 'C#',
        'Eb': 'D#',
        'Gb': 'F#',
    }
    if label == 'N':
        return label
    for flat, sharp in enharmonic_map.items():
        if label.startswith(flat):
            return label.replace(flat, sharp, 1)
    return label


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_chords(audio_filename, lab_fn='chords.lab'):
    """
    Recognize chord progression from an audio file.

    Returns a list of dicts:
        [{"start": float, "end": float, "duration": float, "chord": str}, ...]

    Returns an empty list if autochord is not installed.
    """
    if not _AUTOCHORD_AVAILABLE:
        return []

    if not os.path.exists(audio_filename):
        raise FileNotFoundError(f"Could not find: {audio_filename}")

    raw_chords = autochord.recognize(audio_filename, lab_fn=lab_fn)

    result = []
    for start, end, label in raw_chords:
        duration = end - start
        norm_label = normalize_chord_label(label)
        result.append({
            "start": float(start),
            "end": float(end),
            "duration": float(duration),
            "chord": norm_label,
        })

    return result


# ---------------------------------------------------------------------------
# Basic Pitch Note-derived Chord Detection (July21.ipynb Approach 4 fallback)
# ---------------------------------------------------------------------------

_PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

_CHORD_TEMPLATES = []
for root in range(12):
    _CHORD_TEMPLATES.extend([
        {'label': _PITCH_CLASSES[root], 'root': root, 'quality': 'maj', 'tones': {(root + x) % 12 for x in [0, 4, 7]}},
        {'label': _PITCH_CLASSES[root] + 'm', 'root': root, 'quality': 'min', 'tones': {(root + x) % 12 for x in [0, 3, 7]}},
        {'label': _PITCH_CLASSES[root] + '7', 'root': root, 'quality': 'dom7', 'tones': {(root + x) % 12 for x in [0, 4, 7, 10]}},
    ])


def best_chord_for_pitch_classes(pitch_classes):
    pcs = set(int(pc) % 12 for pc in pitch_classes)
    if len(pcs) < 2:
        return None
    best_score_tuple = None
    best_template = None
    for templ_idx, templ in enumerate(_CHORD_TEMPLATES):
        tones = templ['tones']
        overlap = len(pcs & tones)
        missing = len(tones - pcs)
        extra = len(pcs - tones)
        root_bonus = 0.35 if templ['root'] in pcs else 0.0
        score = overlap - 0.45 * missing - 0.25 * extra + root_bonus
        score_tuple = (score, overlap, -missing, -extra, -templ_idx)
        if best_score_tuple is None or score_tuple > best_score_tuple:
            best_score_tuple = score_tuple
            best_template = templ
    if best_template is None or best_score_tuple[1] < 2:
        return None
    return best_template


def detect_chords_from_basic_pitch_notes(notes, window_seconds=1.0, hop_seconds=0.5):
    """
    Detect chord progression from Basic Pitch note pitch classes in sliding windows.
    Verbatim implementation matching July21.ipynb (Approach 4 canonical pipeline).
    """
    if not notes:
        return []
    max_time = max(float(n['start']) + float(n.get('duration', 0.0) or 0.0) for n in notes)
    chords = []
    t = 0.0
    current = None
    prev_label = None
    while t <= max_time:
        t_end = t + window_seconds
        pcs = []
        for n in notes:
            n_start = float(n['start'])
            n_end = n_start + float(n.get('duration', 0.0) or 0.0)
            if n_start < t_end and n_end >= t:
                pc = n.get('pitch_class')
                if pc is None:
                    pc = int(round(n['midi'])) % 12
                pcs.append(int(pc))
        templ = best_chord_for_pitch_classes(pcs) if len(pcs) >= 2 else None
        label = None if templ is None else templ['label']
        if label is not None:
            parsed = {'root': templ['root'], 'quality': templ['quality'], 'tones': sorted(templ['tones'])}
            if current is not None and label == prev_label:
                current['end'] = t_end
                current['duration'] = current['end'] - current['start']
            else:
                if current is not None:
                    chords.append(current)
                current = {
                    'start': float(t),
                    'end': float(t_end),
                    'duration': float(window_seconds),
                    'chord': label,
                    'parsed': parsed,
                    'source': 'basic_pitch_window_chords',
                }
                prev_label = label
        else:
            if current is not None:
                chords.append(current)
                current = None
            prev_label = label
        t += hop_seconds
    if current is not None:
        chords.append(current)
    return chords


def make_audio_record_from_gt(record, audio_path,
                              use_gt_key=False,
                              use_audio_key=True,
                              use_gt_chords=False,
                              use_audio_chords=True):
    """
    Build a model-input record from audio-derived notes/context.
    Matches July21.ipynb cell 12 verbatim.
    """
    from pathlib import Path
    from .transcribe import run_transcription
    from .key_detection import analyze_audio_key
    from ..fretboard.theory import infer_key_from_filename

    recording_name = record.get("recording", Path(audio_path).stem) if isinstance(record, dict) else Path(audio_path).stem
    bp_notes = run_transcription(audio_path)

    if use_gt_key and isinstance(record, dict):
        key = record.get("key") or infer_key_from_filename(recording_name)
        key_source = "ground_truth_jams_or_filename"
    elif use_audio_key:
        try:
            key_pred = analyze_audio_key(audio_path)
            key = key_pred["key"]
            key_source = "audio_chroma"
        except Exception:
            key = infer_key_from_filename(recording_name)
            key_source = "filename_fallback"
    else:
        key = infer_key_from_filename(recording_name)
        key_source = "filename_fallback"

    if use_gt_chords and isinstance(record, dict):
        chords = record.get("chords", [])
        chord_source = "ground_truth_jams"
    elif use_audio_chords:
        chords = detect_chords_from_basic_pitch_notes(bp_notes)
        chord_source = "basic_pitch_window_chords" if chords else "none_detected"
    else:
        chords = []
        chord_source = "none"

    return {
        "recording": recording_name,
        "path": str(audio_path),
        "notes": bp_notes,
        "chords": chords,
        "beats": [],
        "tempo": record.get("tempo") if isinstance(record, dict) else None,
        "key": key,
        "key_source": key_source,
        "chord_source": chord_source,
    }


