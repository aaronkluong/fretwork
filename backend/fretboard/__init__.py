# backend/fretboard/__init__.py
# Modularized fretboard package re-exporting full public API and knowledge bases for 100% backward compatibility.

from . import config
from .config import (
    MAX_FRET,
    OPEN_STRING_MIDI,
    STRING_NAMES,
    ONSET_TOLERANCE_SECONDS,
    COMFORTABLE_SPAN,
    MAX_REACHABLE_SPAN,
    LARGE_JUMP_THRESHOLD,
    MAX_GROUP_CANDIDATES,
    STANDARD_TUNING,
    TUNINGS,
    POSITION_PRIOR_COSTS,
    build_fretboard,
    get_possible_positions,
    build_position_prior,
    build_and_load_position_prior,
    position_prior_cost,
    fretboard_config,
    tab_capo_header,
)

from .theory import (
    PITCH_CLASS_NAMES_SHARP,
    NOTE_TO_PC,
    PC_TO_NOTE,
    MAJOR_STEPS,
    MINOR_STEPS,
    MAJOR_QUALITIES,
    MINOR_QUALITIES,
    CHORD_INTERVALS,
    QUALITY_ALIASES,
    derive_scale,
    normalize_quality,
    chord_tones,
    parse_chord_symbol,
    infer_key_from_filename,
    get_key_info,
    chord_end_time,
    chord_at_time,
    enrich_notes_with_context,
)

from .scoring import (
    OLD_THEORY_WEIGHTS,
    DEFAULT_TUNED_WEIGHTS,
    CAGED_WEIGHTS,
    SOLO_MOVE_SCALE,
    SOLO_BOX_SCALE,
    DIFFICULTY_PROFILES,
    PENTATONIC,
    COMFORTABLE_CHORD_SPAN,
    MAX_CHORD_SPAN,
    BOX_WINDOW,
    SHIFT_FREE,
    BOX_CENTER_COST,
    BOX_OUTSIDE_COST,
    OPEN_OUT_OF_BOX_COST,
    BOX_OFFBOX_COST,
    BOX_NONHOME_COST,
    BOX_LOWNECK_COST,
    VOICING_SHAPES,
    resolve_difficulty,
    get_difficulty_profile,
    estimate_hand_position_from_frets,
    group_span,
    awkward_fingering_penalty,
    group_playability_cost,
    group_playability_cost_caged,
    transition_cost,
    context_cost,
    old_position_score,
    old_theory_group_cost,
    box_anchors_for_key,
    position_window_cost,
    candidate_window_cost,
    voicing_bonus,
)

from .algorithms import (
    group_notes_by_onset,
    enrich_candidate,
    candidate_groups_for_notes,
    candidate_groups_combined_all,
    candidate_groups_combined_all_tuned,
    candidate_groups_caged,
    candidate_groups_voiced,
    transition_cost_matrix,
    tuned_transition_cost_matrix,
    assign_combined_all,
    assign_combined_all_tuned_with_weights,
    assign_combined_all_tuned,
    assign_caged_voiced,
)

from .transformer import (
    TRANSFORMER_WEIGHT,
    BEAM_WIDTH,
    ANCHOR_PULL,
    MIN_DISTINCT_FRAC,
    DEFAULT_VARIANT_ANCHORS,
    assign_transformer_anchored,
    assign_prox_viterbi_transformer,
    assign_transformer_pinned,
    get_fingering_variants,
)

from .api import (
    _STRING_MAP,
    _prepare_enriched_notes,
    _predictions_to_output,
    assign_notes_to_fretboard,
    assign_notes_to_fretboard_pinned,
)


def __getattr__(name):
    if name in ("_VOICING_VALID", "_LOW_E_PC", "OPEN_STRING_MIDI", "MIDI_TO_POSITIONS", "POSITION_PRIOR_COSTS"):
        return getattr(config, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
