# transcribe.py
# Extracted from jupyter_notebooks/BasicPitch.ipynb
# Wraps Basic Pitch inference to produce note events from an audio file.
# Original logic unchanged — only the Colab/Drive mount and playback cells removed.

import os

# Lazy load basic_pitch in run_transcription so helper/repair functions can be tested without heavy ML dependencies


# Tuned on GuitarSet held-out evaluation (AudioToTabCAGEDVoice_tuned_basic_pitch.ipynb).
# amplitude 0.40 cuts false positives; onset/frame pair gives cleanest results.
AMPLITUDE_THRESHOLD = 0.40
ONSET_THRESHOLD = 0.50
FRAME_THRESHOLD = 0.20
MIN_MIDI = 40   # low E2
MAX_MIDI = 88   # high guitar range (~E6)

# midi_number → Hz
_MIDI_TO_HZ = lambda m: 440.0 * (2 ** ((m - 69) / 12))


# ---------------------------------------------------------------------------
# Helper (verbatim from notebook)
# ---------------------------------------------------------------------------

def midi_to_note_name(midi_number):
    notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    octave = (midi_number // 12) - 1
    note = notes[midi_number % 12]
    return f"{note}{octave}"


# ---------------------------------------------------------------------------
# Key snapping
# ---------------------------------------------------------------------------

# Only snap notes that are exactly 1 semitone off — the dominant Basic Pitch
# error type. Larger offsets are more likely real chromatic notes than errors.
SNAP_MAX_SEMITONES = 1

def snap_notes_to_key(notes, key_info):
    """
    Shift out-of-key notes by ±1 semitone to the nearest in-key pitch.

    Only applied when key_info is provided and the note is exactly 1 semitone
    away from a scale tone. Notes already in-key are untouched.
    """
    if not key_info:
        return notes

    scale_pcs = set(key_info["scale_pcs"])
    snapped = []
    for note in notes:
        midi = note["midi"]
        pc = midi % 12
        if pc in scale_pcs:
            snapped.append(note)
            continue

        # Try ±1 semitone, prefer the direction closer to a scale tone
        best_midi = None
        for delta in (-1, 1):
            candidate_pc = (pc + delta) % 12
            if candidate_pc in scale_pcs:
                best_midi = midi + delta
                break

        if best_midi is not None and MIN_MIDI <= best_midi <= MAX_MIDI:
            note = dict(note)
            note["midi"] = best_midi
            note["note_name"] = midi_to_note_name(best_midi)
        snapped.append(note)
    return snapped


# ---------------------------------------------------------------------------
# Upstream XGBoost (v2) Pre-Decoder ML Note Repair
# ---------------------------------------------------------------------------

def apply_xgb_note_repair(notes, key_pc, xgb_model, scaler, dadagp_priors, total_bigrams, valid_threshold: float = 0.058):
    """
    Apply XGBoost (v2) note repair filter prior to Viterbi fretboard decoding.
    
    Classes:
        0: Valid Note
        1: Phantom Note (dropped)
        2: Octave Slip (shifted ±12 semitones)
    """
    if not notes or xgb_model is None or scaler is None:
        return notes

    try:
        from backend.xgboost_backup.feature_extraction import extract_8_features
    except ImportError:
        from feature_extraction import extract_8_features


    feats = extract_8_features(notes, key_pc if key_pc is not None else 0, dadagp_priors, total_bigrams)
    if len(feats) == 0:
        return notes

    feats_scaled = scaler.transform(feats)

    # Predict probabilities or labels
    if hasattr(xgb_model, "predict_proba"):
        probs = xgb_model.predict_proba(feats_scaled)
        # Class 0: Valid, Class 1: Phantom, Class 2: Octave Slip
        # If prob of valid is below valid_threshold and phantom is highest, drop it
        preds = []
        for p in probs:
            p_valid = p[0] if len(p) > 0 else 0.0
            p_phantom = p[1] if len(p) > 1 else 0.0
            p_octave = p[2] if len(p) > 2 else 0.0
            if p_valid < valid_threshold and p_phantom > p_octave:
                preds.append(1) # Phantom -> drop
            elif p_octave > p_valid and p_octave > p_phantom:
                preds.append(2) # Octave slip
            else:
                preds.append(0) # Valid
    else:
        preds = xgb_model.predict(feats_scaled)

    repaired_notes = []
    for note, pred in zip(notes, preds):
        if pred == 1:
            # Phantom note -> filter out / drop
            continue
        elif pred == 2:
            # Octave slip -> shift ±12 semitones if within guitar pitch boundaries
            midi = note["midi"]
            note_copy = dict(note)
            if MIN_MIDI <= midi - 12 <= MAX_MIDI:
                new_midi = midi - 12
            elif MIN_MIDI <= midi + 12 <= MAX_MIDI:
                new_midi = midi + 12
            else:
                new_midi = midi
            note_copy["midi"] = new_midi
            note_copy["note_name"] = midi_to_note_name(new_midi)
            repaired_notes.append(note_copy)
        else:
            # Valid note -> retain as is
            repaired_notes.append(note)

    return repaired_notes



# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_transcription(audio_filename,
                      amplitude_threshold=AMPLITUDE_THRESHOLD,
                      onset_threshold=ONSET_THRESHOLD,
                      frame_threshold=FRAME_THRESHOLD,
                      min_midi=MIN_MIDI,
                      max_midi=MAX_MIDI):
    """
    Run Basic Pitch on an audio file and return structured note events.
    Matches July21.ipynb cell 12 (run_basic_pitch_notes) verbatim.
    """
    if not os.path.exists(audio_filename):
        raise FileNotFoundError(f"Could not find: {audio_filename}")

    from basic_pitch.inference import predict

    _model_output, _midi_data, note_events = predict(
        str(audio_filename),
        onset_threshold=onset_threshold,
        frame_threshold=frame_threshold,
    )

    notes = []
    for event in note_events:
        start, end, pitch_midi, amplitude = event[0], event[1], event[2], event[3]
        if float(amplitude) < amplitude_threshold:
            continue
        midi = int(round(float(pitch_midi)))
        if midi < min_midi or midi > max_midi:
            continue
        notes.append({
            "start": float(start),
            "end": float(end),
            "duration": float(end - start),
            "midi": midi,
            "pitch_class": midi % 12,
            "note_name": midi_to_note_name(midi),
            "amplitude": float(amplitude),
            "true_string": None,
            "true_fret": None,
            "source": "basic_pitch",
        })

    notes.sort(key=lambda n: (n["start"], n["midi"]))
    return notes


