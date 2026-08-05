/**
 * Pure helpers for the Working Tab Document: pitch-preserving baselines,
 * pin remapping, theory extraction, and version metadata.
 * Used by useAnalysis so param changes (difficulty / tuning / capo / key)
 * always re-finger the latest working state instead of stale originals.
 */

import { TabSegment } from "@/types/tab";
import { TUNINGS, MAX_FRET, ONSET_TOLERANCE_SECONDS } from "@/lib/theoryConfig";

export { ONSET_TOLERANCE_SECONDS };

export const STRING_KEYS = [
  "string_1",
  "string_2",
  "string_3",
  "string_4",
  "string_5",
  "string_6",
] as const;

/** string_6 (low E) → index 0 … string_1 (high e) → index 5 */
export const STRING_INDEX_MAP: Record<string, number> = {
  string_6: 0,
  string_5: 1,
  string_4: 2,
  string_3: 3,
  string_2: 4,
  string_1: 5,
};

export const STRING_KEYS_LOW_TO_HIGH = [
  "string_6",
  "string_5",
  "string_4",
  "string_3",
  "string_2",
  "string_1",
] as const;

export type RawNote = { start: number; duration: number; midi: number };
export type RawChord = { start: number; end: number; chord: string };
export type PinMap = Record<string, [number, number]>;
export type PinMapNumeric = Record<number, [number, number]>;

export interface WorkingParams {
  difficulty: string;
  tuning: string;
  capo: number;
  keySignature: string;
}

/** Open-string MIDI for a named tuning + capo. */
export function openStringMidi(tuningName: string, capo: number): number[] {
  const base = TUNINGS[tuningName] || TUNINGS.standard;
  return base.map((m) => m + capo);
}

/**
 * Convert fretted segments to pitch events using the tuning/capo that
 * produced those frets (pitch-preserving source of truth).
 */
export function segmentsToRawNotes(
  segments: TabSegment[],
  tuningName = "standard",
  capo = 0
): RawNote[] {
  const opens = openStringMidi(tuningName, capo);
  const rawNotes: RawNote[] = [];

  segments.forEach((seg) => {
    const duration = seg.time_end - seg.time_start;
    STRING_KEYS.forEach((sKey) => {
      const fret = seg.positions[sKey];
      if (fret !== null && fret !== undefined) {
        const stringIdx = STRING_INDEX_MAP[sKey];
        rawNotes.push({
          start: seg.time_start,
          duration,
          midi: opens[stringIdx] + fret,
        });
      }
    });
  });
  return rawNotes;
}

export function segmentsToChords(segments: TabSegment[]): RawChord[] {
  return segments.map((seg) => ({
    start: seg.time_start,
    end: seg.time_end,
    chord: seg.suggested_chord ?? "",
  }));
}

/** Unique chord symbols in segment order for TheoryPanel. */
export function extractChordProgression(segments: TabSegment[]): string[] {
  const chords: string[] = [];
  segments.forEach((seg) => {
    if (seg.suggested_chord && !chords.includes(seg.suggested_chord)) {
      chords.push(seg.suggested_chord);
    }
  });
  return chords;
}

/**
 * Re-express a pinned (string, fret) under a new tuning/capo while keeping pitch.
 * Prefers the same string; falls back to any valid string; returns null if none.
 */
export function remapPinForTuning(
  midi: number,
  preferredStringIdx: number,
  nextTuning: string,
  nextCapo: number
): [number, number] | null {
  const opens = openStringMidi(nextTuning, nextCapo);
  const tryString = (sIdx: number): [number, number] | null => {
    const fret = Math.round(midi) - opens[sIdx];
    if (fret >= 0 && fret <= MAX_FRET) return [sIdx, fret];
    return null;
  };

  const preferred = tryString(preferredStringIdx);
  if (preferred) return preferred;

  for (let s = 0; s < 6; s++) {
    if (s === preferredStringIdx) continue;
    const hit = tryString(s);
    if (hit) return hit;
  }
  return null;
}

export interface WorkingBaseline {
  notes: RawNote[];
  chords: RawChord[];
  pins: PinMap;
  pinCount: number;
}

/**
 * Build pitch-preserving baseline + remapped pins from the current working tab.
 * MIDI always comes from prevTuning/prevCapo frets; pins are remapped into nextTuning/nextCapo.
 */
