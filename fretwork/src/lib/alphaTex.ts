// Converts raw per-note predictions (start/duration in seconds + fret position)
// into alphaTex source, quantizing onto a 16th-note rhythmic grid so AlphaTab
// can render proper standard notation + tab (beams, rests, bar lines) instead
// of one undifferentiated chord block per detected segment.

import { TabSegment } from "@/types/tab";

export interface NoteEvent {
  start: number; // seconds
  duration: number; // seconds
  midi: number;
  string: number; // 1 = high e ... 6 = low E, matches TabSegment.positions keys
  fret: number;
}

const GRID_PER_BEAT = 4; // 16th-note resolution (4 subdivisions per quarter note)
const BEATS_PER_MEASURE = 4; // assume 4/4

// alphaTex duration codes, keyed by grid-unit length (16th-note units).
// Lengths are snapped down to the nearest supported value.
const DURATION_BY_UNITS: { units: number; code: string }[] = [
  { units: 16, code: "1" }, // whole note
  { units: 8, code: "2" }, // half note
  { units: 4, code: "4" }, // quarter note
  { units: 2, code: "8" }, // eighth note
  { units: 1, code: "16" }, // sixteenth note
];

function snapDuration(units: number): { code: string; units: number } {
  for (const d of DURATION_BY_UNITS) {
    if (units >= d.units) return { code: d.code, units: d.units };
  }
  return { code: "16", units: 1 };
}

// alphaTex's \ks directive takes a bare identifier like "ebminor" or
// "gbmajor" (root note name lowercased + mode, no space) — not a numeric
// sharps/flats count. This is the exact set of identifiers alphaTab's
// AlphaTex lexer accepts (one spelling per key, picking the conventional
// enharmonic spelling for each).
const VALID_KS_IDENTS = new Set([
  "cbmajor", "abminor", "gbmajor", "ebminor", "dbmajor", "bbminor", "abmajor",
  "fminor", "ebmajor", "cminor", "bbmajor", "gminor", "fmajor", "dminor",
  "cmajor", "aminor", "gmajor", "eminor", "dmajor", "bminor", "amajor",
  "f#minor", "emajor", "c#minor", "bmajor", "g#minor", "f#major", "d#minor",
  "c#major", "a#minor",
]);

/**
 * Maps a key label like "Eb minor" / "F# major" to alphaTex's \ks directive
 * value (e.g. "ebminor"). Returns null if the key isn't recognized so the
 * caller can omit \ks rather than emit an invalid directive.
 */
export function keyLabelToAlphaTexKs(keyLabel: string | null | undefined): string | null {
  if (!keyLabel) return null;
  const [rootRaw, modeRaw] = keyLabel.trim().split(/\s+/);
  if (!rootRaw) return null;
  const mode = (modeRaw || "major").toLowerCase().startsWith("min") ? "minor" : "major";
  const root = rootRaw.toLowerCase();
  const ident = `${root}${mode}`;
  return VALID_KS_IDENTS.has(ident) ? ident : null;
}

function formatChordLabelSafe(raw: string): string {
  // Mirrors asciiGenerator.formatChordLabel without importing it, to keep
  // this module dependency-free for potential reuse/testing.
  if (!raw || raw === "N" || raw === "X") return "";
  if (!raw.includes(":")) return raw;
  const [root, qualityRaw] = raw.split(":");
  const quality = (qualityRaw || "").trim();
  if (quality === "maj" || quality === "major" || quality === "M" || quality === "") return root;
  if (quality === "min" || quality === "minor" || quality === "m") return `${root}m`;
  return `${root}${quality}`;
}

export interface BuildAlphaTexOptions {
  tempoBpm?: number | null;
  keyLabel?: string | null;
  title?: string;
}

/**
 * Builds an alphaTex score from a flat list of (possibly overlapping) note
 * events. Notes sharing a quantized onset are grouped into a chord; gaps
 * between onsets become rests. Bar lines are inserted every 4 beats.
 */
