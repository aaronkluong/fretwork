import { describe, it, expect } from "vitest";
import { recalculateTabFromNotes } from "@/lib/cagedAssignment";
import {
  segmentsToRawNotes,
  buildWorkingBaseline,
  midiPitchMultiset,
  fretsFromSegments,
  remapPinForTuning,
  extractChordProgression,
  computePlayabilityScore,
  formatAppliedSetup,
  labelForNotes,
} from "@/lib/workingTabState";
import { TabSegment } from "@/types/tab";

function makeSeg(
  t0: number,
  t1: number,
  positions: Record<string, number | null>,
  chord = "C",
  pinned?: Record<string, boolean>
): TabSegment {
  return {
    time_start: t0,
    time_end: t1,
    suggested_chord: chord,
    positions: {
      string_1: null,
      string_2: null,
      string_3: null,
      string_4: null,
      string_5: null,
      string_6: null,
      ...positions,
    },
    pinned_positions: pinned,
  };
}

describe("workingTabState pitch-preserving baseline", () => {
  it("segmentsToRawNotes derives MIDI from open strings + frets", () => {
    // Standard tuning low E (string_6) open = 40, fret 3 = 43
    const segs = [makeSeg(0, 1, { string_6: 3 })];
    const notes = segmentsToRawNotes(segs, "standard", 0);
    expect(notes).toHaveLength(1);
    expect(notes[0].midi).toBe(43);
  });

  it("capo raises open-string pitch for the same fret", () => {
    const segs = [makeSeg(0, 1, { string_6: 0 })];
    const noCapo = segmentsToRawNotes(segs, "standard", 0);
    const capo2 = segmentsToRawNotes(segs, "standard", 2);
    expect(capo2[0].midi - noCapo[0].midi).toBe(2);
  });

  it("buildWorkingBaseline preserves pitch multiset across difficulty re-finger", () => {
    const rawNotes = [
      { start: 0, duration: 0.5, midi: 60 },
      { start: 0.5, duration: 0.5, midi: 64 },
      { start: 1.0, duration: 0.5, midi: 67 },
      { start: 1.5, duration: 0.5, midi: 72 },
    ];
    const chords = [{ start: 0, end: 2, chord: "C" }];

    const expert = recalculateTabFromNotes(rawNotes, chords, "C major", 120, "expert", "standard", 0);
    const baseline = buildWorkingBaseline(
      expert.tab_segments,
      "standard",
      0,
      "standard",
      0
    );

    expect(midiPitchMultiset(baseline.notes)).toEqual(midiPitchMultiset(rawNotes));

    const beginner = recalculateTabFromNotes(
      baseline.notes,
      baseline.chords,
      "C major",
      120,
      "beginner",
      "standard",
      0
    );

    // Pitches preserved after difficulty change
    const beginnerPitches = segmentsToRawNotes(beginner.tab_segments, "standard", 0);
    expect(midiPitchMultiset(beginnerPitches)).toEqual(midiPitchMultiset(rawNotes));
  });

  it("recalc-then-difficulty applies new profile to post-recalc frets (not original-only)", () => {
    const rawNotes = [
      { start: 0, duration: 0.4, midi: 55 },
      { start: 0.4, duration: 0.4, midi: 59 },
      { start: 0.8, duration: 0.4, midi: 62 },
      { start: 1.2, duration: 0.4, midi: 67 },
      { start: 1.6, duration: 0.4, midi: 71 },
    ];
    const chords = [{ start: 0, end: 2.5, chord: "G" }];

    // Simulate first "recalculate" under expert
    const v1 = recalculateTabFromNotes(rawNotes, chords, "G major", 120, "expert", "standard", 0);
    const fretsV1 = fretsFromSegments(v1.tab_segments);

    // Param change: build baseline FROM v1 frets, re-finger as beginner
    const baseline = buildWorkingBaseline(v1.tab_segments, "standard", 0, "standard", 0);
    const v2 = recalculateTabFromNotes(
      baseline.notes,
      baseline.chords,
      "G major",
      120,
      "beginner",
      "standard",
      0
    );
    const fretsV2 = fretsFromSegments(v2.tab_segments);

    // Pitches must match what v1 implied
    const pitchesFromV1 = midiPitchMultiset(segmentsToRawNotes(v1.tab_segments, "standard", 0));
    const pitchesFromV2 = midiPitchMultiset(segmentsToRawNotes(v2.tab_segments, "standard", 0));
    expect(pitchesFromV2).toEqual(pitchesFromV1);

    // Working path used post-recalc baseline (non-empty frets)
    expect(fretsV1.length).toBeGreaterThan(0);
    expect(fretsV2.length).toBeGreaterThan(0);
  });

  it("remapPinForTuning keeps pitch when capo changes", () => {
    // Standard string_6 open 40 + fret 5 = 45
    const remapped = remapPinForTuning(45, 0, "standard", 2);
    expect(remapped).not.toBeNull();
    // under capo 2, open is 42, fret should be 3 for pitch 45
    expect(remapped![0]).toBe(0);
    expect(remapped![1]).toBe(3);
  });

  it("buildWorkingBaseline remaps pins under new capo without rewriting pitch", () => {
    const segs = [
      makeSeg(0, 1, { string_6: 5 }, "E", { string_6: true }),
    ];
    const baseline = buildWorkingBaseline(segs, "standard", 0, "standard", 2);
    expect(baseline.notes[0].midi).toBe(45); // pitch preserved
    expect(baseline.pinCount).toBe(1);
    const pin = Object.values(baseline.pins)[0];
    expect(pin[1]).toBe(3); // fretted position under capo 2
  });

  it("extractChordProgression de-duplicates in order", () => {
    const segs = [
      makeSeg(0, 1, { string_1: 0 }, "Ebm7"),
      makeSeg(1, 2, { string_1: 1 }, "Ab7"),
      makeSeg(2, 3, { string_1: 2 }, "Ebm7"),
    ];
    expect(extractChordProgression(segs)).toEqual(["Ebm7", "Ab7"]);
  });

  it("computePlayabilityScore and formatAppliedSetup are stable", () => {
    const segs = [
      makeSeg(0, 1, { string_6: 1, string_5: 3, string_4: 3 }),
    ];
    const score = computePlayabilityScore(segs, "beginner");
    expect(score).toBeGreaterThanOrEqual(65);
    expect(score).toBeLessThanOrEqual(98);
    expect(formatAppliedSetup({
      difficulty: "beginner",
      tuning: "drop_d",
      capo: 2,
      keySignature: "C major",
    })).toBe("beginner · drop d · capo 2");
  });

  it("labelForNotes reports open position for low frets", () => {
    expect(labelForNotes([{ fret: 0 }, { fret: 2 }, { fret: 3 }])).toBe("open position");
    expect(labelForNotes([{ fret: 7 }, { fret: 8 }, { fret: 9 }])).toMatch(/around fret/);
  });
});
