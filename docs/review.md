# Project Governance & Review

## Executive Summary: Resolved Milestones
A consolidated record of all major project achievements.

*   **Hybrid-Cloud Architecture**: Finalized split-deployment (Next.js/Cloudflare + FastAPI/AWS ECS Fargate).
*   **Viterbi Pathfinder**: Tuned core fretboard algorithm achieving 68.84% accuracy.
*   **Music Intelligence API Gateway**: High-performance FastAPI gateway for transcription, JAMS processing, and pinned re-decoding (`POST /transcribe`, `POST /process-jams`, `POST /transcribe/pinned`, `GET /health`), mirrored via Next.js proxy route handlers (`/api/pinned`, `/api/transcribe/pinned`, `/api/process-jams`).
*   **Unauthenticated API Gateway (Proof of Concept)**: Standardized FastAPI endpoints in `backend/endpoints/` running in unauthenticated mode for direct proof-of-concept demonstration and integration testing.
*   **UI/UX & Tab Engine**: Theme-aware interactive interface with "Smart Scaling" ASCII rendering, AlphaTab score synchronization, and React Portal edit modals.
*   **Empirical Position Priors**: Activated learned models from GuitarSet and 1M DadaGP-trained `TabTransformer` NLL priors in production.
*   **Modular Frontend**: Refactored complex page logic into hooks (`useAnalysis`, `useAudioRecording`, `useToasts`).
*   **Alternate Tunings & Capo**: Verified and integrated into Viterbi pathfinder and `/transcribe` API (25/25 invariance assertions passing). Drop D, Drop C, DADGAD, Eb standard, Open G, and capo offsets 0–11 fully supported.
*   **Difficulty Match Stage**: `beginner`, `intermediate`, and `expert` profiles integrated into the Viterbi pathfinder and wired through `app.py`; evaluated via `output_difficulty.ipynb` and `added_difficulty.ipynb`.
*   **Basic Pitch TF Compatibility Fix**: `TF_USE_LEGACY_KERAS=1` + `tf-keras` injection added as first cell in `added_difficulty.ipynb` and configured in production `Dockerfile`.
*   **Recode & Phantom Note Deletion**: Ported the recode/phantom note filter from experimental notebooks directly into the canonical backend pipeline (`backend/audio/recode.py`), suppressing low-confidence/amplitude note events.
*   **Difficulty Profiles & Centralized Theory SSOT**: Consolidated theory bounds and difficulty profiles into a single source of truth (`config/theory_config.json`, [fretwork/src/lib/theoryConfig.ts](file:///C:/Users/kobby/Downloads/Grad/guitar_capstone/fretwork/src/lib/theoryConfig.ts)), securing dual-stack parity between Python and TypeScript.
*   **Multi-Fingering Variant Generation**: Integrated transformer position prior anchored beam search into backend `app.py`, returning alternative candidate fingering arrangements in the `variants` API schema.
*   **Modular Enterprise Backend Package Architecture**: Reorganized `backend/` into modular packages (`backend/audio/`, `backend/fretboard/`, `backend/models/`, `backend/processors/`, `backend/endpoints/`, `backend/services/`, `backend/tests/`).
*   **Audio Stem Separation Integration**: Added Demucs (`htdemucs_6s`) guitar stem isolation via `backend/audio/stem_separation.py` with local caching and `separate_stems: bool = False` pipeline parameter.
*   **Automated AWS Deployment Pipelines**: Created cross-platform deployment automation scripts (`backend/scripts/deploy_aws.sh`, `backend/scripts/deploy_aws.ps1`) for building, tagging, and pushing ECR images and deploying ECS task definitions.
*   **Centralized Theory Configuration**: Centralized tuning and fret limits into `config/theory_config.json` and mirrored in `fretwork/src/lib/theoryConfig.ts`.
*   **Basic Pitch TF 2.16+ / Keras 3 Compatibility**: Resolved via `TF_USE_LEGACY_KERAS=1` environment variable and `tf-keras` package injection.
*   **3-Tier Resilient Demo Pipeline & Dynamic JAMS Gateway**: Connected "Load Demo" (`useAnalysis.ts`) to backend `/api/transcribe` with public Jazz audio (`demo.mp3`), bound by a 20-second `AbortController` timeout that falls back to `/api/process-jams` with Jazz ground-truth annotations (`demo.jams`) (<100ms response) and a 3rd-tier client-side Viterbi solver fallback. Upgraded `POST /process-jams` and `process_jams_annotation` to accept dynamic `tuning`, `capo`, and `difficulty` parameters and return fingering variants (`variants_out`).
*   **Persistent Baseline & Recalculation Sync**: Standardized `commitWorkingState` baseline references, pitch-preserving re-fingering helpers, version head patch metadata, and TheoryPanel position refresh sync across difficulty, tuning, capo, and note edit changes.
*   **Dynamic Parameter Re-Derivation & 16-Measure ASCII View**: Updated parameter change handlers to re-derive string/fret combinations relative to the active version's note positions under new tuning, capo, and difficulty settings, accompanied by 16 measures per line ASCII auto-scaling.
*   **Transcription Denoising Validation**: Evaluated 40+ variants and finalized Basic Pitch amplitude threshold at 0.40 for 78.7% F1 score.
*   **Difficulty Calibration & Audio Evaluation**: Fine-tuned `beginner`, `intermediate`, and `expert` cost profiles (`high_fret_threshold`, `barre_penalty`, `high_fret_cost`, hand movement weights) in dual-stack (`backend/fretboard/scoring.py` and `fretwork/src/lib/caged/difficultyProfiles.ts`); validated across real audio files from GuitarSet (`FullGuitarSetData/AudioFiles`) demonstrating strict fret distribution ordering (`beginner <= intermediate <= expert`).
*   **Pipeline Integration Test Gate**: Monorepo test suite enforces 100% pass rates across 40 Vitest frontend tests and 35 Pytest backend checks, including explicit baseline pipeline integration tests (`backend/tests/test_pipeline_integration.py`) and difficulty differentiation assertions (`backend/tests/test_difficulty.py`).
*   **Tab Version Snapshot UI Input Hydration**: Implemented bidirectional parameter hydration in `useTabVersions` and `useAnalysis` so reverting to any saved version snapshot updates top-level UI controls (`difficulty`, `tuning`, `capo`, `keySignature`) into alignment with restored positions without triggering redundant recalculation calls.
*   **Humanized User Toast Notification Suite**: Refined user toast messaging across recording, audio ingestion, JAMS annotation processing, tab version switching, tab exports, and solver fallbacks to be concise, natural, and free of AI slop.

---

## Technical Review & Governance Tracker
Consolidated record of unresolved complexities, risks, and pending technical evaluations.

| ID | Category | Item / Gap | Description / Impact | Status | Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| G-01 | **Security** | Unauthenticated Gateway (PoC) | API key middleware removed for local & PoC evaluation | PoC / Open | Re-introduce middleware or API Gateway authorization key checks prior to public production launch. |
| G-02 | **Performance** | Inference Latency Benchmarking | Sub-5s turnaround for 60s audio on cloud hardware unmeasured | Pending | Benchmark Basic Pitch and TabTransformer beam search ($k=8$) on AWS ECS Fargate hardware. |
| G-04 | **Intelligence** | LLM Refinement Layer | Difficulty weight-shaping integrated; LLM post-processing (@Aaron Luong) unimplemented | Active (Phase 4) | Implement LLM tab clean-up and coaching text generation layer. |
| G-05 | **Transcription** | Output Variance (CPU) | CPU inference cause subtle note onset jitter | Open | Implement TF/PyTorch determinism pins and onset quantization. |
| G-06 | **Theory** | Missing Expressive Support | No explicit support for bends, slides, or vibrato in Viterbi cost | Open | Extend Viterbi cost functions and tab schemas to support articulation metadata. |
| G-08 | **Research** | Audio-to-MIDI Performance | Current F1 (0.787) trails SOTA (0.84) | Open | Evaluate fine-tuned Basic Pitch checkpoints (`bp_finetune_guitarset.ipynb`) and Conformer-based transcription backbones. |
| G-09 | **Research** | Dataset Scarcity | GuitarSet (3hr) lacks diversity for generalized performance | Open | Implement synthetic alternate fingering data generation and audio synthesis (DDSP/FluidSynth). |
| E-01 | **Infrastructure** | Client & Backend Caching | Redundant ML inference on duplicate audio & pin requests | Pending | Implement and validate SWR/LRU client caching and Redis backend response cache. |
| E-02 | **Reliability** | API Load & Stress Testing | Concurrency handling under high user transcription traffic | Pending | Execute load tests against AWS ALB and FastAPI container endpoints. |
| E-03 | **Frontend UX** | Cross-Browser Verification | AlphaTab rendering and Web Audio context playback consistency | Pending | Conduct cross-browser UI testing sessions and capture user playability feedback. |