export function buildAlphaTexFromNotes(
  notes: NoteEvent[],
  opts: BuildAlphaTexOptions = {},
): string {
  if (notes.length === 0) return "";

  const tempoBpm = opts.tempoBpm && opts.tempoBpm > 0 ? opts.tempoBpm : 120;
  const beatsPerSecond = tempoBpm / 60;
  const unitsPerSecond = beatsPerSecond * GRID_PER_BEAT;

  // Quantize each note onto the 16th-note grid.
  type GridNote = { startUnit: number; endUnit: number; string: number; fret: number };
  const gridNotes: GridNote[] = notes
    .map((n) => {
      const startUnit = Math.round(n.start * unitsPerSecond);
      const lengthUnits = Math.max(1, Math.round(n.duration * unitsPerSecond));
      return { startUnit, endUnit: startUnit + lengthUnits, string: n.string, fret: n.fret };
    })
    .sort((a, b) => a.startUnit - b.startUnit);

  // Group simultaneous onsets into chords.
  const onsetGroups = new Map<number, GridNote[]>();
  for (const n of gridNotes) {
    const group = onsetGroups.get(n.startUnit);
    if (group) group.push(n);
    else onsetGroups.set(n.startUnit, [n]);
  }
  const onsets = [...onsetGroups.keys()].sort((a, b) => a - b);

  const unitsPerMeasure = GRID_PER_BEAT * BEATS_PER_MEASURE;
  const beats: string[] = [];
  let cursor = 0;

  onsets.forEach((onsetUnit, idx) => {
    // Fill any gap before this onset with rests.
    let gap = onsetUnit - cursor;
    while (gap > 0) {
      const { code, units } = snapDuration(gap);
      beats.push(`r.${code}`);
      gap -= units;
      cursor += units;
    }

    const group = onsetGroups.get(onsetUnit)!;
    const nextOnsetUnit = idx + 1 < onsets.length ? onsets[idx + 1] : Math.max(...group.map((n) => n.endUnit));
    const naturalLen = Math.max(...group.map((n) => n.endUnit)) - onsetUnit;
    const availableLen = Math.max(1, Math.min(naturalLen, nextOnsetUnit - onsetUnit));
    const { code, units } = snapDuration(availableLen);

    const noteStrs = group.map((n) => `${n.fret}.${n.string}`);
    beats.push(noteStrs.length === 1 ? `${noteStrs[0]}.${code}` : `(${noteStrs.join(" ")}).${code}`);
    cursor += units;
  });

  // Insert bar lines every full measure.
  const measures: string[] = [];
  let measureUnits = 0;
  let currentMeasure: string[] = [];
  let unitTracker = 0;
  for (const beat of beats) {
    currentMeasure.push(beat);
    const match = beat.match(/\.(\d+)$/);
    const code = match ? parseInt(match[1], 10) : 4;
    const unitsForCode = GRID_PER_BEAT * (4 / code);
    unitTracker += unitsForCode;
    measureUnits += unitsForCode;
    if (measureUnits >= unitsPerMeasure) {
      measures.push(currentMeasure.join(" "));
      currentMeasure = [];
      measureUnits = 0;
    }
  }
  if (currentMeasure.length > 0) measures.push(currentMeasure.join(" "));
  void unitTracker;

  const headerLines: string[] = [];
  if (opts.title) headerLines.push(`\\title "${opts.title}"`);
  if (tempoBpm) headerLines.push(`\\tempo ${Math.round(tempoBpm)}`);
  const ks = keyLabelToAlphaTexKs(opts.keyLabel);
  if (ks) headerLines.push(`\\ks ${ks}`);

  return `${headerLines.join("\n")}\n.\n${measures.join(" | ")} |`;
}

export { formatChordLabelSafe };

/**
 * Expands chord-grouped segments (one block per detected chord region) into
 * several even quarter-note chord hits per segment, using the segment's own
 * fret positions. Used to give the demo data real rhythm/bar-line structure
 * without fabricating different fret assignments than what the algorithm chose.
 */
export function segmentsToQuarterNoteEvents(
  segments: TabSegment[],
  subdivisionsPerSegment = 4,
): NoteEvent[] {
  const events: NoteEvent[] = [];
  for (const seg of segments) {
    const segDuration = seg.time_end - seg.time_start;
    const beatDuration = segDuration / subdivisionsPerSegment;
    const stringFrets: { string: number; fret: number }[] = [];
    for (let s = 1; s <= 6; s++) {
      const fret = seg.positions[`string_${s}`];
      if (fret !== null && fret !== undefined) stringFrets.push({ string: s, fret });
    }
    if (stringFrets.length === 0) continue;

    for (let i = 0; i < subdivisionsPerSegment; i++) {
      const start = seg.time_start + i * beatDuration;
      for (const { string, fret } of stringFrets) {
        events.push({ start, duration: beatDuration, midi: 0, string, fret });
      }
    }
  }
  return events;
}