export function buildWorkingBaseline(
  segments: TabSegment[],
  prevTuning: string,
  prevCapo: number,
  nextTuning: string,
  nextCapo: number
): WorkingBaseline {
  const notes = segmentsToRawNotes(segments, prevTuning, prevCapo).sort(
    (a, b) => a.start - b.start || a.midi - b.midi
  );
  const chords = segmentsToChords(segments);
  const prevOpens = openStringMidi(prevTuning, prevCapo);
  const used = new Set<number>();
  const pins: PinMap = {};

  segments.forEach((seg) => {
    STRING_KEYS_LOW_TO_HIGH.forEach((sKey) => {
      const fret = seg.positions[sKey];
      const isPinned = seg.pinned_positions?.[sKey] ?? false;
      if (fret === null || fret === undefined) return;

      const sIdx = STRING_INDEX_MAP[sKey];
      const pitchMidi = prevOpens[sIdx] + fret;

      let finalIdx = notes.findIndex(
        (n, i) =>
          !used.has(i) &&
          Math.abs(n.start - seg.time_start) < ONSET_TOLERANCE_SECONDS &&
          Math.round(n.midi) === Math.round(pitchMidi)
      );
      if (finalIdx === -1) {
        finalIdx = notes.findIndex(
          (n, i) =>
            !used.has(i) &&
            Math.abs(n.start - seg.time_start) < ONSET_TOLERANCE_SECONDS
        );
      }
      if (finalIdx === -1) return;

      used.add(finalIdx);
      notes[finalIdx].midi = pitchMidi;

      if (isPinned) {
        const remapped = remapPinForTuning(pitchMidi, sIdx, nextTuning, nextCapo);
        if (remapped) pins[String(finalIdx)] = remapped;
      }
    });
  });

  return {
    notes,
    chords,
    pins,
    pinCount: Object.keys(pins).length,
  };
}

export function pinsToNumeric(pins: PinMap): PinMapNumeric {
  const out: PinMapNumeric = {};
  Object.entries(pins).forEach(([k, v]) => {
    out[Number(k)] = v;
  });
  return out;
}

export function labelForNotes(notes: { fret: number }[]): string {
  const frets = notes.map((n) => n.fret).filter((f) => f > 0);
  if (frets.length === 0) return "open position";
  const sorted = [...frets].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  return median <= 3 ? "open position" : `around fret ${Math.round(median)}`;
}

/** Playability score from frets + difficulty (0–100). */
export function computePlayabilityScore(
  segments: TabSegment[],
  difficulty: string
): number {
  const frets: number[] = [];
  segments.forEach((seg) => {
    STRING_KEYS.forEach((k) => {
      const f = seg.positions[k];
      if (f !== null && f !== undefined && f > 0) frets.push(f);
    });
  });
  if (frets.length === 0) return 92;

  const mean = frets.reduce((a, b) => a + b, 0) / frets.length;
  const maxF = Math.max(...frets);
  const minF = Math.min(...frets);
  const span = maxF - minF;

  let score = 94;
  score -= Math.max(0, mean - 3) * 1.5;
  score -= Math.max(0, span - 4) * 2.5;
  score -= Math.max(0, maxF - 12) * 1.2;

  const d = difficulty.toLowerCase();
  if (d === "beginner") score += 2;
  else if (d === "expert") score -= 1;

  return Math.max(65, Math.min(98, Math.round(score)));
}

export function formatAppliedSetup(params: WorkingParams): string {
  const tuningLabel = params.tuning.replace(/_/g, " ");
  const capoLabel = params.capo > 0 ? ` · capo ${params.capo}` : "";
  return `${params.difficulty} · ${tuningLabel}${capoLabel}`;
}

export function clearPinnedPositions(segments: TabSegment[]): TabSegment[] {
  return segments.map((seg) => ({
    ...seg,
    pinned_positions: {},
  }));
}

export function midiPitchMultiset(notes: RawNote[]): number[] {
  return notes.map((n) => Math.round(n.midi)).sort((a, b) => a - b);
}

export function fretsFromSegments(segments: TabSegment[]): number[] {
  const frets: number[] = [];
  segments.forEach((seg) => {
    STRING_KEYS.forEach((k) => {
      const f = seg.positions[k];
      if (f !== null && f !== undefined) frets.push(f);
    });
  });
  return frets;
}
