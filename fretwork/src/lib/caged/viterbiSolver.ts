import {
  MAX_FRET,
  MAX_GROUP_CANDIDATES,
  LARGE_JUMP_THRESHOLD,
} from "../theoryConfig";
import { TUNINGS } from "../theoryConfig";
import { TabSegment } from "@/types/tab";
import {
  CAGED_WEIGHTS,
  getDifficultyProfile,
  resolveDifficulty,
} from "./difficultyProfiles";

export interface JamsValue {
  time: number;
  duration: number;
  value: unknown;
}

export interface JamsAnnotation {
  namespace: string;
  data: JamsValue[];
}

export interface JamsData {
  annotations?: JamsAnnotation[];
}
import {
  CagedNote,
  Position,
  Candidate,
  parseKey,
  parseChordSymbol,
  buildFretboardLookup,
  getPossiblePositions,
  groupPlayabilityCostCaged,
  voicingBonus,
} from "./cagedHelpers";

export interface AssignedNote extends CagedNote {
  pred_string: number;
  pred_fret: number;
  method: string;
  anchor: number;
}

function intervalsMatchStandard(tuning: number[]): boolean {
  if (tuning.length !== 6) return false;
  const intervals = [];
  for (let i = 0; i < 5; i++) {
    intervals.push(tuning[i + 1] - tuning[i]);
  }
  const standard = [5, 5, 5, 4, 5];
  return intervals.every((val, idx) => val === standard[idx]);
}

const BOX_WINDOW = 4;
const SHIFT_FREE = 2;
const BOX_CENTER_COST = 0.15;
const BOX_OUTSIDE_COST = 3.00;
const OPEN_OUT_OF_BOX_COST = 0.60;
const BOX_OFFBOX_COST = 0.60;
const BOX_NONHOME_COST = 1.00;
const BOX_LOWNECK_COST = 0.04;

const PENTATONIC: { [key: string]: number[] } = {
  'major': [0, 2, 4, 7, 9],
  'minor': [0, 3, 5, 7, 10]
};

function boxAnchorsForKey(key: { root_pc: number; mode: string; scale_pcs: Set<number> } | null, maxFret = MAX_FRET, window = BOX_WINDOW) {
  const rng = Array.from({ length: maxFret - window + 1 }, (_, i) => i);
  if (!key) {
    return rng.map(a => ({ anchor: a, key_cost: BOX_LOWNECK_COST * a }));
  }
  
  const r = key.root_pc;
  const penta = PENTATONIC[key.mode] || PENTATONIC['minor'];
  const box = new Set<number>();
  penta.forEach(deg => {
    let f = (deg + (r - 4 + 12)) % 12;
    while (f <= maxFret - 1) {
      box.add(f);
      f += 12;
    }
  });
  
  const home = new Set<number>();
  let h = (r - 4 + 12) % 12;
  while (h <= maxFret - 1) {
    home.add(h);
    h += 12;
  }
  
  return rng.map(a => {
    let d = 0;
    if (box.size > 0) {
      const distances = Array.from(box).map(b => Math.abs(a - b));
      d = Math.min(...distances);
    }
    const kc = BOX_OFFBOX_COST * d + (home.has(a) ? 0.0 : BOX_NONHOME_COST) + BOX_LOWNECK_COST * a;
    return { anchor: a, key_cost: kc };
  });
}

function positionWindowCost(p: Position, anchor: number, window = BOX_WINDOW): number {
  const f = p.fret;
  if (f === 0) return anchor <= 2 ? 0.0 : OPEN_OUT_OF_BOX_COST;
  if (anchor <= f && f <= anchor + window) {
    return BOX_CENTER_COST * Math.abs(f - (anchor + window / 2.0));
  }
  return BOX_OUTSIDE_COST * (f < anchor ? (anchor - f) : (f - (anchor + window)));
}

function candidateWindowCost(c: Candidate, anchor: number): number {
  return c.positions.reduce((sum, p) => sum + positionWindowCost(p, anchor), 0);
}

