# backend/fretboard/theory.py
# Scale, key, chord knowledge databases and context enrichment functions.

import re

PITCH_CLASS_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
NOTE_TO_PC = {name: i for i, name in enumerate(PITCH_CLASS_NAMES_SHARP)}
NOTE_TO_PC.update({"Db": 1, "Eb": 3, "Gb": 6, "Ab": 8, "Bb": 10})
PC_TO_NOTE = {i: name for i, name in enumerate(PITCH_CLASS_NAMES_SHARP)}

MAJOR_STEPS = [2, 2, 1, 2, 2, 2, 1]
MINOR_STEPS = [2, 1, 2, 2, 1, 2, 2]
MAJOR_QUALITIES = ["maj", "min", "min", "maj", "maj", "min", "dim"]
MINOR_QUALITIES = ["min", "dim", "maj", "min", "min", "maj", "maj"]


def derive_scale(root_pc, mode="major"):
    steps = MAJOR_STEPS if mode == "major" else MINOR_STEPS
    pcs = [root_pc]
    cur = root_pc
    for step in steps[:-1]:
        cur = (cur + step) % 12
        pcs.append(cur)
    return pcs


def _build_key_database():
    rows = []
    for root_name, root_pc in NOTE_TO_PC.items():
        if "b" in root_name:
            continue
        for mode in ["major", "minor"]:
            scale_pcs = derive_scale(root_pc, mode)
            qualities = MAJOR_QUALITIES if mode == "major" else MINOR_QUALITIES
            chords = []
            for degree, (pc, qual) in enumerate(zip(scale_pcs, qualities), start=1):
                chords.append({
                    "degree": degree,
                    "root_pc": pc,
                    "root": PC_TO_NOTE[pc],
                    "quality": qual,
                    "symbol": f"{PC_TO_NOTE[pc]}:{qual}",
                })
            rows.append({
                "key": f"{root_name} {mode}",
                "root": root_name,
                "root_pc": root_pc,
                "mode": mode,
                "scale_pcs": scale_pcs,
                "scale_notes": [PC_TO_NOTE[pc] for pc in scale_pcs],
                "diatonic_chords": chords,
            })
    return rows


_KEY_DB = _build_key_database()
_KEY_DB_BY_NAME = {row["key"]: row for row in _KEY_DB}

CHORD_INTERVALS = {
    "maj": [0, 4, 7],
    "min": [0, 3, 7],
    "dim": [0, 3, 6],
    "aug": [0, 4, 8],
    "7":   [0, 4, 7, 10],
    "maj7": [0, 4, 7, 11],
    "min7": [0, 3, 7, 10],
    "m7":  [0, 3, 7, 10],
    "sus4": [0, 5, 7],
    "sus2": [0, 2, 7],
    "5":   [0, 7],
}
QUALITY_ALIASES = {
    "M": "maj", "major": "maj", "": "maj",
    "m": "min", "minor": "min", "dom7": "7",
}


def normalize_quality(q):
    if q is None:
        return "maj"
    q = str(q).strip()
    return QUALITY_ALIASES.get(q, q)


def chord_tones(root_pc, quality="maj"):
    quality = normalize_quality(quality)
    intervals = CHORD_INTERVALS.get(quality, CHORD_INTERVALS["maj"])
    return sorted({(root_pc + i) % 12 for i in intervals})


def parse_chord_symbol(symbol):
    if symbol is None:
        return None
    s = str(symbol).strip()
    s = s.split("/")[0]
    if s in ["N", "X", "nan", "None", ""]:
        return None
    if ":" in s:
        root, qual = s.split(":", 1)
    else:
        m = re.match(r"^([A-G](?:#|b)?)(.*)$", s)
        if not m:
            return None
        root, qual = m.group(1), m.group(2)
    if root not in NOTE_TO_PC:
        return None
    qual = normalize_quality(qual)
    return {
        "root": root,
        "root_pc": NOTE_TO_PC[root],
        "quality": qual,
        "tones": chord_tones(NOTE_TO_PC[root], qual),
    }


def infer_key_from_filename(recording_name):
    parts = recording_name.split("_")
    if len(parts) >= 2:
        middle = parts[1]
        key_guess = middle.split("-")[-1]
        if key_guess in NOTE_TO_PC:
            return f"{key_guess} major"
    return None


def get_key_info(key_label):
    if key_label is None:
        return None
    s = str(key_label).replace(":", " ").strip()
    toks = s.split()
    if len(toks) == 1 and toks[0] in NOTE_TO_PC:
        s = f"{toks[0]} major"
    return _KEY_DB_BY_NAME.get(s)


def chord_end_time(c):
    start = float(c.get("start", 0.0))
    if c.get("end") is not None:
        return float(c["end"])
    return start + float(c.get("duration", 0.0) or 0.0)


def chord_at_time(chords, t):
    for c in chords:
        start = float(c.get("start", 0.0))
        end = chord_end_time(c)
        if start <= t < end:
            return c
    return None


def enrich_notes_with_context(notes, chords, key_label):
    """
    Add in_key and in_chord boolean flags to each note dict.
    Notes must have 'start', 'midi', and 'pitch_class' keys.
    """
    key_info = get_key_info(key_label)
    out = []
    for n in notes:
        c = chord_at_time(chords, n["start"])
        row = dict(n)
        row["key_label"] = key_label
        row["in_key"] = (
            None if key_info is None
            else (n["pitch_class"] in set(key_info["scale_pcs"]))
        )
        row["chord_label"] = None if c is None else c.get("chord")
        parsed_chord = (
            None if c is None
            else (c.get("parsed") or parse_chord_symbol(c.get("chord")))
        )
        row["in_chord"] = (
            None if parsed_chord is None
            else (n["pitch_class"] in set(parsed_chord["tones"]))
        )
        out.append(row)
    return out
