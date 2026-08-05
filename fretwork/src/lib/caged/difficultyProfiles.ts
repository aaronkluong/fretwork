import {
  COMFORTABLE_CHORD_SPAN,
  MAX_CHORD_SPAN,
} from "../theoryConfig";

export const CAGED_WEIGHTS = {
  'playability': 0.80,
  'context': 0.30,
  'box_window': 1.00,
  'hand_move': 0.70,
  'position_prior': 1.00,
  'voicing': 1.0
};

export type DifficultyLevel = 'beginner' | 'intermediate' | 'expert';

export type DifficultyProfile = {
  comfortable_span: number;
  max_span: number;
  high_fret_threshold: number | null;
  high_fret_cost: number;
  barre_penalty: number;
  w_playability: number;
  w_prior: number;
  w_voicing: number;
  w_hand_move: number;
  anchor_threshold: number | null;
  anchor_cost: number;
};

export const DIFFICULTY_PROFILES: Record<DifficultyLevel, DifficultyProfile> = {
  expert: {
    comfortable_span: COMFORTABLE_CHORD_SPAN,
    max_span: MAX_CHORD_SPAN,
    high_fret_threshold: null,
    high_fret_cost: 0.0,
    barre_penalty: 0.0,
    w_playability: CAGED_WEIGHTS.playability,
    w_prior: CAGED_WEIGHTS.position_prior,
    w_voicing: CAGED_WEIGHTS.voicing,
    w_hand_move: CAGED_WEIGHTS.hand_move,
    anchor_threshold: null,
    anchor_cost: 0.0,
  },
  beginner: {
    comfortable_span: 2,
    max_span: 3,
    high_fret_threshold: 5,
    high_fret_cost: 6.0,
    barre_penalty: 10.0,
    w_playability: 1.5,
    w_prior: 1.2,
    w_voicing: 0.5,
    w_hand_move: 2.0,
    anchor_threshold: 5,
    anchor_cost: 3.0,
  },
  intermediate: {
    comfortable_span: COMFORTABLE_CHORD_SPAN,
    max_span: MAX_CHORD_SPAN,
    high_fret_threshold: 7,
    high_fret_cost: 3.5,
    barre_penalty: 3.0,
    w_playability: 1.2,
    w_prior: CAGED_WEIGHTS.position_prior,
    w_voicing: CAGED_WEIGHTS.voicing,
    w_hand_move: 1.3,
    anchor_threshold: 7,
    anchor_cost: 1.5,
  },
};

export function resolveDifficulty(difficulty?: string | null): DifficultyLevel {
  if (!difficulty) return 'expert';
  const key = String(difficulty).trim().toLowerCase();
  if (key === 'beginner' || key === 'intermediate' || key === 'expert') return key;
  return 'expert';
}

export function getDifficultyProfile(difficulty?: string | null): DifficultyProfile {
  return DIFFICULTY_PROFILES[resolveDifficulty(difficulty)];
}
