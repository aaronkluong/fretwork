import { TUNINGS, MAX_FRET } from "./theoryConfig";

export { TUNINGS, MAX_FRET };

export type {
  DifficultyLevel,
  DifficultyProfile,
} from "./caged/difficultyProfiles";

export {
  CAGED_WEIGHTS,
  DIFFICULTY_PROFILES,
  resolveDifficulty,
  getDifficultyProfile,
} from "./caged/difficultyProfiles";

export type {
  CagedNote,
  Position,
  Candidate,
  VoicingShape,
} from "./caged/cagedHelpers";

export {
  NOTE_TO_PC,
  normalizeQuality,
  chordTones,
  parseChordSymbol,
  parseKey,
  buildFretboardLookup,
  getPossiblePositions,
  estimateHandPositionFromFrets,
  groupSpan,
  awkwardFingeringPenalty,
  groupPlayabilityCostCaged,
  voicingBonus,
} from "./caged/cagedHelpers";

export type {
  AssignedNote,
  JamsValue,
  JamsAnnotation,
  JamsData,
} from "./caged/viterbiSolver";

export {
  assignCagedBox,
  processJamsWithDifficulty,
  recalculateTabFromNotes,
} from "./caged/viterbiSolver";
