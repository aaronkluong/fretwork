# backend/fretboard/api.py
# High-level entry points and formatting helpers for the public API.

import warnings
from . import config as cfg
from .theory import enrich_notes_with_context, get_key_info, chord_at_time
from .scoring import resolve_difficulty
from .algorithms import group_notes_by_onset, assign_caged_voiced

_STRING_MAP = {0: "string_6", 1: "string_5", 2: "string_4", 3: "string_3", 4: "string_2", 5: "string_1"}


def _prepare_enriched_notes(note_events, chords, key_label):
    """Shared prep used by assign_notes_to_fretboard() and get_fingering_variants():
    add pitch_class, enrich with key/chord context, drop unplayable notes. Must be
    called inside a fretboard_config() context."""
    enriched = []
    for n in note_events:
        row = dict(n)
        row["pitch_class"] = int(round(n["midi"])) % 12
        enriched.append(row)

    if key_label or chords:
        enriched = enrich_notes_with_context(enriched, chords, key_label)

    return [n for n in enriched if cfg.get_possible_positions(n["midi"])]


def _predictions_to_output(predictions, chords):
    """Shared conversion from a flat list of note-with-position dicts into the
    (segments, notes) schema expected by the frontend."""
    segments = []
    groups = group_notes_by_onset(predictions)
    for group in groups:
        positions = {f"string_{s}": None for s in range(1, 7)}
        for note in group:
            string_key = _STRING_MAP.get(note.get("pred_string"))
            if string_key:
                positions[string_key] = note.get("pred_fret")

        chord_label = group[0].get("chord_label", "")
        if not chord_label:
            chord_label = chord_at_time(chords, group[0]["start"])
            if chord_label:
                chord_label = chord_label.get("chord", "")

        segments.append({
            "time_start": round(group[0]["start"], 3),
            "time_end": round(max(n.get("end", n["start"] + n.get("duration", 0.5)) for n in group), 3),
            "suggested_chord": chord_label or "",
            "positions": positions,
        })

    notes_out = [
        {
            "start": round(n["start"], 3),
            "duration": round(n.get("end", n["start"] + n.get("duration", 0.5)) - n["start"], 3),
            "midi": int(n["midi"]),
            "string": 6 - n["pred_string"],
            "fret": n["pred_fret"],
        }
        for n in predictions
        if n.get("pred_string") is not None and n.get("pred_fret") is not None
    ]
    return segments, notes_out


def assign_notes_to_fretboard(note_events, chords=None, key_label=None,
                               tuning="standard", capo=0, difficulty="expert"):
    """
    Main entry point for the backend API.
    """
    from .transformer import assign_prox_viterbi_transformer

    if chords is None:
        chords = []

    if not note_events:
        raise ValueError(
            "No notes were detected in the recording. Try a longer take with "
            "clearer, louder guitar audio close to the microphone."
        )

    with cfg.fretboard_config(tuning=tuning, capo=capo):
        enriched = _prepare_enriched_notes(note_events, chords, key_label)
        if not enriched:
            raise ValueError(
                "No detected notes are playable in this tuning/capo configuration "
                "(all fall below the capo or off the fretboard)."
            )

        key_info = get_key_info(key_label) if key_label else None
        resolved_difficulty = resolve_difficulty(difficulty)
        try:
            predictions = assign_prox_viterbi_transformer(
                enriched, key=key_info, difficulty=resolved_difficulty
            )
        except Exception as exc:
            warnings.warn(f"assign_prox_viterbi_transformer failed, falling back to assign_caged_voiced: {exc}")
            predictions = assign_caged_voiced(
                enriched, key=key_info, difficulty=resolved_difficulty
            )

        segments, notes_out = _predictions_to_output(predictions, chords)

    return segments, notes_out


def assign_notes_to_fretboard_pinned(note_events, chords=None, key_label=None,
                                       tuning="standard", capo=0, difficulty="expert",
                                       pins=None, delete=None):
    """
    Main entry point for pinned re-decoding requests.
    """
    from .transformer import assign_transformer_pinned

    if chords is None:
        chords = []

    if not note_events:
        raise ValueError("No notes were provided for pinned re-decoding.")

    with cfg.fretboard_config(tuning=tuning, capo=capo):
        enriched = _prepare_enriched_notes(note_events, chords, key_label)
        if not enriched:
            raise ValueError("No notes are playable in this tuning/capo configuration.")

        key_info = get_key_info(key_label) if key_label else None
        resolved_difficulty = resolve_difficulty(difficulty)
        predictions = assign_transformer_pinned(
            enriched, key=key_info, difficulty=resolved_difficulty, pins=pins, delete=delete
        )
        segments, notes_out = _predictions_to_output(predictions, chords)

    return segments, notes_out
