# Fretwork: AI-Powered Guitar Intelligence

## Overview
Fretwork is an open-source music intelligence platform that turns raw audio transcription into playable guitar tablature.

### The Problem
Existing AI music transcription tools like Songscription, Songsterr AI, and Klang.io produce note-level output, but they miss what guitarists actually need: musical context and notes mapped to playable positions on the fretboard. There is no open-source platform that combines key detection, chord analysis, and ergonomic fretboard optimization in one place.

### Our Solution
A web-based platform that takes any audio file and returns a unified analysis:
- Detected key and chord progression: automatic harmonic analysis.
- Theory-aware fret assignment: a Viterbi optimization algorithm that favors ergonomic hand positions and musical context.
- Interactive tablature: HTML-based tab rendering with ASCII export.

---

## Market Landscape

| Company Name | Product Overview | Primary Weakness |
| :--- | :--- | :--- |
| Songscription | Music transcription and notation | Selecting inefficient or impossible fret choices. |
| Songsterr AI | Tablature and playback | Fret positions often physically impossible. |
| Klang.io | Sheet music transcription | No guitar-specific ergonomic optimization. |

---

## Key Research Takeaways

### 1. The Playability Problem
Commercial tools lack guitar-specific ergonomic knowledge. A single note can be played in several places on the neck; naive models jump around without reason. Fretwork uses a cost-function optimization to keep hand movement small and positions playable.

### 2. Harmonic Context as a Prior
Fretwork treats notes in musical context. Librosa and Autochord detect the song's key and chord progression. That harmonic analysis acts as a prior for the fretboard algorithm, biasing positions toward what an experienced guitarist would actually play.

### 3. Modular Architecture
Fretwork combines off-the-shelf transcription models with a custom Viterbi-style pathfinder. For the data flow and pipeline components, see [System architecture](./architecture.md).

### 4. Empirical Evaluation Strategy
Validation uses GuitarSet (360 recordings with ground-truth fret and string annotations). We measure fret accuracy and playability against naive baselines.

### 5. Technical Maturity and Roadmap
Early experiments live in specialized notebooks (full detail in [Data assets and schemas](./data.md)):
* `KeyDetection_structured.ipynb` & `ChordDetection.ipynb`: harmonic analysis.
* `BasicPitch.ipynb`: audio-to-MIDI transcription.
* `eval_pipeline.ipynb`: benchmarking against GuitarSet.

---

### Current Project Status
The notebook research is now a production-hardened stack: Python backend (FastAPI) plus a Next.js frontend.

The Viterbi sequence optimizer hits 68.8% exact position accuracy. Difficulty profiles (`beginner` / `intermediate` / `expert`) reshape the cost weights so tabs land differently depending on skill level (details in the [Technical Specification](./technical_spec.md#52-weight-shaping--difficulty-profiles)). Alternate tunings and capos are supported (Drop D, Drop C, DADGAD, Eb standard, Open G). The pipeline incorporates `recode.py` phantom note filtering, key signature snapping with interactive frontend key overrides, multi-fingering variant generation using anchored beam search, and pinned position re-decoding (`POST /transcribe/pinned`). On the UI side, the app uses custom hooks, HTML/ASCII tab views, AlphaTab score bindings, and React Portal edit modals.

> Note: Basic Pitch + TF 2.16+: `basic_pitch` ships a Keras 2 `SavedModel`. TensorFlow 2.16+ defaults to Keras 3, which cannot load it. Set `os.environ["TF_USE_LEGACY_KERAS"] = "1"` and install `tf-keras` before importing `basic_pitch`. That workaround is set in `backend/Dockerfile` and in `jupyter_notebooks/added_difficulty.ipynb`.

### Immediate Roadmap
1. Cloud deployment & verification: deploy backend container to AWS ECS Fargate via `backend/scripts/deploy_aws.sh` / `deploy_aws.ps1` and verify E2E Cloudflare-to-AWS communication.
2. Unauthenticated Gateway PoC [Done]: FastAPI endpoints configured in `backend/endpoints/` running in unauthenticated mode for direct proof-of-concept evaluation.
3. FastAPI Modularization [Done]: Core pipeline logic refactored into `backend/services/pipeline.py` with thin APIRouter definitions in `backend/endpoints/`.
4. AI/LLM Coaching (@Aaron Luong): post-process tabs and write natural-language fingering notes.
5. Performance Benchmarking: measure inference latency on AWS ECS Fargate hardware (target < 5s for 60s audio).


