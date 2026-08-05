# Technical specification: Fretboard algorithm

This document defines the mathematical models, ergonomic constraints, and scoring functions used to map MIDI events to playable guitar tablature.

## 1. Physical model and mapping
*   **Tuning (MIDI)**: E2:40, A2:45, D3:50, G3:55, B3:59, E4:64.
*   **Fret Calculation**: $Fret = MIDI - OpenValue$.
*   **Constraints**: 0 to 22 frets; 4-fret hand position window (BOX_WINDOW = 4).

## 2. Music theory and temporal logic
*   **Optimization**: Basic Pitch is tuned with an `amplitude_threshold` of **0.40** to minimize false positives, yielding a ~78.7% F1 score.
*   **Recode / Phantom Note Deletion**: Suppress phantom/low-confidence notes at the end of the transcription prediction stage using `backend/audio/recode.py`, validating note amplitudes against the `AMPLITUDE_THRESHOLD` (0.40).
*   **Chord Detection**: Primary chord recognition uses note-derived sliding-window chord templates (`detect_chords_from_basic_pitch_notes`), with `autochord` retained as an empirical fallback.
*   **Stem Separation**: Supports optional Demucs (`htdemucs_6s`) guitar stem isolation via `separate_stems=true` on `POST /transcribe` requests, caching stem outputs for multi-instrument mix processing.
*   **Segmentation**: Group note onsets within 35ms (`ONSET_TOLERANCE_SECONDS`) into tab segments.
*   **Voicings**: Reference standard CAGED and barre shapes via the `combined_all_tuned` candidate generator.

## 3. Optimization and scoring (Viterbi)
The system utilizes a global Viterbi optimization to identify the most playable sequence of positions across a track.

### 3.1 Cost categories
| Cost category | Rule |
| :--- | :--- |
| **Ergonomics** | Penalizes large hand shifts, string jumps, and awkward finger spans (capped at 7 frets). |
| **Musicality** | Biases the model toward open strings (Easy) or tight clusters (Advanced) via weight shaping. |
| **Empirical Prior** | $P(\text{string}, \text{fret} \mid \text{MIDI})$: Biases candidate selection toward common human fingerings learned from GuitarSet. |

### 3.2 Transition logic
To prevent the model from getting stuck in high neck positions (continuity lock-in), the scoring function transitions from pitch-dependent to position-dependent costs at a specific threshold.

---

## 4. Data schemas (JSON)

### 4.1 Input (Transcription to optimizer)
```json
{
  "metadata": { "detected_key": "Eb", "tempo_bpm": 129.0 },
  "chord_progression": [{ "time_start": 0.0, "time_end": 7.44, "chord": "Eb:min7" }],
  "note_events": [{ "time": 7.45, "duration": 0.46, "midi": 44 }]
}
```

### 4.2 Output (Backend API to UI)
The production API returns a unified JSON schema used by the frontend to drive both interactive and text-based visualizations.

```json
{
  "key_signature": "Eb minor",
  "key_confidence": 0.85,
  "tempo_bpm": 129.0,
  "tuning": "standard",
  "capo": 0,
  "difficulty": "expert",
  "chords": [
    { "time_start": 0.0, "time_end": 7.44, "chord": "Ebm7" }
  ],
  "tab_segments": [{
    "time_start": 0.0,
    "time_end": 7.44,
    "suggested_chord": "Ebm7",
    "positions": {
      "string_1": 6,
      "string_2": 7,
      "string_3": 6,
      "string_4": 8,
      "string_5": 6,
      "string_6": null
    }
  }],
  "notes": [{ "start": 0.0, "end": 7.44, "midi": 63, "string": 2, "fret": 7 }],
  "ascii_tab": "CAPO: 0 (Standard Tuning: E A D G B E)\n\ne|--6--\nB|--7--\nG|--6--\nD|--8--\nA|--6--\nE|-----",
  "variants": [
    {
      "label": "Open Position Bias",
      "tab_segments": [...],
      "notes": [...],
      "ascii_tab": "..."
    }
  ]
}
```

