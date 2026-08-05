// fretwork/src/lib/__tests__/musicTheory.test.ts
import { describe, it, expect } from "vitest";
import {
  deriveScale,
  getKeyInfo,
  getChordFunction,
  getModeName,
  parseChordSymbol,
} from "@/lib/musicTheory";

// ---------------------------------------------------------------------------
// deriveScale
// ---------------------------------------------------------------------------

describe("deriveScale", () => {
  it("derives C major scale correctly", () => {
    // C = pc 0; major scale: C D E F G A B
    expect(deriveScale(0, "major")).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it("derives Eb minor scale correctly", () => {
    // Eb = pc 3; natural minor: Eb F Gb Ab Bb Cb Db
    expect(deriveScale(3, "minor")).toEqual([3, 5, 6, 8, 10, 11, 1]);
  });

  it("derives G major scale correctly", () => {
    // G=7; G A B C D E F#
    expect(deriveScale(7, "major")).toEqual([7, 9, 11, 0, 2, 4, 6]);
  });

  it("derives A minor scale correctly", () => {
    // A=9; A B C D E F G
    expect(deriveScale(9, "minor")).toEqual([9, 11, 0, 2, 4, 5, 7]);
  });
});

// ---------------------------------------------------------------------------
// getKeyInfo
// ---------------------------------------------------------------------------

describe("getKeyInfo", () => {
  it("returns correct key info for Eb minor", () => {
    const info = getKeyInfo("Eb minor");
    expect(info).not.toBeNull();
    expect(info!.root).toBe("Eb");
    expect(info!.mode).toBe("minor");
    expect(info!.scalePcs).toEqual(deriveScale(3, "minor"));
    expect(info!.diatonicChords).toHaveLength(7);
  });

  it("returns correct key info for G major", () => {
    const info = getKeyInfo("G major");
    expect(info).not.toBeNull();
    expect(info!.mode).toBe("major");
    expect(info!.scalePcs).toEqual(deriveScale(7, "major"));
  });

  it("returns null for unknown key", () => {
    expect(getKeyInfo("Q# diminished")).toBeNull();
  });

  it("handles null/undefined gracefully", () => {
    expect(getKeyInfo(null)).toBeNull();
    expect(getKeyInfo(undefined)).toBeNull();
  });

  it("is case-insensitive for known keys", () => {
    const info = getKeyInfo("eb minor");
    expect(info).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseChordSymbol
// ---------------------------------------------------------------------------

describe("parseChordSymbol", () => {
  it("parses simple major chord", () => {
    const parsed = parseChordSymbol("C");
    expect(parsed).not.toBeNull();
    expect(parsed!.root).toBe("C");
    // Bare chord symbol → quality is "" which maps to major intervals in CHORD_INTERVALS
    expect(parsed!.tones).toEqual([0, 4, 7]); // C E G
  });

  it("parses minor chord", () => {
    const parsed = parseChordSymbol("Am");
    expect(parsed!.root).toBe("A");
    expect(parsed!.quality).toBe("min");
  });

  it("parses m7 chord", () => {
    const parsed = parseChordSymbol("Ebm7");
    expect(parsed!.root).toBe("Eb");
    expect(parsed!.quality).toBe("m7");
  });

  it("parses colon-format chord (e.g. from JAMS)", () => {
    const parsed = parseChordSymbol("G:maj");
    expect(parsed!.root).toBe("G");
    expect(parsed!.quality).toBe("maj");
  });

  it("ignores slash bass", () => {
    const parsed = parseChordSymbol("G/B");
    expect(parsed!.root).toBe("G");
  });

  it("returns null for null/empty", () => {
    expect(parseChordSymbol(null)).toBeNull();
    expect(parseChordSymbol("N")).toBeNull();
    expect(parseChordSymbol("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getChordFunction — core tests validating Roman numeral annotation
// ---------------------------------------------------------------------------

describe("getChordFunction", () => {
  // Demo data: Eb minor key with Ebm7 Ab7 Dbmaj7 Gbmaj7 progression
  it("identifies i7 in Eb minor", () => {
    const result = getChordFunction("Ebm7", "Eb minor");
    expect(result).not.toBeNull();
    expect(result!.roman).toBe("i7");
    expect(result!.isDiatonic).toBe(true);
  });

  it("identifies IV7 (Ab7) in Eb minor — dominant 7 stays uppercase", () => {
    // Eb natural minor: Eb F Gb Ab Bb Cb Db
    // Ab is degree 4 (idx 3) → iv in quality, but "7" is dominant → uppercase IV7
    const result = getChordFunction("Ab7", "Eb minor");
    expect(result).not.toBeNull();
    expect(result!.roman).toBe("IV7"); // dominant 7 = uppercase
    expect(result!.isDiatonic).toBe(true);
    expect(result!.degree).toBe(3);
  });

  it("identifies VIImaj7 (Dbmaj7) in Eb minor — diatonic 7th degree", () => {
    // Eb natural minor: Eb F Gb Ab Bb Cb Db — Db IS degree 7 (idx 6)
    // Quality maj7 → major quality → uppercase numeral
    const result = getChordFunction("Dbmaj7", "Eb minor");
    expect(result).not.toBeNull();
    expect(result!.roman).toBe("VIImaj7");
    expect(result!.isDiatonic).toBe(true);
    expect(result!.degree).toBe(6);
  });

  it("identifies I in C major", () => {
    const result = getChordFunction("C", "C major");
    expect(result).not.toBeNull();
    expect(result!.roman).toBe("I");
    expect(result!.isDiatonic).toBe(true);
    expect(result!.degree).toBe(0);
  });

  it("identifies vi in C major (Am)", () => {
    const result = getChordFunction("Am", "C major");
    expect(result!.roman).toBe("vi");
    expect(result!.isDiatonic).toBe(true);
    expect(result!.degree).toBe(5);
  });

  it("identifies V in G major (D chord is the 5th degree)", () => {
    // G major: G A B C D E F# — D is idx 4 → ROMAN_NUMERALS[4] = 'V'
    const result = getChordFunction("D", "G major");
    expect(result!.roman).toBe("V");
    expect(result!.degree).toBe(4);
    expect(result!.isDiatonic).toBe(true);
  });

  it("returns null for null chord or key", () => {
    expect(getChordFunction(null, "C major")).toBeNull();
    expect(getChordFunction("Am", null)).toBeNull();
    expect(getChordFunction(null, null)).toBeNull();
  });

  it("handles chromatic chord gracefully", () => {
    const result = getChordFunction("F#", "C major");
    // F# is not in C major scale; may return chromatic or a borrowed chord
    expect(result).not.toBeNull();
    // Should not throw; roman should be defined
    expect(typeof result!.roman).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// getModeName
// ---------------------------------------------------------------------------

describe("getModeName", () => {
  it("returns Ionian for major keys", () => {
    expect(getModeName("C major")).toBe("Ionian");
    expect(getModeName("G major")).toBe("Ionian");
    expect(getModeName("Bb major")).toBe("Ionian");
  });

  it("returns Aeolian for minor keys", () => {
    expect(getModeName("A minor")).toBe("Aeolian");
    expect(getModeName("Eb minor")).toBe("Aeolian");
  });

  it("returns null for unknown key", () => {
    expect(getModeName("Q# diminished")).toBeNull();
    expect(getModeName(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Python parity checks — validate TS produces same scale PCs as theory.py
// Known expected values computed from the Python implementation.
// ---------------------------------------------------------------------------

describe("Python parity — scale derivation", () => {
  const cases: Array<[string, "major" | "minor", number[]]> = [
    ["C", "major",  [0, 2, 4, 5, 7, 9, 11]],
    ["A", "minor",  [9, 11, 0, 2, 4, 5, 7]],
    ["G", "major",  [7, 9, 11, 0, 2, 4, 6]],
    ["D", "minor",  [2, 4, 5, 7, 9, 10, 0]],
    ["F", "major",  [5, 7, 9, 10, 0, 2, 4]],
    ["Bb", "major", [10, 0, 2, 3, 5, 7, 9]],
  ];

  cases.forEach(([rootName, mode, expected]) => {
    it(`${rootName} ${mode} matches Python output`, () => {
      // Map root name to pc manually for test isolation
      const rootPcMap: Record<string, number> = {
        C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
        "C#": 1, "D#": 3, "F#": 6, "G#": 8, "A#": 10,
        Db: 1, Eb: 3, Gb: 6, Ab: 8, Bb: 10,
      };
      const pc = rootPcMap[rootName];
      expect(deriveScale(pc, mode)).toEqual(expected);
    });
  });
});
