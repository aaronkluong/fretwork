import { TabSegment } from "@/types/tab";

export const demoTabSegments: TabSegment[] = [
  {
    time_start: 0.0,
    time_end: 2.0,
    suggested_chord: "Ebm7",
    suggested_voicing: "Voicing_Eb_Min7_Fret6",
    strumming_pattern: "D-D-U-D-U",
    positions: {
      string_6: null,
      string_5: 6,
      string_4: 8,
      string_3: 6,
      string_2: 7,
      string_1: 6,
    },
    fingering: {
      string_5: 1,
      string_4: 3,
      string_3: 1,
      string_2: 2,
      string_1: 1,
    },
  },
  {
    time_start: 2.0,
    time_end: 4.0,
    suggested_chord: "Ab7",
    suggested_voicing: "Voicing_Ab7_Fret4",
    strumming_pattern: "D-D-U-D-U",
    positions: {
      string_6: 4,
      string_5: null,
      string_4: 4,
      string_3: 5,
      string_2: 4,
      string_1: 4,
    },
    fingering: {
      string_6: 1,
      string_4: 1,
      string_3: 2,
      string_2: 1,
      string_1: 1,
    },
  },
  {
    time_start: 4.0,
    time_end: 6.0,
    suggested_chord: "Dbmaj7",
    suggested_voicing: "Voicing_Dbmaj7_Fret4",
    strumming_pattern: "D-D-U-D-U",
    positions: {
      string_6: null,
      string_5: 4,
      string_4: 6,
      string_3: 5,
      string_2: 6,
      string_1: 4,
    },
    fingering: {
      string_5: 1,
      string_4: 3,
      string_3: 2,
      string_2: 4,
      string_1: 1,
    },
  },
  {
    time_start: 6.0,
    time_end: 8.0,
    suggested_chord: "Gbmaj7",
    suggested_voicing: "Voicing_Gbmaj7_Fret2",
    strumming_pattern: "D-D-U-D-U",
    positions: {
      string_6: 2,
      string_5: null,
      string_4: 3,
      string_3: 3,
      string_2: 2,
      string_1: null,
    },
    fingering: { string_6: 1, string_4: 3, string_3: 4, string_2: 2 },
  },
];

const STRING_KEYS = [
  "string_1",
  "string_2",
  "string_3",
  "string_4",
  "string_5",
  "string_6",
] as const;
const STRING_PREFIXES = ["e|", "B|", "G|", "D|", "A|", "E|"];

/**
 * Convert backend chord labels to guitarist-friendly display names.
 * e.g. "D#:maj" -> "D#"  |  "G#:min" -> "G#m"  |  "A:7" -> "A7"
 *
 * Mirrors backend/ascii_renderer.py::_format_chord_label so the ASCII output
 * looks the same whether it's rendered server-side or client-side.
 */
export function formatChordLabel(raw: string | null | undefined): string {
  if (!raw || raw === "N" || raw === "X") return "";
  if (!raw.includes(":")) return raw;

  const colonIdx = raw.indexOf(":");
  const root = raw.slice(0, colonIdx);
  const qualityRaw = raw.slice(colonIdx + 1);
  const quality = qualityRaw.trim();
  if (quality === "maj" || quality === "major" || quality === "M" || quality === "") {
    return root;
  }
  if (quality === "min" || quality === "minor" || quality === "m") {
    return `${root}m`;
  }
  // For everything else (7, maj7, min7, dim, aug, sus4 ...) append as-is
  return `${root}${quality}`;
}

/**
 * Column width for fret cells, sized to the widest fret number across all
 * segments (minimum 3, e.g. "-3-"; "-12-" for double-digit frets) AND wide
 * enough to fit the longest chord label so chord names never run together
 * with zero gap (e.g. "Ebm7Ab7" when labels exceed the fret-based width).
 *
 * Mirrors backend/ascii_renderer.py::render_tab_segments's col_width logic.
 */
export function getColWidth(segments: TabSegment[]): number {
  let maxFret = 0;
  let maxLabelLen = 0;
  for (const seg of segments) {
    for (const key of STRING_KEYS) {
      const val = seg.positions[key];
      if (val !== null && val !== undefined) {
        maxFret = Math.max(maxFret, val);
      }
    }
    maxLabelLen = Math.max(maxLabelLen, formatChordLabel(seg.suggested_chord).length);
  }
  const fretDigits = maxFret >= 10 ? String(maxFret).length : 1;
  // padEnd(colWidth + 1) gives the label colWidth+1 chars to fit in, so
  // colWidth must be >= maxLabelLen to guarantee at least a 1-char gap.
  return Math.max(3, fretDigits + 2, maxLabelLen);
}

export function generateAsciiTab(
  segments: TabSegment[],
  colsPerLine: number = 4,
): string {
  const prefixPadding = "  ";
  const colWidth = getColWidth(segments);

  let chordLine = prefixPadding;
  let stringLines = STRING_KEYS.map(() => "");
  let fullOutput = "";

  segments.forEach((seg, idx) => {
    const chordLabel = formatChordLabel(seg.suggested_chord);
    chordLine += chordLabel.padEnd(colWidth + 1, " ");

    STRING_KEYS.forEach((strName, strIdx) => {
      const fretVal = seg.positions[strName];
      let cellStr = "";
      if (fretVal === null || fretVal === undefined) {
        cellStr = "-".repeat(colWidth);
      } else {
        const fretText = fretVal.toString();
        // One leading dash, fret number, remaining dashes trailing.
        cellStr = "-" + fretText + "-".repeat(colWidth - 1 - fretText.length);
      }
      stringLines[strIdx] += cellStr + "|";
    });

    if ((idx + 1) % colsPerLine === 0 || idx === segments.length - 1) {
      fullOutput += chordLine.trimEnd() + "\n";
      stringLines.forEach((line, sIdx) => {
        fullOutput += STRING_PREFIXES[sIdx] + line + "\n";
      });
      fullOutput += "\n";

      chordLine = prefixPadding;
      stringLines = STRING_KEYS.map(() => "");
    }
  });

  return fullOutput;
}
