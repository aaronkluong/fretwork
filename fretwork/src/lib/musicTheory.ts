// fretwork/src/lib/musicTheory.ts
// Pure-TS mirror of backend/fretboard/theory.py
// Provides scale/key utilities and chord-function (Roman numeral) annotation.
// All pitch-class arrays are sourced from theoryConfig.ts — no duplicates.

import { PITCH_CLASS_NAMES_SHARP } from "@/lib/theoryConfig";

// ---------------------------------------------------------------------------
// Pitch-class name lookup (sharp canonical + enharmonic flat aliases)
// ---------------------------------------------------------------------------

const NOTE_TO_PC: Record<string, number> = {};
PITCH_CLASS_NAMES_SHARP.forEach((name, i) => {
  NOTE_TO_PC[name] = i;
});
// Flat enharmonics
const FLAT_ALIASES: Record<string, number> = {
  Db: 1,
  Eb: 3,
  Fb: 4,
  Gb: 6,
  Ab: 8,
  Bb: 10,
  Cb: 11,
};
Object.assign(NOTE_TO_PC, FLAT_ALIASES);

// Prefer flat names for common flat roots (mirrors useAnalysis.ts preference)
const FLAT_PREFERRED_PCS = new Set([1, 3, 6, 8, 10]);
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function pcToName(pc: number): string {
  const norm = ((pc % 12) + 12) % 12;
  return FLAT_PREFERRED_PCS.has(norm)
    ? FLAT_NAMES[norm]
    : PITCH_CLASS_NAMES_SHARP[norm];
}

// ---------------------------------------------------------------------------
// Scale intervals (matches theory.py constants)
// ---------------------------------------------------------------------------

const MAJOR_STEPS = [2, 2, 1, 2, 2, 2, 1];
const MINOR_STEPS = [2, 1, 2, 2, 1, 2, 2];
const MAJOR_QUALITIES = ["maj", "min", "min", "maj", "maj", "min", "dim"] as const;
const MINOR_QUALITIES = ["min", "dim", "maj", "min", "min", "maj", "maj"] as const;
type Quality = (typeof MAJOR_QUALITIES)[number];

// ---------------------------------------------------------------------------
// Scale / key derivation
// ---------------------------------------------------------------------------

export interface DiatonicChord {
  degree: number; // 1-indexed
  rootPc: number;
  root: string;
  quality: Quality;
  symbol: string; // e.g. "G:min"
}

export interface KeyInfo {
  key: string;       // e.g. "Eb minor"
  root: string;      // e.g. "Eb"
  rootPc: number;
  mode: "major" | "minor";
  scalePcs: number[];
  scaleNotes: string[];
  diatonicChords: DiatonicChord[];
}

/** Derive the 7 pitch-classes of a scale starting at rootPc. */
export function deriveScale(rootPc: number, mode: "major" | "minor"): number[] {
  const steps = mode === "major" ? MAJOR_STEPS : MINOR_STEPS;
  const pcs: number[] = [rootPc];
  let cur = rootPc;
  for (let i = 0; i < steps.length - 1; i++) {
    cur = (cur + steps[i]) % 12;
    pcs.push(cur);
  }
  return pcs;
}

function buildKeyDatabase(): Map<string, KeyInfo> {
  const db = new Map<string, KeyInfo>();
  // Iterate only sharp names + flat aliases to build all 24 major/minor keys
  const roots = [...PITCH_CLASS_NAMES_SHARP.map((n, i) => ({ name: n, pc: i }))];
  // Add flat root names for display parity
  Object.entries(FLAT_ALIASES).forEach(([name, pc]) => {
    roots.push({ name, pc });
  });

  const modes: Array<"major" | "minor"> = ["major", "minor"];
  for (const { name, pc } of roots) {
    for (const mode of modes) {
      const scalePcs = deriveScale(pc, mode);
      const qualities = mode === "major" ? MAJOR_QUALITIES : MINOR_QUALITIES;
      const diatonicChords: DiatonicChord[] = scalePcs.map((scalePc, idx) => ({
        degree: idx + 1,
        rootPc: scalePc,
        root: pcToName(scalePc),
        quality: qualities[idx],
        symbol: `${pcToName(scalePc)}:${qualities[idx]}`,
      }));
      const key = `${name} ${mode}`;
      db.set(key, {
        key,
        root: name,
        rootPc: pc,
        mode,
        scalePcs,
        scaleNotes: scalePcs.map(pcToName),
        diatonicChords,
      });
    }
  }
  return db;
}

const KEY_DB = buildKeyDatabase();

