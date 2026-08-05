// fretwork/src/lib/theoryConfig.ts
// Single source of truth helper for centralized guitar theory configuration

import theoryConfig from "@/config/theory_config.json";

export interface TheoryConfig {
  max_fret: number;
  standard_tuning: number[];
  string_names: string[];
  string_display_labels: string[];
  tunings: Record<string, number[]>;
  ergonomics: {
    comfortable_span: number;
    max_reachable_span: number;
    large_jump_threshold: number;
    max_group_candidates: number;
    comfortable_chord_span: number;
    max_chord_span: number;
    onset_tolerance_seconds: number;
  };
  pitch_classes: {
    sharp_names: string[];
    midi_note_names: string[];
  };
}

export const THEORY_CONFIG: TheoryConfig = theoryConfig as TheoryConfig;

export const MAX_FRET = THEORY_CONFIG.max_fret;
export const STANDARD_TUNING = THEORY_CONFIG.standard_tuning;
export const STRING_NAMES = THEORY_CONFIG.string_names;
export const STRING_DISPLAY_LABELS = THEORY_CONFIG.string_display_labels;
export const TUNINGS: Record<string, number[]> = THEORY_CONFIG.tunings;

export const COMFORTABLE_SPAN = THEORY_CONFIG.ergonomics.comfortable_span;
export const MAX_REACHABLE_SPAN = THEORY_CONFIG.ergonomics.max_reachable_span;
export const LARGE_JUMP_THRESHOLD = THEORY_CONFIG.ergonomics.large_jump_threshold;
export const MAX_GROUP_CANDIDATES = THEORY_CONFIG.ergonomics.max_group_candidates;
export const COMFORTABLE_CHORD_SPAN = THEORY_CONFIG.ergonomics.comfortable_chord_span;
export const MAX_CHORD_SPAN = THEORY_CONFIG.ergonomics.max_chord_span;
export const ONSET_TOLERANCE_SECONDS = THEORY_CONFIG.ergonomics.onset_tolerance_seconds;

export const PITCH_CLASS_NAMES_SHARP = THEORY_CONFIG.pitch_classes.sharp_names;
export const MIDI_NOTE_NAMES = THEORY_CONFIG.pitch_classes.midi_note_names;

export default THEORY_CONFIG;
