# ascii_renderer.py
# Extracted from jupyter_notebooks/AlgoToASCII.ipynb and JamsNormalization.ipynb
# Renders a list of tab segments into ASCII guitar tab.
# Original logic is unchanged across both notebooks — unified here.

# ---------------------------------------------------------------------------
# AlgoToASCII-style renderer (beat-aligned, from predictions dict)
# Used when rendering fretboard algorithm output with beat grid metadata.
# ---------------------------------------------------------------------------

DISPLAY_TO_STRING = [5, 4, 3, 2, 1, 0]   # high e on top, low E on bottom
STRING_LABELS = ["e", "B", "G", "D", "A", "E"]


def _build_time_grid(beats, tempo, end_time, subdivisions_per_beat):
    """Verbatim from AlgoToASCII.ipynb."""
    if beats and len(beats) >= 2:
        grid = []
        for i in range(len(beats) - 1):
            step = (beats[i + 1] - beats[i]) / subdivisions_per_beat
            for j in range(subdivisions_per_beat):
                grid.append(beats[i] + j * step)
        last_step = (beats[-1] - beats[-2]) / subdivisions_per_beat
        while grid[-1] < end_time:
            grid.append(grid[-1] + last_step)
        return grid
    if tempo and tempo > 0:
        step = 60.0 / tempo / subdivisions_per_beat
        n = int(end_time / step) + subdivisions_per_beat
        return [i * step for i in range(n)]
    return [i * 0.25 for i in range(int(end_time / 0.25) + 2)]


def render_beat_aligned_tab(parsed, subdivisions_per_beat=2, beats_per_measure=4,
                             measures_per_line=4, col_width=3, max_notes=None):
    """
    Render beat-aligned ASCII tab from a predictions dict.
    Verbatim from AlgoToASCII.ipynb.

    Args:
        parsed: dict with keys:
            "notes"  — list of {start, duration, midi, string (0-5), fret}
            "beats"  — list of beat timestamps (optional)
            "tempo"  — BPM float (optional)
    """
    notes = parsed["notes"]
    if max_notes is not None:
        notes = notes[:max_notes]
    if not notes:
        return "(no notes)"

    end_time = max(n["start"] + n.get("duration", 0.5) for n in notes) + 0.5
    grid = _build_time_grid(
        parsed.get("beats", []), parsed.get("tempo"),
        end_time, subdivisions_per_beat,
    )
    n_cols = len(grid)
    cells = [[None] * n_cols for _ in range(6)]
    collisions = 0

    for note in notes:
        col = min(range(n_cols), key=lambda i: abs(grid[i] - note["start"]))
        try:
            row = DISPLAY_TO_STRING.index(note["string"])
        except ValueError:
            continue
        if cells[row][col] is not None:
            collisions += 1
        cells[row][col] = note["fret"]

    def fmt(v):
        if v is None:
            return "-" * col_width
        s = str(v)
        return s[:col_width] if len(s) >= col_width else s + "-" * (col_width - len(s))

    formatted = [[fmt(cells[r][c]) for c in range(n_cols)] for r in range(6)]
    cols_per_measure = beats_per_measure * subdivisions_per_beat
    cols_per_line = cols_per_measure * measures_per_line

    lines = []
    for start in range(0, n_cols, cols_per_line):
        end = min(start + cols_per_line, n_cols)
        for row in range(6):
            parts = []
            for c in range(start, end):
                if c > start and (c - start) % cols_per_measure == 0:
                    parts.append("|")
                parts.append(formatted[row][c])
            lines.append(f"{STRING_LABELS[row]}|{''.join(parts)}|")
        lines.append("")

    out = "\n".join(lines)
    if collisions:
        out += f"\n[note: {collisions} cell collisions]"
    return out


# ---------------------------------------------------------------------------
# JamsNormalization-style renderer (chord-label columns, from tab_segments)
# Used when rendering output from the JAMS pipeline or the frontend schema.
# ---------------------------------------------------------------------------