/** Look up key information by label (e.g. "Eb minor", "G major"). Returns null if unknown. */
export function getKeyInfo(keyLabel: string | null | undefined): KeyInfo | null {
  if (!keyLabel) return null;
  const normalised = keyLabel.trim().replace(":", " ");
  // Try direct lookup first
  if (KEY_DB.has(normalised)) return KEY_DB.get(normalised)!;
  // Try case-insensitive
  for (const [k, v] of KEY_DB) {
    if (k.toLowerCase() === normalised.toLowerCase()) return v;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Chord function (Roman numeral) annotation
// ---------------------------------------------------------------------------

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

// Intervals for common chord types (relative to root in semitones)
const CHORD_INTERVALS: Record<string, number[]> = {
  maj:   [0, 4, 7],
  min:   [0, 3, 7],
  dim:   [0, 3, 6],
  aug:   [0, 4, 8],
  "7":   [0, 4, 7, 10],
  maj7:  [0, 4, 7, 11],
  min7:  [0, 3, 7, 10],
  m7:    [0, 3, 7, 10],
  m7b5:  [0, 3, 6, 10],
  sus4:  [0, 5, 7],
  sus2:  [0, 2, 7],
  "5":   [0, 7],
  "":    [0, 4, 7], // bare major
};

const QUALITY_ALIASES: Record<string, string> = {
  M: "maj", major: "maj",
  m: "min", minor: "min",
  dom7: "7",
};

function normaliseQuality(q: string): string {
  return QUALITY_ALIASES[q] ?? q;
}

export interface ParsedChord {
  root: string;
  rootPc: number;
  quality: string;
  tones: number[];
}

/** Parse a chord symbol like "Ebm7", "G:maj", "Dbmaj7" → structured chord. */
export function parseChordSymbol(symbol: string | null | undefined): ParsedChord | null {
  if (!symbol) return null;
  const s = symbol.trim().split("/")[0]; // drop slash bass
  if (["N", "X", "nan", "None", ""].includes(s)) return null;

  let root: string;
  let qualRaw: string;

  if (s.includes(":")) {
    [root, qualRaw] = s.split(":", 2) as [string, string];
  } else {
    // Match root note (A-G, optional # or b) then remainder
    const m = s.match(/^([A-G](?:#|b)?)(.*)$/);
    if (!m) return null;
    root = m[1];
    qualRaw = m[2];
  }

  if (!(root in NOTE_TO_PC)) return null;
  const rootPc = NOTE_TO_PC[root];
  const quality = normaliseQuality(qualRaw);
  const intervals = CHORD_INTERVALS[quality] ?? CHORD_INTERVALS[""];
  const tones = intervals.map((iv) => (rootPc + iv) % 12).sort((a, b) => a - b);

  return { root, rootPc, quality, tones };
}

export interface ChordFunctionResult {
  /** Roman numeral with accidental prefix, e.g. "♭VII", "IV", "i7" */
  roman: string;
  /** Whether the chord is diatonic to the key */
  isDiatonic: boolean;
  /** Degree index 0-6, or null for chromatic chords */
  degree: number | null;
}

/**
 * Return the Roman numeral function of `chordSymbol` in `keyLabel`.
 * Falls back to "chromatic" description for non-diatonic chords.
 */
export function getChordFunction(
  chordSymbol: string | null | undefined,
  keyLabel: string | null | undefined
): ChordFunctionResult | null {
  const parsed = parseChordSymbol(chordSymbol);
  const keyInfo = getKeyInfo(keyLabel);
  if (!parsed || !keyInfo) return null;

  const { rootPc, quality } = parsed;

  // Find degree in the scale — exact match first, then enharmonic
  let degree: number | null = null;
  let accidental = "";

  const exactIdx = keyInfo.scalePcs.indexOf(rootPc);
  if (exactIdx !== -1) {
    degree = exactIdx;
  } else {
    // Search for closest chromatic degree with ♭ or ♯ prefix
    for (let i = 0; i < keyInfo.scalePcs.length; i++) {
      const diff = ((rootPc - keyInfo.scalePcs[i] + 12) % 12);
      if (diff === 1) {
        // rootPc is a semitone above scalePcs[i] → #N
        degree = i;
        accidental = "♯";
        break;
      } else if (diff === 11) {
        // rootPc is a semitone below scalePcs[i] → ♭N
        degree = i;
        accidental = "♭";
        break;
      }
    }
  }

  const isMinorQuality = ["min", "m", "min7", "m7", "dim", "m7b5"].includes(quality);
  const isDim = quality === "dim";

  if (degree === null) {
    // Fully chromatic — still express relative to closest scale tone
    return { roman: "chromatic", isDiatonic: false, degree: null };
  }

  const numeral = ROMAN_NUMERALS[degree] ?? "?";
  // Minor numeral → lowercase; diminished → lowercase + °; major → uppercase
  const romanBase = isMinorQuality || isDim ? numeral.toLowerCase() : numeral;

  // Build quality suffix for extended chords
  let qualitySuffix = "";
  if (quality === "7" || quality === "dom7") qualitySuffix = "7";
  else if (quality === "maj7") qualitySuffix = "maj7";
  else if (quality === "min7" || quality === "m7") qualitySuffix = "7";
  else if (quality === "dim") qualitySuffix = "°";
  else if (quality === "aug") qualitySuffix = "+";
  else if (quality === "m7b5") qualitySuffix = "ø7";
  else if (quality === "sus4") qualitySuffix = "sus4";
  else if (quality === "sus2") qualitySuffix = "sus2";

  const isDiatonic = accidental === "" && exactIdx !== -1;
  const roman = `${accidental}${romanBase}${qualitySuffix}`;

  return { roman, isDiatonic, degree };
}

// ---------------------------------------------------------------------------
// Scale / mode name
// ---------------------------------------------------------------------------

/** Map from key label → mode name (Ionian, Aeolian, etc.). Currently supports
 *  natural major and natural minor; extend as needed. */
export function getModeName(keyLabel: string | null | undefined): string | null {
  const info = getKeyInfo(keyLabel);
  if (!info) return null;
  return info.mode === "major" ? "Ionian" : "Aeolian";
}
