import { describe, it, expect } from "vitest";
import {
  THEORY_CONFIG,
  MAX_FRET,
  STANDARD_TUNING,
  STRING_NAMES,
  TUNINGS,
  COMFORTABLE_SPAN,
  MAX_REACHABLE_SPAN,
} from "@/lib/theoryConfig";

describe("Theory Configuration Single Source of Truth", () => {
  it("should expose valid guitar theory constants from JSON config", () => {
    expect(MAX_FRET).toBe(24);
    expect(STANDARD_TUNING).toEqual([40, 45, 50, 55, 59, 64]);
    expect(STRING_NAMES).toEqual(["low_E", "A", "D", "G", "B", "high_E"]);
    expect(TUNINGS.standard).toEqual([40, 45, 50, 55, 59, 64]);
    expect(TUNINGS.drop_d).toEqual([38, 45, 50, 55, 59, 64]);
    expect(COMFORTABLE_SPAN).toBe(5);
    expect(MAX_REACHABLE_SPAN).toBe(7);
  });

  it("should maintain object structure parity with THEORY_CONFIG", () => {
    expect(THEORY_CONFIG.max_fret).toBe(24);
    expect(Object.keys(THEORY_CONFIG.tunings)).toContain("drop_c");
    expect(Object.keys(THEORY_CONFIG.tunings)).toContain("eb_standard");
    expect(Object.keys(THEORY_CONFIG.tunings)).toContain("dadgad");
    expect(Object.keys(THEORY_CONFIG.tunings)).toContain("open_g");
  });
});
