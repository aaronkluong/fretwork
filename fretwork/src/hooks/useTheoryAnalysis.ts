import { useState, useCallback } from "react";

const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_NAMES = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

const CHORD_TEMPLATES: [number[], string][] = [
  [[0, 4, 7, 11], "maj7"],
  [[0, 4, 7, 10], "7"],
  [[0, 3, 7, 10], "m7"],
  [[0, 3, 6, 10], "m7b5"],
  [[0, 4, 7],     ""],
  [[0, 3, 7],     "m"],
  [[0, 3, 6],     "dim"],
  [[0, 4, 8],     "aug"],
  [[0, 5, 7],     "sus4"],
  [[0, 2, 7],     "sus2"],
];

/** Identify the best chord name from a set of MIDI pitch classes. */
export function inferChordFromMidi(midiNotes: number[]): string {
  if (midiNotes.length === 0) return "";
  const pcs = Array.from(new Set(midiNotes.map(m => ((m % 12) + 12) % 12))).sort((a, b) => a - b);
  if (pcs.length < 2) return NOTE_NAMES[pcs[0]];

  let bestRoot = pcs[0];
  let bestSuffix = "";
  let bestScore = -1;

  for (const root of pcs) {
    const shifted = pcs.map(pc => ((pc - root + 12) % 12)).sort((a, b) => a - b);
    for (const [intervals, suffix] of CHORD_TEMPLATES) {
      const matches = intervals.filter(iv => shifted.includes(iv)).length;
      const score = matches / intervals.length;
      if (score > bestScore) {
        bestScore = score;
        bestRoot = root;
        bestSuffix = suffix;
      }
    }
  }

  const rootName = [1, 3, 6, 8, 10].includes(bestRoot) ? FLAT_NAMES[bestRoot] : NOTE_NAMES[bestRoot];
  return `${rootName}${bestSuffix}`;
}

export function useTheoryAnalysis() {
  const [autoDetectedKey, setAutoDetectedKey] = useState("Eb minor");
  const [userKeyOverride, setUserKeyOverride] = useState<string | null>(null);
  const detectedKey = userKeyOverride || autoDetectedKey;
  const isKeyOverridden = userKeyOverride !== null;
  const [detectedTempo, setDetectedTempo] = useState("129 BPM");
  const [detectedTempoBpm, setDetectedTempoBpm] = useState<number | null>(129);
  const [chordProgression, setChordProgression] = useState<string[]>([
    "Ebm7", "Ab7", "Dbmaj7", "Gbmaj7",
  ]);

  const setKeyOverride = useCallback((keyName: string | null) => {
    setUserKeyOverride(keyName);
  }, []);

  return {
    autoDetectedKey,
    setAutoDetectedKey,
    userKeyOverride,
    setUserKeyOverride,
    detectedKey,
    isKeyOverridden,
    setKeyOverride,
    detectedTempo,
    setDetectedTempo,
    detectedTempoBpm,
    setDetectedTempoBpm,
    chordProgression,
    setChordProgression,
  };
}