---

## 5. Algorithmic components

### 5.1 Transcription Model Architecture (Research Benchmark)
Recent research (Chieppa et al., 2025) suggests that adopting a **Conformer-based architecture** with self-attention can improve transcription over traditional CNN approaches.
*   **Key Techniques**:
    *   **Beat-informed Quantization**: Aligning framewise pitch estimates to musically meaningful note positions based on BPM.
    *   **Multi-task Learning**: Training on both frame-level and note-level predictions simultaneously.
*   **Improvement Area**: Future work should explore integrating automated BPM estimation to eliminate dependence on pre-existing tempo information.

### 5.2 Weight shaping & Difficulty profiles

The system supports customizable playability configurations (`beginner`, `intermediate`, `expert` / defaults to `expert`) implemented as `DIFFICULTY_PROFILES` in Python ([backend/fretboard/scoring.py](file:///C:/Users/kobby/Downloads/Grad/guitar_capstone/backend/fretboard/scoring.py)) and TypeScript ([fretwork/src/lib/caged/difficultyProfiles.ts](file:///C:/Users/kobby/Downloads/Grad/guitar_capstone/fretwork/src/lib/caged/difficultyProfiles.ts)).

#### Profile Parameter Mapping
| Parameter | Description | Expert | Intermediate | Beginner |
| :--- | :--- | :---: | :---: | :---: |
| **comfortable_span** | Standard chord shape span (frets) | `3` | `3` | `2` |
| **max_span** | Hard ceiling for chord finger span (frets) | `4` | `4` | `3` |
| **high_fret_threshold** | Fret index above which penalty applies | `None` | `7` | `5` |
| **high_fret_cost** | Penalty applied to notes above threshold | `0.0` | `3.5` | `6.0` |
| **barre_penalty** | Penalty for chord shapes requiring an index-finger barre | `0.0` | `3.0` | `10.0` |
| **w_playability** | Weight scaling factor for ergonomic movement costs | `0.80` | `1.20` | `1.50` |
| **w_prior** | Weight scaling factor for empirical GuitarSet position priors | `1.00` | `1.00` | `1.20` |
| **w_voicing** | Weight scaling factor for CAGED chord shape matches | `1.00` | `1.00` | `0.50` |
| **w_hand_move** | Weight scaling factor for hand shift/slide costs | `0.70` | `1.30` | `2.00` |
| **anchor_threshold** | Fret index where hand anchoring shifts to a new position | `None` | `7` | `5` |
| **anchor_cost** | Penalty applied to anchor shifts above threshold | `0.0` | `1.5` | `3.0` |

#### Resolution & Core Behavior
*   **Fallback**: If `difficulty` is `None`, empty, or not found in profiles, resolve to `expert` (after converting to lowercase and trimming spaces).
*   **Algorithmic Gating**: Shapes with span > `max_span` are discarded.
*   **Cost Reshaping**: Penalties (high frets, barre, hand transitions) shape the cost matrix dynamically during Viterbi path search.
*   **Empirical Audio Validation**: Evaluated on real audio files from GuitarSet (`FullGuitarSetData/AudioFiles`), confirming strict fret distribution ordering (`beginner <= intermediate <= expert`) across Jazz, Rock, Funk, and Singer-Songwriter tracks.


### 5.3 Alternate Tunings & Capo Logic
*   **Alternate Tunings Registry**:
    The system maps MIDI notes dynamically using the configuration registry:
    *   `standard` (E-A-D-G-B-E): `[40, 45, 50, 55, 59, 64]`
    *   `drop_d` (D-A-D-G-B-E): `[38, 45, 50, 55, 59, 64]`
    *   `drop_c` (C-G-C-F-A-D): `[36, 43, 48, 53, 57, 62]`
    *   `eb_standard` (Eb-Ab-Db-Gb-Bb-Eb): `[39, 44, 49, 54, 58, 63]`
    *   `dadgad` (D-A-D-G-A-D): `[38, 45, 50, 55, 57, 62]`
    *   `open_g` (D-G-D-G-B-D): `[38, 43, 50, 55, 59, 62]`
*   **Fret Calculation with Capo Offset**:
    Fret outputs are capo-relative (the capo acts as fret 0). Output frets are computed as:
    $$Fret = MIDI - OpenValue - CapoOffset$$
*   **Chord Voicing Gating (`_VOICING_VALID`)**:
    Standard CAGED voicing shape bonuses are valid only under uniform transpositions (Standard, Eb standard, standard capo offsets). If a selected tuning changes the relative inter-string intervals (e.g. `drop_d`, `drop_c`, `dadgad`, `open_g`), the optimizer gates the chord voicing bonus off (`_VOICING_VALID = False`). The system degrades gracefully, relying purely on playability geometry and positional costs.
*   **Concurrency & Thread-Safety**:
    Because the optimization engine mutates global open-string definitions, the context manager `fretboard_config(tuning, capo)` wraps the execution block under a thread lock (`_FRETBOARD_LOCK`) to prevent race conditions across parallel requests.
*   **Preferred Playing Position**: Adds an ergonomic cost bias to Viterbi paths that encourages clustering around the player's preferred neck region (e.g., frets 1–5 or 5–9).

### 5.4 LLM Refinement Layer & Anomaly Detection (Design Spec)
A planned post-processor for the end of the pipeline:
*   **Anomaly Detection**: Flags obvious mistakes like pitch hallucinations or physical finger stretches over 7 frets.
*   **LLM Tab Refinement**: Passes generated tabs to an LLM to align chord labels and clean formatting before returning data to the UI.
*   **Coaching Notes**: Generates short explanations for why the solver picked specific fingerings.

---

## 6. UI rendering
*   **Interactive HTML**: Renders CSS-grid fretboard diagrams with active-segment highlighting.
*   **Smart-Scaling ASCII**: Dynamic rendering via `src/lib/asciiGenerator.ts`, allowing tab width scaling (4, 8, 12 columns) based on viewport.

---

## 7. Test Architecture & Validation

The monorepo contains a unified test execution runner validating both the TypeScript frontend and Python backend algorithms.

### 7.1 Unified Test Command
Execute the full test suite using:
```bash
pnpm test
```
This script executes frontend tests and backend tests sequentially:
`pnpm test:frontend && pnpm test:backend`

### 7.2 Backend Python Tests (pytest)
*   **Command**: `pnpm test:backend`
*   **Location**: [backend/tests/](file:///C:/Users/kobby/Downloads/Grad/guitar_capstone/backend/tests)
*   **Total Tests**: 35 passing checks across 6 test files (`test_api_endpoints.py`, `test_difficulty.py`, `test_pinned_decoding.py`, `test_pipeline_integration.py`, `test_theory_config.py`, `test_tuning_capo.py`).
*   **Coverage Goals**: Targets 100% logic coverage on Viterbi pathfinder configurations, baseline pipeline integration gates, pinned decoding solvers, alternate tunings, and difficulty profiles.

### 7.3 Frontend Web Tests (Vitest)
*   **Command**: `pnpm test:frontend`
*   **Configuration**: Powered by Vitest with `@vitest/coverage-v8` tracking code path utilization.
*   **Total Tests**: 40 passing checks across 5 test files (`jamsProcessor.test.ts`, `theoryConfig.test.ts`, `alphaTex.test.ts`, `cagedAssignment.test.ts`, `musicTheory.test.ts`).
*   **Validation**: Tests client-side parser mechanisms, music theory utilities, CAGED assignment algorithms, and single source of truth theory configuration parameters.
