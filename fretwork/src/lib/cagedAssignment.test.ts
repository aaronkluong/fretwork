import { describe, it, expect } from "vitest";
import { parseKey, recalculateTabFromNotes } from "./cagedAssignment";

describe("cagedAssignment key signature handling", () => {
  it("should parse major and minor key strings correctly", () => {
    const key1 = parseKey("C major");
    expect(key1?.root_pc).toBe(0);
    expect(key1?.mode).toBe("major");
    expect(key1?.scale_pcs.has(0)).toBe(true);

    const key2 = parseKey("Eb minor");
    expect(key2?.root_pc).toBe(3);
    expect(key2?.mode).toBe("minor");

    const key3 = parseKey("F# minor");
    expect(key3?.root_pc).toBe(6);
    expect(key3?.mode).toBe("minor");
  });

  it("should recalculate tab assignment under different key signature overrides", () => {
    const rawNotes = [
      { start: 0, duration: 1.0, midi: 60 }, // C4
      { start: 1, duration: 1.0, midi: 64 }, // E4
      { start: 2, duration: 1.0, midi: 67 }, // G4
    ];
    const chords = [
      { start: 0, end: 3, chord: "C" }
    ];

    const tabCMajor = recalculateTabFromNotes(rawNotes, chords, "C major", 120, "expert", "standard", 0);
    expect(tabCMajor.key_signature).toBe("C major");
    expect(tabCMajor.tab_segments.length).toBeGreaterThan(0);

    const tabFSharpMinor = recalculateTabFromNotes(rawNotes, chords, "F# minor", 120, "expert", "standard", 0);
    expect(tabFSharpMinor.key_signature).toBe("F# minor");
    expect(tabFSharpMinor.tab_segments.length).toBeGreaterThan(0);
  });
});