def _format_chord_label(raw: str) -> str:
    """
    Convert backend chord labels to guitarist-friendly display names.
    e.g. "D#:maj" → "D#"  |  "G#:min" → "G#m"  |  "A:7" → "A7"
    """
    if not raw or raw in ("N", "X"):
        return ""
    if ":" in raw:
        root, quality = raw.split(":", 1)
    else:
        return raw
    quality = quality.strip()
    if quality in ("maj", "major", "M", ""):
        return root
    if quality in ("min", "minor", "m"):
        return f"{root}m"
    # For everything else (7, maj7, min7, dim, aug, sus4 …) append as-is
    return f"{root}{quality}"


def render_tab_segments(segments, line_width=80):
    """
    Render ASCII tab from a list of tab_segment dicts (frontend Output JSON schema).

    Each segment must have:
        "suggested_chord": str
        "positions": {"string_1": int|None, ..., "string_6": int|None}

    Args:
        line_width: target line width in characters (default 80).
    """
    if not segments:
        return "(no tab)"

    string_keys = ["string_1", "string_2", "string_3", "string_4", "string_5", "string_6"]
    prefixes    = ["e|", "B|", "G|", "D|", "A|", "E|"]
    prefix_len  = len(prefixes[0])   # 2

    # Determine column width from the widest fret number in this output.
    max_fret = 0
    max_label_len = 0
    for seg in segments:
        for key in string_keys:
            val = seg["positions"].get(key)
            if val is not None:
                max_fret = max(max_fret, int(val))
        max_label_len = max(max_label_len, len(_format_chord_label(seg.get("suggested_chord") or "")))
    # fret number width + 1 leading dash + 1 trailing dash (minimum 3 total).
    # Also widened to fit the longest chord label so labels never run
    # together with zero gap (e.g. "Ebm7Ab7" when fret-based width is too narrow).
    fret_digits = len(str(max_fret)) if max_fret >= 10 else 1
    col_width = max(3, fret_digits + 2, max_label_len)   # e.g. fret ≤ 9 → 3,  fret 10-24 → 4

    # How many segments fit on one line?
    # Each segment occupies col_width chars + 1 for the "|" separator.
    segs_per_line = max(1, (line_width - prefix_len) // (col_width + 1))

    full_tab = ""
    for i in range(0, len(segments), segs_per_line):
        chunk = segments[i : i + segs_per_line]

        # Chord label line — use friendly labels, left-aligned in each column
        chord_line = " " * prefix_len
        for seg in chunk:
            raw   = seg.get("suggested_chord") or ""
            label = _format_chord_label(raw)
            chord_line += label.ljust(col_width + 1)
        full_tab += chord_line.rstrip() + "\n"

        # String lines (e on top, E on bottom)
        for s_idx, s_key in enumerate(string_keys):
            line = prefixes[s_idx]
            for seg in chunk:
                fret = seg["positions"].get(s_key)
                if fret is None:
                    cell = "-" * col_width
                else:
                    s = str(fret)
                    # Pad with dashes: one leading, rest trailing
                    cell = "-" + s + "-" * (col_width - 1 - len(s))
                line += cell + "|"
            full_tab += line + "\n"

        full_tab += "\n"

    return full_tab


def render_tab(pred_rows, cols_per_line=24):
    """
    Render systems of onset columns directly from note predictions dicts.
    Verbatim implementation matching July21.ipynb cell 15.
    """
    from ..fretboard.algorithms import group_notes_by_onset
    from ..fretboard.config import STRING_NAMES

    rows_sorted = sorted(pred_rows, key=lambda r: (float(r["start"]), int(r["midi"])))
    groups = group_notes_by_onset(rows_sorted)
    systems = []
    for start in range(0, len(groups), cols_per_line):
        chunk = groups[start:start + cols_per_line]
        lines = [[] for _ in range(6)]
        for g in chunk:
            by_string = {int(r["pred_string"]): int(r["pred_fret"])
                         for r in g if r.get("pred_string") is not None}
            width = max((len(str(f)) for f in by_string.values()), default=1)
            for s in range(6):
                cell = str(by_string[s]) if s in by_string else "-" * width
                lines[s].append(cell.rjust(width, "-"))
        block = []
        for s in reversed(range(6)):
            block.append(f"{STRING_NAMES[s]:>6}|-" + "-".join(lines[s]) + "-|")
        systems.append("\n".join(block))
    return ("\n\n").join(systems)

