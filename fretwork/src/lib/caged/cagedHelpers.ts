import {
  MAX_FRET,
  STRING_NAMES,
  COMFORTABLE_SPAN,
  MAX_REACHABLE_SPAN,
  PITCH_CLASS_NAMES_SHARP,
} from "../theoryConfig";
import { getDifficultyProfile } from "./difficultyProfiles";

export interface CagedNote {
  start: number;
  duration: number;
  midi: number;
  in_chord?: boolean | null;
  in_key?: boolean | null;
  chord_label?: string;
  orig_idx?: number;
}

export interface Position {
  string: number;
  string_name: string;
  fret: number;
  midi: number;
  pitch_class: number;
}

export interface Candidate {
  positions: Position[];
  base_cost: number;
  center?: number;
  avg_string?: number;
  is_single?: boolean;
}

export interface VoicingShape {
  name: string;
  offsets: { [stringIdx: number]: number };
  power: boolean;
}

const NOTE_TO_PC: { [key: string]: number } = {};
PITCH_CLASS_NAMES_SHARP.forEach((name, i) => {
  NOTE_TO_PC[name] = i;
});
const NOTE_TO_PC_EXTRA: { [key: string]: number } = { 'Db': 1, 'Eb': 3, 'Gb': 6, 'Ab': 8, 'Bb': 10 };
Object.assign(NOTE_TO_PC, NOTE_TO_PC_EXTRA);

export { NOTE_TO_PC };

const CHORD_INTERVALS: { [key: string]: number[] } = {
  'maj': [0, 4, 7],
  'min': [0, 3, 7],
  'dim': [0, 3, 6],
  'aug': [0, 4, 8],
  '7': [0, 4, 7, 10],
  'maj7': [0, 4, 7, 11],
  'min7': [0, 3, 7, 10],
  'm7': [0, 3, 7, 10],
  'sus4': [0, 5, 7],
  'sus2': [0, 2, 7],
  '5': [0, 7],
};

const QUALITY_ALIASES: { [key: string]: string } = {
  'M': 'maj', 'major': 'maj', '': 'maj', 'm': 'min', 'minor': 'min', 'dom7': '7'
};

const VOICING_SHAPES: VoicingShape[] = [
  { name: "E-maj",    offsets: { 0: 0, 1: 2, 2: 2, 3: 1, 4: 0, 5: 0 }, power: false },
  { name: "A-maj",    offsets: { 1: 0, 2: 2, 3: 2, 4: 2, 5: 0 },        power: false },
  { name: "D-maj",    offsets: { 2: 0, 3: 2, 4: 3, 5: 2 },               power: false },
  { name: "C-maj",    offsets: { 1: 3, 2: 2, 3: 0, 4: 1, 5: 0 },        power: false },
  { name: "G-maj",    offsets: { 0: 3, 1: 2, 2: 0, 3: 0, 4: 0, 5: 3 },  power: false },
  { name: "E-min",    offsets: { 0: 0, 1: 2, 2: 2, 3: 0, 4: 0, 5: 0 },  power: false },
  { name: "A-min",    offsets: { 1: 0, 2: 2, 3: 2, 4: 1, 5: 0 },        power: false },
  { name: "E-7",      offsets: { 0: 0, 1: 2, 2: 0, 3: 1, 4: 0, 5: 0 },  power: false },
  { name: "A-7",      offsets: { 1: 0, 2: 2, 3: 0, 4: 2, 5: 0 },        power: false },
  { name: "E-m7",     offsets: { 0: 0, 1: 2, 2: 0, 3: 0, 4: 0, 5: 0 },  power: false },
  { name: "A-m7",     offsets: { 1: 0, 2: 2, 3: 0, 4: 1, 5: 0 },        power: false },
  { name: "Emaj7",    offsets: { 0: 0, 1: 2, 2: 1, 3: 1, 4: 0, 5: 0 },  power: false },
  { name: "Amaj7",    offsets: { 1: 0, 2: 2, 3: 1, 4: 2, 5: 0 },        power: false },
  { name: "5-E",      offsets: { 0: 0, 1: 2 },                            power: true },
  { name: "5-A",      offsets: { 1: 0, 2: 2 },                            power: true },
  { name: "5-D",      offsets: { 2: 0, 3: 2 },                            power: true },
  { name: "5-E-oct",  offsets: { 0: 0, 1: 2, 2: 2 },                     power: true },
  { name: "5-A-oct",  offsets: { 1: 0, 2: 2, 3: 2 },                     power: true },
  { name: "5-D-oct",  offsets: { 2: 0, 3: 2, 4: 2 },                     power: true },
  { name: "oct-E",    offsets: { 0: 0, 2: 2 },                            power: true },
  { name: "oct-A",    offsets: { 1: 0, 3: 2 },                            power: true },
];

