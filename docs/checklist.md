# Fretwork: Execution & Context Tracker

## Summary of Completed Milestones

* **Backend-Connected Jazz Demo Pipeline**: Hooked up `/api/transcribe` and `/process-jams` backend pipeline with dynamic Viterbi solver and candidate variant generation, full parameter sync, and 20s AbortController timeout fallback.
* **Working-State Sync (Theory / Params / Versions / Notations)**: Standardized `commitWorkingState` baseline references, pitch-preserving re-fingering helpers, version head patch metadata, and TheoryPanel position refresh sync.
* **Persistent Recalculated Version & Parameter Updates**: Synchronized recalculation results to working baseline references, enabled dynamic parameter tuning and capo offsets, and added 16 measures per line ASCII scaling.
* **Difficulty System Refinement & Differentiation**: Refined difficulty profile cost penalties (high fret, barre penalties) and threshold caps across Python and TypeScript dual-stack engines, ensuring distinct fingerings for beginner, intermediate, and expert.
* **Audio File Evaluation & Difficulty Tuning Refinement**: Created automated evaluation script (`backend/scripts/evaluate_audio_difficulty.py`) and verified strict fret/position distribution ordering across Jazz, Rock, Funk, and Singer-Songwriter datasets.
* **Refactor God Components**: Decomposed `useAnalysis.ts` state management and isolated timer/audio lifecycle refs; optimized typed array matrix allocations (`Float64Array`, `Int32Array`) in `viterbiSolver.ts`.
* **Revert Version Dropdown Click-to-Toggle & Persistence Fix**: Updated `TabOutputHeader.tsx` so clicking "Revert Version" toggles and auto-expands version history dropdown without hover-dismissal, persisting until explicitly toggled.
* **Theory Panel Empty State Prompt Repositioning & Spacing Refinement**: Relocated the empty state prompt above the skeleton cards in `TheoryPanel.tsx`, preserved original styling, and replaced forced vertical stretching (`justify-between`) with clean compact `gap-3` spacing.
* **TabOutput Header Action Relocation & ASCII Floating View Restoration**: Moved Recalculate Tab and Revert Version buttons back up to top header beside view mode selectors, and stripped outer card frame container from `AsciiTabView` so it floats naturally.
* **Theory Context Panel Space Optimization**: Refactored `TheoryPanel.tsx` layout to use full-height flex column distribution (`h-full flex-1 justify-between gap-3.5`), eliminating bottom card squishing and expanding context cards evenly across the panel height.
* **Recalculation Toolbar Animations, Realignment & Persistent Disabled Control States**: Re-aligned recalculation & version history actions to the left group and ASCII measure selectors alongside Copy/Download buttons to the right group in `TabOutputHeader.tsx`. Placed the Listen Along audio player above the recalculation toolbar row with hover-open/close and click-to-pin version dropdown interactions.
* **ASCII Tab Monospace Alignment & Rounded Styling**: Fixed cell character width alignment in `AsciiTabView.tsx` by eliminating inline padding shifts, guaranteeing 100% strict vertical column alignment (`|`) across all 6 strings while maintaining soft `rounded-sm` highlights for hovered, pinned (amber), and active notes.
* **Dynamic Row & Divider Visibility Scoping**: Refactored conditional logic in `TabOutputHeader.tsx` so containers and dividers render only when their respective feature sections are active.
* **Fix `POST /api/pinned` Proxy Route & Route Registration**: Verified Next.js App Router route handlers at `fretwork/src/app/api/pinned/route.ts` and `fretwork/src/app/api/transcribe/pinned/route.ts`, ensuring route registration parity for `/api/pinned`.
* **Real Backend Pinned Re-Decode Integration & Note Correction**: Connected recalculation workflows to `/api/pinned` proxy routes, updated note pitches upon edits, and built fallback solvers for demo modes.
* **Notebook Recalculation & Pinning Fix (`July21.ipynb`)**: Fixed phrase-wide fret shifts in `assign_transformer_pinned` caused by hand-center gravity inertia pulling unpinned notes towards pinned frets.
* **Recalculation Engine, Pinning, Notation View Fix & Versioning**: Implemented note edit string override deduplication, version history stack with "Revert Version" dropdown selector in `TabOutputHeader.tsx`, audio playback sync highlighting in `AsciiTabView.tsx`, and AlphaTab note-click stability fixes.
* **Viterbi Solver & UseAnalysis Targeted Refactor**: Refactored `viterbiSolver.ts` to pre-allocate typed arrays, modularized candidate pin checks, extracted hook utilities in `useAnalysis.ts`, and verified monorepo build stability.
* **Modular Hook State & Core Decomposition**: Decomposed `cagedAssignment.ts` into modular packages (`caged/difficultyProfiles.ts`, `caged/cagedHelpers.ts`, `caged/viterbiSolver.ts`) and extracted hook state management (`useTabVersions.ts`, `useTheoryAnalysis.ts`).
* **UI Design Refinement & Simplification**: Streamlined UI aesthetics by removing full-card pulse animations in `TheoryPanel.tsx`, replacing them with subtle translucent placeholders, de-cluttering headers and badges in `AsciiTabView.tsx` and `TabOutput.tsx`, and verifying full monorepo build stability.
* **Evaluation & Competitive Analysis**: Benchmark metrics against Songscription & LLM approaches, benchmarked MT3 multi-instrument model against Basic Pitch, executed cross-genre dataset testing across Jazz, Rock, and Classical held-out datasets.
* **Fretwork Note Repair & Position Priors Benchmark**: Comprehensive evaluation of 13 pipeline configurations across 5 architectural approaches on GuitarSet & GAPS datasets.
* **Out-of-Distribution (OOD) GAPS Benchmark**: Benchmark complete on >300 classical guitar tracks (>14 hrs audio) under zero-shot Mode B, demonstrating 61.40% exact tab position accuracy with `TabTransformer` priors.
* **Upstream ML Note Repair Classifiers (Approach 5)**: Trained and benchmarked XGBoost, Random Forest, MLP, and Sequence Transformer classifiers on an 8-feature representation with 35 ms window note alignment.
* **Backend Pipeline Realignment**: Realigned production backend with Upstream Heuristics + Causal TabTransformer Position Prior (`prox_viterbi_transformer`), using W=2.0, k=8 beam search.
* **Difficulty Profile Single Source of Truth**: Restored and froze difficulty configurations in `docs/difficulty.md` and `config/theory_config.json`, maintaining strict dual-stack parity between Python (`scoring.py`) and TypeScript (`cagedAssignment.ts`).
* **Jazz Demo Overhaul & Parameter Alignment**: Updated "Load Jazz Demo" workflow to bind a public audio sample (`jazz_demo.wav`), generate candidate position variants, pass active UI tuning/capo/difficulty parameters, and sync cleanly with TheoryPanel.
* **Monorepo Build & Test Verification**: Established master test command `pnpm test` enforcing 100% pass rates across Vitest frontend checks and Pytest backend checks.
* **Frontend-Backend API Connection**: Connected Cloudflare-hosted Next.js frontend to FastAPI backend endpoints (`/transcribe`, `/process-jams`, `/transcribe/pinned`).
* **Tab Version UI Input Restoration & Hydration**: Aligned UI input controls (difficulty level, tuning, capo, key signature) to match snapshot parameters upon reverting tab versions, ensuring 100% parameter sync without redundant recalculations.
* **Alternate Tunings & Capo Support (Full Stack)**: Integrated user-selectable alternate tunings (Drop D, Drop C, DADGAD, Eb standard, Open G) and capo offsets (0–11) into Viterbi pathfinder and `/transcribe` API.
* **Hybrid-Cloud Architecture Implementation**: Deployed Next.js frontend on Cloudflare Pages and FastAPI backend services on AWS ECS Fargate behind an ALB.

