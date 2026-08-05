# Data Assets, Schemas & Evaluation: Fretwork

This document details Fretwork's dataset inventory, access protocols, version control boundaries, ground-truth data models, and evaluation benchmarking suites.

---

## 1. Datasets & Storage Registry

To keep the repository fast and lightweight, raw audio files and transient outputs are gitignored, while source code, model weights, unit tests, and research notebooks are committed in Git.

| Asset | Description | Ground Truth | Scale | Git Status | Retrieval / Access Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GuitarSet** | Gold standard studio recordings used for baseline unit testing and fretboard cost function calibration. | JAMS (Hexaphonic) | 360 tracks (3+ hrs) | **Local** *(Gitignored)* | Download annotations & WAVs from [GuitarSet](https://guitarset.weebly.com/). |
| **GAPS** | Classical guitar performances used for zero-shot out-of-distribution (OOD) transcription & position generalization. | Aligned MIDI & MusicXML | 300 tracks (~14 hrs) | **Local** *(Gitignored)* | Inline download command:<br/>`python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='xavriley/GAPS', repo_type='dataset', local_dir='./GAPS_dataset')"` |
| **DadaGP** | Tokenized GuitarPro dataset used to pre-train our 1M-parameter `TabTransformer` neural prior and distill transition probabilities. | Tokenized GuitarPro | 26,181 songs | **External** *(Restricted)* | Zenodo dataset. Request access via [dada-bots/dadaGP](https://github.com/dada-bots/dadaGP) or [ISMIR 2021 Paper](https://archives.ismir.net/ismir2021/paper/000076.pdf). *(Note: Distilled priors committed in `backend/models/`)*. |
| **GM Dataset** | Recorded guitar audio across diverse genres and mobile phone recording conditions for real-world sanity checks. | Labeled Audio | 12+ minutes | **Local** *(Gitignored)* | Internal phone recording test set. |
| **Model Weights** | Neural network weights (`tab_transformer_final.pt`) and position priors for offline inference. | Neural Checkpoints | 1M parameters | **Tracked** | Committed in `backend/models/` and `backend/xgboost_backup/`. |
| **Notebooks** | Research, exploration, evaluation, and benchmark notebooks. | Jupyter `.ipynb` | 57+ notebooks | **Tracked** | Committed in `jupyter_notebooks/`. |
| **Run Outputs** | Benchmark JSON reports and generated evaluation ASCII tabs. | Benchmark JSON/TXT | Variable | **Local** *(Gitignored)* | Generated locally in `outputs/` when executing notebooks. |

---

## 2. Data Contract & Evaluation Protocol

### Normalized `JamsNote` Data Contract
Raw ground-truth annotations (JAMS format) and transcribed audio events are normalized into a unified `JamsNote` data contract shared across Python (`backend/processors/jams_processor.py`) and TypeScript (`fretwork/src/lib/jamsProcessor.ts`):

```typescript
export interface JamsNote {
  time: number;     // Onset time in seconds
  duration: number; // Note duration in seconds
  midi: number;     // MIDI pitch number (28-88 for guitar)
  string: number;   // Fretboard string index 0-5 (0 = Low E, 5 = High E)
}
```

### Benchmark Evaluation Protocol (35 ms Matching Window)
To evaluate fretboard pathfinding accuracy independently of audio transcription errors (false positives and false negatives), evaluation harnesses align predicted notes with ground-truth notes within a **35 ms onset window**. Fretboard position accuracy measures the percentage of correctly assigned string and fret positions on these matched note events.

---

## 3. Jupyter Notebooks Inventory

This catalog lists the Jupyter notebooks used for research and algorithm development.

- **AlgoToASCII.ipynb**: End-to-end pipelines and evaluation
  - This notebook converts JAMS annotations into structured JSON and ASCII tablature. It is the primary tool for synchronizing notes across the six guitar strings for final output.

- **AlgoWBasicPitch.ipynb**: End-to-end pipelines and evaluation
  - Integrates the core Viterbi fretboard assignment algorithm with Spotify's Basic Pitch raw transcription outputs.

- **Algorithm_with_Comparison.ipynb**: Fretboard assignment and algorithms
  - This compares different ways to map MIDI notes to strings and frets. It benchmarks the team's original logic against newer Viterbi-based models to find the most accurate approach.

- **audio_to_ascii_caged.ipynb**: End-to-end pipelines and evaluation
  - Early prototyping of audio-to-ASCII tab generation specifically constrained within standard CAGED chord-shape regions.

- **audio_to_tab_eval.ipynb**: End-to-end pipelines and evaluation
  - Evaluates the transcription accuracy and formatting consistency of end-to-end audio-to-tab pipeline outputs against annotated benchmarks.

- **audio_to_tab_eval_with_ascii.ipynb**: End-to-end pipelines and evaluation
  - Evaluates end-to-end transcription metrics specifically assessing how pipeline variations affect readability and layout of the generated ASCII tablature staff.

- **AudioToTabCAGED.ipynb**: End-to-end pipelines and evaluation
  - This is a self-contained test that takes raw audio and turns it into a CAGED-based tab. It calculates the final accuracy for the entire process, from pitch detection to string assignment.

- **basic_pitch_note_capture_experiments.ipynb**: Audio analysis and feature extraction
  - This isolates the **Audio → Basic Pitch → MIDI** stage and evaluates it against GuitarSet ground truth. It explores various pre/post-processing strategies (amplitude thresholds, onset/frame tuning, filtering) to optimize note capture F1 scores.

- **basic_pitch_note_capture_experiments_v2.ipynb**: Audio analysis and feature extraction
  - An iteration of the note capture experiments adding more refined filtering and benchmarking against previous best variants.

- **basic_pitch_note_capture_experiments_v3.ipynb**: Audio analysis and feature extraction
  - The latest iteration of the note capture experiments, introducing advanced techniques like two-pass detection, onset-cluster pruning, and adaptive thresholds.

- **BasicPitch.ipynb**: Audio analysis and feature extraction
  - This sets up Spotify's Basic Pitch library for MIDI transcription. It processes audio files to extract the timing and pitch of every note detected.

- **ChordDetection.ipynb**: Audio analysis and feature extraction
  - This extracts chord names from audio using the autochord library. These results help the fretboard algorithms make better choices by providing harmonic context.

- **combined_caged_v2.ipynb**: Fretboard assignment and algorithms
  - This combines hand-position windows with second-order priors. It uses leave-one-out cross-validation to see if this hybrid approach is better than the existing benchmarks.

- **detection_diagnostics.ipynb**: Audio analysis and feature extraction
  - Diagnostic utility for debugging transcription discrepancies, visualizing onset timing errors, and inspecting pitch contour localization.

- **eval_pipeline.ipynb**: End-to-end pipelines and evaluation
  - This calculates the overall accuracy of the transcription system. It multiplies the note detection F1 score by the fretboard assignment accuracy to get a final pipeline estimate.

- **fret_algo_combined.ipynb**: Fretboard assignment and algorithms
  - This is an older comparison of the original and playability-aware assignment methods. It was used as a baseline before the newer tuning notebooks were developed.

- **fret_algo_combined_tuned_heldout_LATEST.ipynb**: Fretboard assignment and algorithms
  - This notebook tests the best fretboard assignment model on a held-out data set. It provides the final benchmarks for the "combined_all_tuned" method.

- **fret_algo_combined_tuned_v2_experiments.ipynb**: Fretboard assignment and algorithms
  - This notebook adds a second-order position prior to the assignment logic. It also runs a wide search for the best weights to use in the model.

- **fret_algo_w_play_rules.ipynb**: Fretboard assignment and algorithms
  - This adds physical rules to the assignment logic, such as how far a hand can comfortably stretch. It penalizes positions that would be awkward or impossible for a real player.

- **fretboard_algorithm.ipynb**: Fretboard assignment and algorithms
  - This defines the guitar's layout and MIDI lookup tables. It is the foundation for all other string and fret assignment logic in the project.

- **GuitarSet.ipynb**: Data processing and exploration
  - This is used to explore the GuitarSet dataset. It contains the code needed to read and visualize the raw JAMS files and their annotations.

- **JamsNormalization.ipynb**: Data processing and exploration
  - This cleans and aligns JAMS files from different sources. It ensures that notes, chords, and beats are all synchronized to the same timeline.

- **KeyDetection.ipynb**: Audio analysis and feature extraction
  - This is an earlier experiment with key detection logic. It uses simple template matching to guess the musical key from audio files.

- **KeyDetection_structured.ipynb**: Audio analysis and feature extraction
  - This identifies the musical key of a song using its chromagram. It compares the energy of the audio against major and minor templates to find a match.

- **added_difficulty.ipynb**: End-to-end pipelines and evaluation
  - Self-contained held-out evaluation notebook. Runs the full pipeline (audio → Basic Pitch → Viterbi → ASCII tab) under `beginner`, `intermediate`, and `expert` difficulty modes, computing F1/accuracy metrics against GuitarSet ground truth for each mode. Includes a TF_USE_LEGACY_KERAS compatibility fix injected as the first cell.

- **output_difficulty.ipynb**: End-to-end pipelines and evaluation
  - Add-on evaluation notebook for comparing fretboard outputs across difficulty levels. Used to validate that the Difficulty Match Stage applies the correct simplification rules per profile.

- **fret_assignment_error_analysis.ipynb**: Fretboard assignment and algorithms
  - Deep-dive error diagnostic on fretboard assignment failures. Identifies systematic misassignments by string, fret region, and note density.

- **transition_weight_tuning.ipynb**: Fretboard assignment and algorithms
  - Systematic grid search over Viterbi transition weights (hand-shift, string-jump, finger-span costs) to identify the optimal weight set for the combined_all_tuned model.

- **playability_metric.ipynb**: Fretboard assignment and algorithms
  - Defines and computes quantitative playability metrics (average fret jump, span violations, duplicate-string penalty) to benchmark algorithm outputs independently of transcription accuracy.

- **bp_finetune_guitarset.ipynb**: Audio analysis and feature extraction
  - Experiments with fine-tuning the Basic Pitch model on GuitarSet audio to reduce domain mismatch and improve transcription F1 on guitar-specific recordings.

- **bp_finetune_lopo_cv.ipynb**: Audio analysis and feature extraction
  - Leave-one-player-out cross-validation for Basic Pitch fine-tuning experiments, measuring generalization across recording sessions.

- **bp_finetune_pipeline_eval.ipynb**: Audio analysis and feature extraction
  - Evaluates the fine-tuned Basic Pitch checkpoint against the baseline within the full fretboard assignment pipeline to measure end-to-end improvement.

- **bp_onset_threshold_sweep.ipynb**: Audio analysis and feature extraction
  - Systematic sweep of Basic Pitch amplitude and onset thresholds across all 40+ tested variants. This is the primary notebook that established the final `amplitude_threshold=0.40` setting yielding ~78.7% F1.

- **bp_tta_experiment.ipynb**: Audio analysis and feature extraction
  - Test-time augmentation experiments for Basic Pitch: pitch-shifting and tempo-stretching the input audio to ensemble predictions and reduce transcription variance.

- **guitarset_audio_to_midi_finetune_v1.ipynb**: Audio analysis and feature extraction
  - First-generation fine-tuning pipeline connecting GuitarSet hexaphonic MIDI ground truth to Basic Pitch model checkpoints for supervised adaptation.

- **finetune_basic_pitch_guitar.ipynb**: Audio analysis and feature extraction
  - Cleaned and parameterized version of the Basic Pitch guitar fine-tuning workflow. Replaces the v1 pipeline as the canonical fine-tune script.

- **kong_finetune_guitar.ipynb**: Audio analysis and feature extraction
  - Experiments with the Kong/PANNS model architecture as an alternative transcription backbone to Basic Pitch for guitar-specific audio.

- **fretwork_debug_caged_voiced.ipynb**: Fretboard assignment and algorithms
  - Diagnostic notebook for debugging the CAGED chord-voicing bonus in the Viterbi cost function. Inspects voicing gate behavior across standard vs. alternate tunings.

- **AudioToTabCAGEDVoice.ipynb**: End-to-end pipelines and evaluation
  - End-to-end pipeline with CAGED voicing-aware candidate generation. Extends AudioToTabCAGED.ipynb with voiced chord shape constraints.

- **AudioToTabCAGEDVoice_tuned_basic_pitch.ipynb**: End-to-end pipelines and evaluation
  - Audio-to-tab pipeline using both CAGED voicing constraints and the tuned Basic Pitch amplitude threshold, representing the most refined pre-Viterbi pipeline variant.

- **AudioToTab_VariantEval_v1.ipynb**: End-to-end pipelines and evaluation
  - Held-out evaluation harness comparing multiple Viterbi variants, proximity transition costs, hand-window stretch costs, and register filter toggles (`+regfilter`), including support for personal recordings evaluation.

- **AudioToTab_VariantEval_v2.ipynb**: End-to-end pipelines and evaluation
  - An updated iteration of the variant evaluation and benchmark harness.

- **fretwork_generalization.ipynb**: Fretboard assignment and algorithms
  - **Canonical research harness** for the Transformer Position Prior strategy in [`model.md`](./model.md). Local-first paths (not Colab-only). Loads `tab_transformer_final.pt` by default (`RUN_TRAIN=False`); optional retrain from `dadagp_distilled/`. Head-to-head: production `combined_all_tuned` (GuitarSet empirical prior + Viterbi) vs research beam decoder (width 8, hybrid unigram + transformer NLL). GuitarSet **oracle** assignment eval (JAMS pitches, no Basic Pitch). GAPS section is skip-safe when scores are missing. Writes summaries to `outputs/fretwork_generalization/`.

- **fretwork_debug_caged_voiced_llm_repair.ipynb**: Fretboard assignment and algorithms
  - Diagnostic notebook combining CAGED voicing cost debugging with early experiments in strict, conservative post-assignment string/fret repair rules.

- **fretwork_llm_note_repair.ipynb**: Audio analysis and feature extraction
  - Implements an LLM note-event repair layer upstream of fretboard assignment, using heuristic nomination and LLM adjudication to prune phantom notes and correct octave errors.

- **fretwork_llm_note_repair_v2.ipynb**: Audio analysis and feature extraction
  - Second iteration of the upstream LLM note-event repair pipeline.

- **fretwork_tuning_capo_position (1).ipynb**: Fretboard assignment and algorithms
  - Extends the core assignment pipeline to handle alternate tunings (Drop D, DADGAD, etc.), capo transpositions, and soft preferred playing position anchors.

- **Fretwork_Transformer_test.ipynb**: Fretboard assignment and algorithms
  - Prototyping and evaluation notebook testing Transformer-based sequence models for fretboard position assignment.

- **Fretwork_Transformer_test_With_Recode_Feature.ipynb**: Fretboard assignment and algorithms
  - Extends Transformer position assignment tests with dynamic recode features to refine candidate note string/fret selection.

- **Transformer_Position_Prior.ipynb**: Fretboard assignment and algorithms
  - Research notebook evaluating sequence-based Transformer priors for modeling fretboard transition probability distributions.

- **fretwork_generalization_test.ipynb**: Fretboard assignment and algorithms
  - Generalization test suite evaluating Transformer model performance across out-of-domain dataset splits.

- **fretwork_generalization_test_v2.ipynb**: Fretboard assignment and algorithms
  - Second iteration of the generalization test harness with expanded metric tracking and beam search evaluation.

- **July21.ipynb**: End-to-end pipelines and evaluation
  - Integration workspace consolidating recent audio-to-tab pipeline benchmarks, model updates, and diagnostic experiments.

- **ml_end_to_end.ipynb**: End-to-end pipelines and evaluation
  - End-to-end machine learning pipeline harness evaluating transcription and fretboard assignment integration.

- **ml_explore.ipynb**: Data processing and exploration
  - Exploratory data analysis and feature extraction notebook for dataset inspection and preliminary model experimentation.

- **unified_evaluation.ipynb**: End-to-end pipelines and evaluation
  - Consolidated evaluation harness computing transcription F1, fretboard assignment accuracy, and playability metrics across all active pipeline variants.


