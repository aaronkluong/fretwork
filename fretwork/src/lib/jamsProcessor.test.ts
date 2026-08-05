import { describe, it, expect } from "vitest";
import { processJams, JamsRaw } from "./jamsProcessor";

describe("jamsProcessor", () => {
  it("should correctly process key signature and tempo from JAMS format", () => {
    const rawJams: JamsRaw = {
      annotations: [
        {
          namespace: "key_mode",
          data: [{ time: 0, duration: 0, value: "C major" }],
        },
        {
          namespace: "beat_position",
          data: [
            { time: 0.0, duration: 0.5, value: 1 },
            { time: 0.5, duration: 0.5, value: 2 },
            { time: 1.0, duration: 0.5, value: 3 },
          ],
        },
        {
          namespace: "note_midi",
          data: [
            { time: 0.0, duration: 1.0, value: 60 },
          ],
        },
      ],
    };

    const result = processJams(rawJams);
    expect(result.key_signature).toBe("C major");
    expect(result.tempo_bpm).toBe(120);
    expect(result.tab_segments.length).toBe(1);
    expect(result.tab_segments[0].suggested_chord).toBe("");
  });
});