function estimateHandPositionFromFrets(frets: number[]): number {
  const fretted = frets.filter(f => f > 0);
  if (fretted.length === 0) return 0;
  const sorted = [...fretted].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function enrichCandidate(c: Candidate): Candidate {
  const frets = c.positions.map(p => p.fret);
  const strings = c.positions.map(p => p.string);
  c.center = estimateHandPositionFromFrets(frets);
  c.avg_string = strings.length > 0 ? (strings.reduce((a, b) => a + b, 0) / strings.length) : 0.0;
  c.is_single = c.positions.length === 1;
  return c;
}

function candidateGroupsVoiced(
  groupNotes: CagedNote[],
  lookup: { [midi: number]: Position[] },
  difficulty = 'expert',
  voicingValid = true
): Candidate[] {
  const maxCandidates = MAX_GROUP_CANDIDATES;
  const poolSize = voicingValid ? Math.max(maxCandidates * 3, 24) : maxCandidates;
  
  const pool = candidateGroupsCaged(groupNotes, lookup, difficulty, poolSize);
  const profile = getDifficultyProfile(difficulty);
  const w = voicingValid ? profile.w_voicing : 0.0;

  if (w > 0 && groupNotes.length >= 2) {
    pool.forEach(c => {
      const b = voicingBonus(c.positions);
      if (b > 0) {
        c.base_cost = c.base_cost - w * b;
      }
    });
    pool.sort((a, b) => a.base_cost - b.base_cost);
  }

  return pool.slice(0, maxCandidates);
}

function positionPriorCost(midi: number, position: Position): number {
  void midi;
  void position;
  return 0.0;
}

function cartesianProduct<T>(arrays: T[][]): T[][] {
  return arrays.reduce((acc, curr) => {
    return acc.flatMap(c => curr.map(n => [...c, n]));
  }, [[]] as T[][]);
}

function groupNotesByOnset(notes: CagedNote[], tolerance = 0.035) {
  if (notes.length === 0) return [];
  const notesSorted = [...notes].sort((a, b) => a.start - b.start);
  const groups: CagedNote[][] = [];
  let current = [notesSorted[0]];
  let groupStart = notesSorted[0].start;
  for (let i = 1; i < notesSorted.length; i++) {
    const n = notesSorted[i];
    if (Math.abs(n.start - groupStart) <= tolerance) {
      current.push(n);
    } else {
      groups.push(current);
      current = [n];
      groupStart = n.start;
    }
  }
  groups.push(current);
  return groups;
}

function contextCost(groupNotes: CagedNote[]): number {
  let cost = 0.0;
  for (let i = 0; i < groupNotes.length; i++) {
    const n = groupNotes[i];
    if (n.in_chord === false) cost += 0.15;
    if (n.in_key === false) cost += 0.10;
  }
  return cost;
}

function candidateGroupsCaged(
  groupNotes: CagedNote[],
  lookup: { [midi: number]: Position[] },
  difficulty = 'expert',
  maxCandidates = MAX_GROUP_CANDIDATES
): Candidate[] {
  const pls: Position[][] = [];
  for (let i = 0; i < groupNotes.length; i++) {
    const pos = getPossiblePositions(groupNotes[i].midi, lookup);
    if (pos.length === 0) return [];
    pls.push(pos);
  }
  
  const greedy = (cost: number): Candidate => {
    const used = new Set<number>();
    const pick: { [key: number]: Position } = {};
    const sortedIndices = groupNotes.map((n, i) => ({ n, i })).sort((a, b) => b.n.midi - a.n.midi);
    sortedIndices.forEach(({ i }) => {
      const opts = [...pls[i]].sort((a, b) => a.fret !== b.fret ? a.fret - b.fret : a.string - b.string);
      const chosen = opts.find(p => !used.has(p.string)) || opts[0];
      used.add(chosen.string);
      pick[i] = chosen;
    });
    return enrichCandidate({
      positions: groupNotes.map((_, i) => pick[i]),
      base_cost: cost
    });
  };
  
  let space = 1;
  pls.forEach(pl => space *= pl.length);
  if (space > 20000) {
    return [greedy(10.0)];
  }
  
  const combos = cartesianProduct(pls);
  const cands: Candidate[] = [];
  
  const profile = getDifficultyProfile(difficulty);
  const wPlayability = profile.w_playability;
  const wContext = CAGED_WEIGHTS.context;
  const wPrior = profile.w_prior;
  
  combos.forEach(combo => {
    const strings = combo.map(p => p.string);
    if (combo.length > 1 && new Set(strings).size !== combo.length) return;
    
    const play = groupPlayabilityCostCaged(combo, difficulty);
    if (!isFinite(play)) return;
    
    const priorCosts = combo.map((p, idx) => positionPriorCost(groupNotes[idx].midi, p));
    const priorAvg = priorCosts.reduce((a, b) => a + b, 0) / combo.length;
    
    const base = wPlayability * play + wContext * contextCost(groupNotes) + wPrior * priorAvg;
    cands.push(enrichCandidate({
      positions: combo,
      base_cost: base
    }));
  });
  
  if (cands.length === 0) {
    cands.push(greedy(100.0));
  }
  
  return cands.sort((a, b) => a.base_cost - b.base_cost).slice(0, maxCandidates);
}

export function assignCagedBox(
  rawNotes: { start: number; duration: number; midi: number; chord_label?: string; key_label?: string; orig_idx?: number }[],
  keyLabel: string | null,
  difficulty = 'expert',
  tuningName = 'standard',
  capo = 0,
  pins?: { [noteIdx: number]: [number, number] }
): AssignedNote[] {
  const tuningBase = TUNINGS[tuningName] || TUNINGS.standard;
  const tuning = tuningBase.map(midi => midi + capo);
  const lookup = buildFretboardLookup(tuning);
  
  const key = parseKey(keyLabel);
  const enrichedNotes = rawNotes.map(n => {
    const pc = Math.round(n.midi) % 12;
    const inKey = key ? key.scale_pcs.has(pc) : null;
    let inChord = null;
    if (n.chord_label) {
      const parsedChord = parseChordSymbol(n.chord_label);
      if (parsedChord) {
        inChord = parsedChord.tones.includes(pc);
      }
    }
    return {
      ...n,
      in_key: inKey,
      in_chord: inChord
    };
  });
  
  const groups = groupNotesByOnset(enrichedNotes);
  if (groups.length === 0) return [];
  
  const resolvedDifficulty = resolveDifficulty(difficulty);
  const voicingValid = intervalsMatchStandard(tuning);
  const allc = groups.map(g => {
    let cands = candidateGroupsVoiced(g, lookup, resolvedDifficulty, voicingValid);
    if (pins) {
      g.forEach((n, idxInGroup) => {
        const origIdx = n.orig_idx;
        if (origIdx !== undefined && pins[origIdx]) {
          const [targetString, targetFret] = pins[origIdx];
          const filtered = cands.filter(c => {
            const pos = c.positions[idxInGroup];
            return pos && pos.string === targetString && pos.fret === targetFret;
          });
          if (filtered.length > 0) {
            cands = filtered;
          }
        }
      });
    }
    return cands;
  });
  if (allc.some(c => c.length === 0)) {
    throw new Error('group with no candidates');
  }
  
  const isChord = groups.map(g => g.length >= 2);
  const anchors = boxAnchorsForKey(key);
  const A = anchors.length;
  const n = groups.length;
  
  const ec = Array.from({ length: n }, () => new Float64Array(A));
  const ecand = Array.from({ length: n }, () => new Int32Array(A));
  
  const profile = getDifficultyProfile(resolvedDifficulty);
  const wHandMove = profile.w_hand_move;
  const wBoxWindow = CAGED_WEIGHTS.box_window;
  const anchorThr = profile.anchor_threshold;
  const anchorCost = profile.anchor_cost;
  
  const SOLO_BOX_SCALE = 0.30;
  const SOLO_MOVE_SCALE = 0.35;
  
  for (let i = 0; i < n; i++) {
    const cands = allc[i];
    const kcScale = isChord[i] ? 1.0 : SOLO_BOX_SCALE;
    for (let j = 0; j < A; j++) {
      const anc = anchors[j];
      const a = anc.anchor;
      let best = Infinity;
      let bci = 0;
      
      let difficultyAnchorPenalty = 0.0;
      if (anchorThr !== null && a > anchorThr) {
        difficultyAnchorPenalty = anchorCost * (a - anchorThr);
      }
      
      for (let ci = 0; ci < cands.length; ci++) {
        const c = cands[ci];
        const tot = c.base_cost + wBoxWindow * candidateWindowCost(c, a);
        if (tot < best) {
          best = tot;
          bci = ci;
        }
      }
      ec[i][j] = best + kcScale * anc.key_cost + difficultyAnchorPenalty;
      ecand[i][j] = bci;
    }
  }
  
  const delta = Array.from({ length: A }, (_, i) => {
    return Array.from({ length: A }, (_, j) => Math.abs(anchors[i].anchor - anchors[j].anchor));
  });

  const baseTrans = Array.from({ length: A }, (_, i) => {
    return Array.from({ length: A }, (_, j) => {
      const d = delta[i][j];
      return wHandMove * Math.max(d - SHIFT_FREE, 0) + 0.5 * Math.pow(Math.max(d - LARGE_JUMP_THRESHOLD, 0), 2);
    });
  });
  
  const dp = Array.from({ length: n }, () => new Float64Array(A));
  const back = Array.from({ length: n }, () => new Int32Array(A));
  
  dp[0].set(ec[0]);
  back[0].fill(-1);
  
  for (let i = 1; i < n; i++) {
    const chordy = isChord[i] || isChord[i - 1];
    const transMultiplier = chordy ? 1.0 : SOLO_MOVE_SCALE;
    for (let j = 0; j < A; j++) {
      let best = Infinity;
      let bestIdx = 0;
      for (let prev = 0; prev < A; prev++) {
        const score = dp[i - 1][prev] + baseTrans[prev][j] * transMultiplier + ec[i][j];
        if (score < best) {
          best = score;
          bestIdx = prev;
        }
      }
      dp[i][j] = best;
      back[i][j] = bestIdx;
    }
  }
  
  let minVal = Infinity;
  let j = 0;
  for (let a = 0; a < A; a++) {
    if (dp[n - 1][a] < minVal) {
      minVal = dp[n - 1][a];
      j = a;
    }
  }
  
  const chosen: number[] = [j];
  for (let i = n - 1; i > 0; i--) {
    j = back[i][j];
    chosen.push(j);
  }
  chosen.reverse();
  
  const pred: AssignedNote[] = [];
  for (let i = 0; i < n; i++) {
    const g = groups[i];
    const cands = allc[i];
    const c = cands[ecand[i][chosen[i]]];
    for (let idx = 0; idx < g.length; idx++) {
      const note = g[idx];
      const p = c.positions[idx];
      pred.push({
        ...note,
        pred_string: p.string,
        pred_fret: p.fret,
        method: `caged_box_${resolvedDifficulty}`,
        anchor: anchors[chosen[i]].anchor
      });
    }
  }
  
  return pred.sort((a, b) => a.start !== b.start ? a.start - b.start : a.midi - b.midi);
}

const STRING_MAP: Record<number, string> = {
  0: 'string_6',
  1: 'string_5',
  2: 'string_4',
  3: 'string_3',
  4: 'string_2',
  5: 'string_1'
};

function createEmptyPositions(): Record<string, number | null> {
  return {
    string_1: null,
    string_2: null,
    string_3: null,
    string_4: null,
    string_5: null,
    string_6: null
  };
}

function buildSegmentsFromAssignedNotes(
  assigned: AssignedNote[],
  findChordForTime: (time: number) => string
): TabSegment[] {
  if (assigned.length === 0) return [];
  const TIME_TOLERANCE = 0.05;
  const tabSegments: TabSegment[] = [];
  let currentGroup: AssignedNote[] = [assigned[0]];

  for (let i = 1; i <= assigned.length; i++) {
    const note = assigned[i];
    if (note && (note.start - currentGroup[0].start < TIME_TOLERANCE)) {
      currentGroup.push(note);
    } else {
      const startTime = currentGroup[0].start;
      const endTime = startTime + Math.max(...currentGroup.map(n => n.duration));
      const positions = createEmptyPositions();
      
      currentGroup.forEach(n => {
        const sKey = STRING_MAP[n.pred_string];
        if (sKey) positions[sKey] = n.pred_fret;
      });

      const chordName = findChordForTime(startTime).replace(/:/g, '');

      tabSegments.push({
        time_start: Number(startTime.toFixed(3)),
        time_end: Number(endTime.toFixed(3)),
        suggested_chord: chordName,
        suggested_voicing: "",
        strumming_pattern: "",
        positions,
        fingering: {}
      });

      if (note) currentGroup = [note];
    }
  }

  return tabSegments;
}

export function processJamsWithDifficulty(
  rawJams: JamsData,
  difficulty = 'expert',
  tuning = 'standard',
  capo = 0
) {
  const keyAnno = rawJams.annotations?.find((a) => a.namespace === 'key_mode');
  const keySignature = keyAnno && keyAnno.data[0] ? String(keyAnno.data[0].value) : "Unknown Key";

  const chordAnno = rawJams.annotations?.find((a) => a.namespace === 'chord');
  const chords = chordAnno && Array.isArray(chordAnno.data) ? chordAnno.data : [];

  let tempoBpm = 120;
  const beatAnno = rawJams.annotations?.find((a) => a.namespace === 'beat_position');
  if (beatAnno && Array.isArray(beatAnno.data)) {
    const beatData = beatAnno.data;
    if (beatData.length > 1) {
      const avgDuration = (beatData[beatData.length - 1].time - beatData[0].time) / (beatData.length - 1);
      tempoBpm = Math.round(60 / avgDuration);
    }
  }

  const noteAnnos = rawJams.annotations?.filter((a) => a.namespace === 'note_midi') || [];
  const allNotes: { start: number; duration: number; midi: number; chord_label?: string }[] = [];

  function getChordAtTime(t: number, chordsList: JamsValue[]) {
    const found = chordsList.find((ch) => t >= ch.time && (t < (ch.time + ch.duration) || ch.duration === 0));
    return found ? String(found.value) : "";
  }

  noteAnnos.slice(0, 6).forEach((anno) => {
    const data = Array.isArray(anno.data) ? anno.data : [];
    data.forEach((obs) => {
      allNotes.push({
        start: obs.time,
        duration: obs.duration,
        midi: Number(obs.value),
        chord_label: getChordAtTime(obs.time, chords)
      });
    });
  });

  allNotes.sort((a, b) => a.start - b.start);

  if (allNotes.length === 0) {
    return {
      key_signature: keySignature,
      tempo_bpm: tempoBpm,
      tab_segments: [],
      notes: []
    };
  }

  const assigned = assignCagedBox(allNotes, keySignature, difficulty, tuning, capo);
  const tabSegments = buildSegmentsFromAssignedNotes(assigned, (t) => getChordAtTime(t, chords));

  const notesOut = assigned.map(n => ({
    start: Number(n.start.toFixed(3)),
    duration: Number(n.duration.toFixed(3)),
    midi: Math.round(n.midi),
    string: 6 - n.pred_string,
    fret: n.pred_fret
  }));

  return {
    key_signature: keySignature,
    tempo_bpm: tempoBpm,
    tab_segments: tabSegments,
    notes: notesOut
  };
}

export function recalculateTabFromNotes(
  rawNotes: { start: number; duration: number; midi: number }[],
  chords: { start: number; end: number; chord: string }[],
  keySignature: string,
  tempoBpm: number,
  difficulty = 'expert',
  tuning = 'standard',
  capo = 0,
  pins?: { [noteIdx: number]: [number, number] },
  deleteIndices?: number[]
) {
  const deleteSet = new Set(deleteIndices || []);
  const filteredNotes = rawNotes.filter((_, idx) => !deleteSet.has(idx));

  const notesWithChords = filteredNotes.map((n, filteredIdx) => {
    const found = chords.find(c => n.start >= c.start && n.start < c.end);
    return {
      ...n,
      chord_label: found ? found.chord : "",
      orig_idx: filteredIdx
    };
  });

  let assigned = assignCagedBox(notesWithChords, keySignature, difficulty, tuning, capo, pins);

  if (pins && Object.keys(pins).length > 0) {
    assigned = assigned.map((n, idx) => {
      const pin = pins[idx];
      if (pin) {
        return {
          ...n,
          pred_string: pin[0],
          pred_fret: pin[1]
        };
      }
      return n;
    });
  }

  if (assigned.length === 0) {
    return {
      key_signature: keySignature,
      tempo_bpm: tempoBpm,
      tab_segments: [],
      notes: []
    };
  }

  const findChord = (t: number) => {
    const found = chords.find(c => t >= c.start && t < c.end);
    return found ? found.chord : "";
  };

  const tabSegments = buildSegmentsFromAssignedNotes(assigned, findChord);

  const notesOut = assigned.map(n => ({
    start: Number(n.start.toFixed(3)),
    duration: Number(n.duration.toFixed(3)),
    midi: Math.round(n.midi),
    string: 6 - n.pred_string,
    fret: n.pred_fret
  }));

  return {
    key_signature: keySignature,
    tempo_bpm: tempoBpm,
    tab_segments: tabSegments,
    notes: notesOut
  };
}