---

## Active Roadmap: To-Do Items

### Phase 1: Production Readiness, Security & Performance
- [ ] **Response & Audio Caching Infrastructure**: Implement client-side LRU/SWR audio & transcription caching and Redis/in-memory backend caching for `/transcribe` and `/api/pinned` to avoid redundant ML inference and Viterbi matrix calculations.
- [ ] **Production Build Optimization & Bundle Splitting**: Optimize Next.js asset bundles, dynamic imports for heavy components (e.g. `alphaTab`, MIDI synthed player), and asset compression on Cloudflare Pages / AWS ECS.
- [ ] **Rate Limiting & API Security Shielding**: Implement request rate limiting, payload validation, CORS lockdowns, and API token headers on AWS ALB and FastAPI endpoints to prevent abuse.
- [ ] **Application Error Boundaries & Graceful Degradation**: Add React error boundaries around complex UI panels (`AsciiTabView`, `AlphaTabPlayer`, `TheoryPanel`) to catch render faults without crashing the app.
- [ ] **Structured Logging & Production Telemetry**: Integrate structured JSON application logs, health check endpoints (`/healthz`), and client/server telemetry for transcription latency and error tracing.
- [ ] **Production Infrastructure & Deployment Verification**: Containerize and test production Docker builds, configure environment variable validation, and run full staging load tests prior to production release.

