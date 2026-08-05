# jams_processor.py
# Extracted from jupyter_notebooks/JamsNormalization.ipynb and AlgoToASCII.ipynb
# Parses raw GuitarSet JAMS files into the normalized internal representation.
# Original logic is unchanged — only the Colab/Drive mount and export cells removed.

import json
from pathlib import Path

# Constants (verbatim from notebooks)
OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]   # Low E (0) to High E (5)
STRING_MAP = {
    0: "string_6", 1: "string_5", 2: "string_4",
    3: "string_3", 4: "string_2", 5: "string_1",
}
TIME_TOLERANCE = 0.05   # 50 ms for grouping simultaneous notes into chords


# ---------------------------------------------------------------------------
# Normalization helper (verbatim from JamsNormalization.ipynb)
# ---------------------------------------------------------------------------

def normalize_jams_data(data):
    """Handle both list-of-dicts and parallel-list formats in JAMS annotation data."""
    if isinstance(data, list):
        return data
    times = data.get("time", [])
    durs = data.get("duration", [])
    vals = data.get("value", [])
    return [{"time": times[i], "duration": durs[i], "value": vals[i]} for i in range(len(times))]


# ---------------------------------------------------------------------------
# Lightweight metadata parser (verbatim from AlgoToASCII.ipynb)
# Used to extract beats and tempo for ASCII rendering alignment.
# ---------------------------------------------------------------------------

def _annotation_rows(annotation):
    data = annotation.get("data", [])
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        keys = ["time", "duration", "value", "confidence"]
        n = len(data.get("time", []))
        return [{k: data.get(k, [None] * n)[i] for k in keys} for i in range(n)]
    return []


def parse_jams_for_metadata(jams_path):
    """Lightweight parser — extracts beats and tempo (for ASCII tab alignment).
    Verbatim from AlgoToASCII.ipynb."""
    jams_path = Path(jams_path)
    if not jams_path.exists():
        return {"beats": [], "tempo": None, "key": None}

    with open(jams_path) as f:
        jam = json.load(f)

    beats = []
    tempo = None
    key = None

    for ann in jam.get("annotations", []):
        ns = ann.get("namespace", "")
        rows = _annotation_rows(ann)
        if ns in ("beat", "beat_position"):
            for r in rows:
                beats.append(float(r.get("time", 0.0)))
        elif ns == "tempo" and rows:
            tempo = float(rows[0].get("value", 0.0)) or None
        elif ns == "key_mode" and rows:
            key = rows[0].get("value")

    if tempo is None:
        try:
            tempo = float(jams_path.stem.split("_")[1].split("-")[1])
        except (IndexError, ValueError):
            pass

    beats.sort()
    return {"beats": beats, "tempo": tempo, "key": key}


# ---------------------------------------------------------------------------
# Full JAMS → tab segment pipeline (verbatim from JamsNormalization.ipynb)
# ---------------------------------------------------------------------------

def get_chord_at_time(chords, t):
    for ch in chords:
        if ch["time"] <= t < (ch["time"] + ch["duration"]):
            return ch["value"]
    return ""


def process_jams_file(jams_path):
    """
    Full pipeline: load a JAMS file and return the normalized output dict.

    Returns:
        {
            "key_signature": str,
            "tempo": float | None,
            "beats": list[float],
            "tab_segments": list[dict],   # matches Output JSON schema
            "notes": list[dict],          # flat enriched note list for fretboard algorithm
            "chords": list[dict],
        }
    """
    jams_path = Path(jams_path)
    with open(jams_path, "r") as f:
        raw_jams = json.load(f)

    # Extract key mode
    key_anno = [a for a in raw_jams["annotations"] if a["namespace"] == "key_mode"]
    key_signature = key_anno[0]["data"][0]["value"] if key_anno else "Unknown"

    # Extract chords
    chord_anno = [a for a in raw_jams["annotations"] if a["namespace"] == "chord"]
    chords = normalize_jams_data(chord_anno[0]["data"]) if chord_anno else []

    # Extract beats
    beat_anno = [a for a in raw_jams["annotations"] if a["namespace"] == "beat_position"]
    beats_raw = normalize_jams_data(beat_anno[0]["data"]) if beat_anno else []
    beats = sorted(float(b["time"]) for b in beats_raw)

    # Extract tempo
    tempo_anno = [a for a in raw_jams["annotations"] if a["namespace"] == "tempo"]
    tempo = None
    if tempo_anno:
        rows = normalize_jams_data(tempo_anno[0]["data"])
        if rows:
            tempo = float(rows[0]["value"]) or None
    if tempo is None:
        try:
            tempo = float(jams_path.stem.split("_")[1].split("-")[1])
        except (IndexError, ValueError):
            pass

    # Extract note tracks (one per string — GuitarSet has 6 note_midi tracks)
    note_annos = [a for a in raw_jams["annotations"] if a["namespace"] == "note_midi"]
    all_notes = []
    for i, anno in enumerate(note_annos[:6]):
        data = normalize_jams_data(anno["data"])
        for obs in data:
            all_notes.append({
                "start": float(obs["time"]),
                "duration": float(obs["duration"]),
                "end": float(obs["time"]) + float(obs["duration"]),
                "midi": float(obs["value"]),
                "pitch_class": int(round(float(obs["value"]))) % 12,
                "true_string": i,
                "true_fret": int(round(float(obs["value"]) - OPEN_STRING_MIDI[i])),
            })
    all_notes.sort(key=lambda x: x["start"])

    # Group simultaneous notes into tab segments (verbatim from JamsNormalization.ipynb)
    tab_segments = []
    if all_notes:
        current_group = [all_notes[0]]
        for note in all_notes[1:]:
            if note["start"] - current_group[0]["start"] < TIME_TOLERANCE:
                current_group.append(note)
            else:
                start_time = current_group[0]["start"]
                positions = {f"string_{s}": None for s in range(1, 7)}
                for n in current_group:
                    fret = int(round(n["midi"] - OPEN_STRING_MIDI[n["true_string"]]))
                    positions[STRING_MAP[n["true_string"]]] = fret
                tab_segments.append({
                    "time_start": round(start_time, 3),
                    "time_end": round(start_time + max(n["duration"] for n in current_group), 3),
                    "suggested_chord": get_chord_at_time(chords, start_time),
                    "positions": positions,
                })
                current_group = [note]
        if current_group:
            start_time = current_group[0]["start"]
            positions = {f"string_{s}": None for s in range(1, 7)}
            for n in current_group:
                fret = int(round(n["midi"] - OPEN_STRING_MIDI[n["true_string"]]))
                positions[STRING_MAP[n["true_string"]]] = fret
            tab_segments.append({
                "time_start": round(start_time, 3),
                "time_end": round(start_time + max(n["duration"] for n in current_group), 3),
                "suggested_chord": get_chord_at_time(chords, start_time),
                "positions": positions,
            })

    # Normalize chords into a format compatible with fretboard.py context enrichment
    normalized_chords = [
        {
            "start": float(ch["time"]),
            "end": float(ch["time"]) + float(ch["duration"]),
            "duration": float(ch["duration"]),
            "chord": ch["value"],
        }
        for ch in chords
    ]

    return {
        "key_signature": key_signature,
        "tempo": tempo,
        "beats": beats,
        "tab_segments": tab_segments,
        "notes": all_notes,
        "chords": normalized_chords,
    }
