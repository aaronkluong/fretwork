import { describe, it, expect } from "vitest";
import { buildAlphaTexFromNotes, keyLabelToAlphaTexKs, segmentsToQuarterNoteEvents } from "./alphaTex";
import { TabSegment } from "@/types/tab";

describe("alphaTex generation & key conversion", () => {
  it("converts key signatures correctly to alphaTex ks directives", () => {
    expect(keyLabelToAlphaTexKs("Eb minor")).toBe("ebminor");
    expect(keyLabelToAlphaTexKs("C major")).toBe("cmajor");
    expect(keyLabelToAlphaTexKs("F# minor")).toBe("f#minor");
    expect(keyLabelToAlphaTexKs("InvalidKey")).toBe(null);
  });

  it("builds alphaTex from note events correctly", () => {
    const notes = [
      { start: 0, duration: 0.5, midi: 60, string: 5, fret: 3 },
      { start: 0.5, duration: 0.5, midi: 62, string: 4, fret: 0 },
    ];
    const tex = buildAlphaTexFromNotes(notes, { tempoBpm: 120, keyLabel: "C major" });
    expect(tex).toContain("\\tempo 120");
    expect(tex).toContain("\\ks cmajor");
    expect(tex).toContain("3.5");
    expect(tex).toContain("0.4");
  });

  it("expands tab segments into quarter note events aligned with segment timing", () => {
    const mockSegments: TabSegment[] = [
      {
        time_start: 0,
        time_end: 1.86,
        positions: { string_1: 3, string_2: 1, string_3: 0, string_4: null, string_5: null, string_6: null },
      },
      {
        time_start: 1.86,
        time_end: 3.72,
        positions: { string_1: null, string_2: null, string_3: 2, string_4: 3, string_5: null, string_6: null },
      },
    ];
    const events = segmentsToQuarterNoteEvents(mockSegments, 4);
    expect(events.length).toBe(20); // (3 notes + 2 notes) * 4 subdivisions = 20 note events
    expect(events[0].start).toBe(0);
    expect(events[events.length - 1].start).toBeGreaterThan(1.86);
  });
});