### Phase 2: Synthetic Data Augmentation & Ground-Truth Expansion
- [ ] **Synthetic Alternate Fingering Ground-Truth Generator**: Build a data generator that takes existing MIDI/tab tracks (GuitarSet/GAPS) and produces valid alternative fretboard fingerings as additional ground-truth samples (e.g. using Viterbi with varying difficulty/position cost profiles).
- [ ] **External Tablature Dataset Scraper & Ingestion**: Scrape and parse open-source GuitarPro/DadaGP dataset repositories and online MusicXML/MIDI archives to expand baseline string/fret training volume beyond GuitarSet and GAPS.
- [ ] **DDSP/FluidSynth Audio Synthesis Pipeline**: Pair MIDI/tab sequence datasets with realistic physical guitar audio synths (DDSP guitar model, high-quality SoundFonts via FluidSynth) to generate paired synthetic audio + exact tab ground truth.
- [ ] **Randomized Pitch/Capo/Tuning Data Augmentations**: Apply programmatic pitch-shifting, capo shifts, alternate tuning transpositions, and noise/reverb IR augmentations to existing audio-tab pairs to simulate diverse recording environments.
- [ ] **Synthetic Data Model Retraining & Ablation Study**: Retrain the sequence transformer model and ML adjudication classifiers (Approach 5) on the expanded synthetic dataset, evaluating Exact Tab F1 gains on real held-out datasets (GuitarSet/GAPS).

### Phase 3: Capstone Final Presentation & Feedback
- [ ] **Create Draft of Final Presentation** *(Canal)*: Build the capstone presentation deck. Must include:
  - Side-by-side examples of **good vs. bad tab output**
  - Clear explanation of the **difference between accuracy scores** (e.g., pitch accuracy vs. fingering position accuracy)
  - Dedicated **comparison slide(s) vs. LLMs / Songscription**
  - Architecture overview of the Fretwork pipeline end-to-end
- [ ] **Conduct UI Testing & Collect User Feedback**: Perform validation sessions to evaluate output playability and UX quality.
- [ ] **Submit Peer Review**: Present final deliverables for channel peer review.

### Phase 4: Frontend Test Architecture Upgrades
- [ ] **State Hook Isolation Tests**: Build unit tests for `useAnalysis.ts` mocking fetch routes to verify transition sequences from audio load to completed analysis.
- [ ] **ResizeObserver Mocking & Tab Scaling Tests**: Validate the layout-scaling behavior of the responsive ASCII render engine by mocking `ResizeObserver` events inside Vitest.
- [ ] **API Mocking & Edge Case Assertions**: Mock the AWS backend responses (for `/transcribe` and `/process-jams`) to test frontend recovery during 500 exceptions and network timeouts.