export function normalizeQuality(q: string | null): string {
  if (!q) return 'maj';
  const trimmed = q.trim();
  return QUALITY_ALIASES[trimmed] || trimmed;
}

export function chordTones(rootPc: number, quality = 'maj'): number[] {
  const normQual = normalizeQuality(quality);
  const intervals = CHORD_INTERVALS[normQual] || CHORD_INTERVALS['maj'];
  const tones = new Set<number>();
  intervals.forEach(i => tones.add((rootPc + i) % 12));
  return Array.from(tones).sort((a, b) => a - b);
}

export function parseChordSymbol(symbol: string | null): { root: string; root_pc: number; quality: string; tones: number[] } | null {
  if (!symbol) return null;
  const s = symbol.trim().split('/')[0];
  if (['N', 'X', 'nan', 'None', ''].includes(s)) return null;
  let root = '';
  let qual = '';
  if (s.includes(':')) {
    const parts = s.split(':');
    root = parts[0];
    qual = parts[1];
  } else {
    const match = s.match(/^([A-G](?:#|b)?)(.*)$/);
    if (!match) return null;
    root = match[1];
    qual = match[2];
  }
  if (!(root in NOTE_TO_PC)) return null;
  const rootPc = NOTE_TO_PC[root];
  const normQual = normalizeQuality(qual);
  return {
    root,
    root_pc: rootPc,
    quality: normQual,
    tones: chordTones(rootPc, normQual)
  };
}

const MAJOR_STEPS = [2, 2, 1, 2, 2, 2, 1];
const MINOR_STEPS = [2, 1, 2, 2, 1, 2, 2];

function deriveScale(rootPc: number, mode = 'major'): number[] {
  const steps = mode === 'major' ? MAJOR_STEPS : MINOR_STEPS;
  const pcs = [rootPc];
  let cur = rootPc;
  for (let i = 0; i < steps.length - 1; i++) {
    cur = (cur + steps[i]) % 12;
    pcs.push(cur);
  }
  return pcs;
}

export function parseKey(keyLabel: string | null): { root_pc: number; mode: string; scale_pcs: Set<number> } | null {
  if (!keyLabel) return null;
  let s = keyLabel.replace(/:/g, ' ').trim();
  const toks = s.split(/\s+/);
  if (toks.length === 1 && toks[0] in NOTE_TO_PC) {
    s = `${toks[0]} major`;
  }
  
  let root = '';
  let mode = 'major';
  if (toks[0] in NOTE_TO_PC) {
    root = toks[0];
    if (toks.length > 1) {
      const modeCandidate = toks[1].toLowerCase();
      if (modeCandidate.includes('minor') || modeCandidate.includes('min')) {
        mode = 'minor';
      }
    }
  } else {
    return null;
  }
  
  const rootPc = NOTE_TO_PC[root];
  const scalePcs = new Set(deriveScale(rootPc, mode));
  return {
    root_pc: rootPc,
    mode,
    scale_pcs: scalePcs
  };
}

export function buildFretboardLookup(tuning: number[], maxFret = MAX_FRET): { [midi: number]: Position[] } {
  const lookup: { [midi: number]: Position[] } = {};
  tuning.forEach((openMidi, stringIdx) => {
    for (let fret = 0; fret <= maxFret; fret++) {
      const midi = openMidi + fret;
      if (!lookup[midi]) lookup[midi] = [];
      lookup[midi].push({
        string: stringIdx,
        string_name: STRING_NAMES[stringIdx] || `string_${stringIdx}`,
        fret: fret,
        midi: midi,
        pitch_class: midi % 12,
      });
    }
  });
  return lookup;
}

export function getPossiblePositions(midiNote: number, lookup: { [midi: number]: Position[] }, maxFret = MAX_FRET): Position[] {
  const midi = Math.round(midiNote);
  return (lookup[midi] || []).filter(p => p.fret >= 0 && p.fret <= maxFret);
}

export function estimateHandPositionFromFrets(frets: number[]): number {
  const fretted = frets.filter(f => f > 0);
  if (fretted.length === 0) return 0;
  const sorted = [...fretted].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function groupSpan(frets: number[]): number {
  const fretted = frets.filter(f => f > 0);
  if (fretted.length <= 1) return 0;
  return Math.max(...fretted) - Math.min(...fretted);
}

export function awkwardFingeringPenalty(position: Position, handCenter: number): number {
  const fret = position.fret;
  if (fret === 0) return 0.0;
  const distance = Math.abs(fret - handCenter);
  if (distance <= 2) return 0.0;
  if (distance <= COMFORTABLE_SPAN) return 0.5 * (distance - 2);
  if (distance <= MAX_REACHABLE_SPAN) return 2.0 + (distance - COMFORTABLE_SPAN);
  return 10.0 + 2.0 * (distance - MAX_REACHABLE_SPAN);
}

export function groupPlayabilityCostCaged(gp: Position[], difficulty = 'expert'): number {
  if (gp.length === 0) return 0.0;
  const profile = getDifficultyProfile(difficulty);
  const strings = gp.map(p => p.string);
  const frets = gp.map(p => p.fret);
  const fretted = frets.filter(f => f > 0);
  
  const uniqueStrings = new Set(strings);
  if (uniqueStrings.size !== strings.length) return Infinity;
  
  let cost = 0.0;
  const span = groupSpan(frets);
  const compSpan = profile.comfortable_span;
  const maxSpan = profile.max_span;
  if (span > compSpan) cost += 2.0 * (span - compSpan);
  if (span > maxSpan) cost += 25.0 * (span - maxSpan);
  
  if (fretted.length > 0 && Math.min(...fretted) <= 2 && Math.max(...fretted) >= 9) cost += 8.0;
  
  if (strings.length >= 2) {
    const ss = Math.max(...strings) - Math.min(...strings);
    if (ss > 4 && strings.length <= 3) cost += 1.5 * (ss - 4);
  }
  
  const hc = estimateHandPositionFromFrets(frets);
  cost += gp.reduce((sum, p) => sum + awkwardFingeringPenalty(p, hc), 0);
  
  if (frets.some(f => f === 0) && fretted.length > 0 && Math.max(...fretted) > 7) cost += 3.0;
  
  const thr = profile.high_fret_threshold;
  if (thr !== null) {
    fretted.forEach(f => {
      if (f > thr) cost += profile.high_fret_cost * (f - thr);
    });
  }

  if (profile.barre_penalty > 0 && fretted.length >= 3) {
    const fretCounts: { [key: number]: number } = {};
    fretted.forEach(f => { fretCounts[f] = (fretCounts[f] || 0) + 1; });
    if (Object.values(fretCounts).some(cnt => cnt >= 3)) {
      cost += profile.barre_penalty;
    }
  }
  return cost;
}

function offFromMin(d: { [stringIdx: number]: number }): { [stringIdx: number]: number } {
  const vals = Object.values(d);
  if (vals.length === 0) return {};
  const m = Math.min(...vals);
  const result: { [stringIdx: number]: number } = {};
  for (const k in d) {
    const keyNum = Number(k);
    result[keyNum] = d[keyNum] - m;
  }
  return result;
}

export function voicingBonus(positions: Position[]): number {
  const pts: { [stringIdx: number]: number } = {};
  positions.forEach(p => {
    pts[p.string] = p.fret;
  });
  const strings = Object.keys(pts).map(Number).sort((a, b) => a - b);
  if (strings.length < 2) return 0.0;

  const candOff = offFromMin(pts);
  const n = strings.length;
  let best = 0.0;

  for (const sh of VOICING_SHAPES) {
    const isPower = sh.power;
    if (isPower ? (n < 2) : (n < 3)) continue;

    const smap = sh.offsets;
    const allInShape = strings.every(s => s in smap);
    if (!allInShape) continue;

    const subMap: { [stringIdx: number]: number } = {};
    strings.forEach(s => {
      subMap[s] = smap[s];
    });

    const shapeOff = offFromMin(subMap);
    let match = true;
    for (const s of strings) {
      if (candOff[s] !== shapeOff[s]) {
        match = false;
        break;
      }
    }

    if (match) {
      const shapeLen = Object.keys(smap).length;
      best = Math.max(best, 0.6 + 0.4 * (n / shapeLen));
    }
  }
  return best;
}
