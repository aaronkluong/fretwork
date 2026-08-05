# System Architecture: Fretwork

## Core Team & Roles

| Name | Role | Contact |
| :--- | :--- | :--- |
| **Zev Rosen** | Project Manager | zar27@ischool.berkeley.edu |
| **Ani Sreekumar** | Product Manager | anisreekumar@berkeley.edu |
| **Kobby Hanson** | Lead Developer / Infrastructure | kobbyhanson@berkeley.edu |
| **Aaron Luong** | Model Evaluation | aaluong@berkeley.edu |

---

## Architecture Overview

Fretwork translates raw audio into playable guitar tabs. The system runs as a **Next.js** frontend on Cloudflare Pages and connects to a containerized **FastAPI backend** hosted on AWS ECS Fargate.

1. **Audio & Harmonic Analysis**: Uses **Basic Pitch** for polyphonic note detection, **Librosa** for key estimation, and sliding-window chord analysis directly on the uploaded audio.
2. **Filtering & Context**: Maps notes to the detected key and drops ghost notes using threshold rules in `backend/audio/recode.py`.
3. **Prox-Viterbi & TabTransformer Decoder**: Evaluates positions using CAGED hand shapes, GuitarSet position statistics, and a 1M-parameter **Causal TabTransformer** (`tab_transformer_final.pt`) via beam search ($W=2.0, k=8$).
4. **Alternative Fingerings**: Generates candidate fingerings anchored to different neck positions (frets 3, 8, and 12).
5. **Pinning Constraints**: Accepts manual note pins or deletions via `POST /api/pinned` and `POST /api/transcribe/pinned`, passing constraints down to `POST /transcribe/pinned` on the backend.
6. **Difficulty Profiles**: Adjusts movement penalties, maximum hand spans, and barre chord costs for `beginner`, `intermediate`, and `expert` modes.
7. **Demo Fallback Pipeline**: Loads the sample audio (`demo.mp3`) via `/api/transcribe`. If the request times out after 20 seconds, it falls back to pre-calculated annotations (`demo.jams`), then to a client-side TypeScript solver if needed.
8. **API Gateway**: Standardized FastAPI routes (`endpoints/transcribe.py`, `endpoints/pinned.py`, `endpoints/jams.py`, `endpoints/health.py`) managed by `services/pipeline.py`.

---

## System Dataflow

```mermaid
flowchart TD
    subgraph Client ["1. Frontend Client (Next.js / Cloudflare)"]
        UI_Audio(["User Audio Input"])
        UI_Pins(["Pin / Delete Requests"])
        UI_JAMS[("GuitarSet JAMS Annotations")]
        UseAnalysisHook[["useAnalysis Hook (hooks/useAnalysis.ts)"]]
        WorkingState[["Working Baseline State Sync (commitWorkingState)"]]
    end

    subgraph Gateway ["2. Backend API Gateway (FastAPI)"]
        EP_Transcribe["POST /transcribe (endpoints/transcribe.py)"]
        EP_Pinned["POST /transcribe/pinned (endpoints/pinned.py)"]
        EP_JAMS["POST /process-jams (endpoints/jams.py)"]
        EP_Health["GET /health (endpoints/health.py)"]
        PipelineService[["Pipeline Orchestrator (services/pipeline.py)"]]
    end

    subgraph Intelligence ["3. Music Intelligence & Audio Analysis"]
        BasicPitch[["Basic Pitch Note Detection (audio/transcribe.py)"]]
        StemSep[["Demucs Stem Separator (audio/stem_separation.py)"]]
        KeyChordEngine[["Key & Chord Analysis (audio/key_detection.py, chord_detection.py)"]]
        RecodeFilter[["Recode Denoising & Key Snapper (audio/recode.py)"]]
        JamsParser[["JAMS Annotation Parser (processors/jams_processor.py)"]]
    end

    subgraph Decoder ["4. Prox-Viterbi & TabTransformer Engine"]
        PriorWeights[("GuitarSet Unigram Prior (models/guitarset_position_prior.json)")]
        DiffProfiles[("Difficulty Profile Weights (config/theory_config.json)")]
        TabTransformer[["Causal TabTransformer Model (models/tab_transformer_final.pt)"]]
        ViterbiBeam[["Prox-Viterbi Beam Pathfinder (fretboard/algorithms.py)"]]
        VariantEngine[["Anchored Multiway Variant Engine (fretboard/api.py)"]]
        PinnedDecoder[["Pinned Constraint Decoder (endpoints/pinned.py)"]]
    end

    subgraph Output ["5. Result Presentation & Visualization"]
        OutputSchema[("Output JSON Tab Schema")]
        ASCIIRenderer[["ASCII Tab Renderer (processors/ascii_renderer.py)"]]
        InteractiveView[/"Interactive HTML, ASCII & AlphaTab View"/]
    end

    %% Dataflow Connections
    UI_Audio --> UseAnalysisHook
    UI_Pins --> UseAnalysisHook
    UI_JAMS --> UseAnalysisHook
    UseAnalysisHook --> WorkingState

    WorkingState -->|Audio File + Config| EP_Transcribe
    WorkingState -->|Note Pins / Deletions| EP_Pinned
    WorkingState -->|JAMS File| EP_JAMS

    EP_Transcribe --> PipelineService
    EP_Pinned --> PipelineService
    EP_JAMS --> PipelineService

    PipelineService --> StemSep
    StemSep --> BasicPitch
    PipelineService --> JamsParser

    BasicPitch --> KeyChordEngine
    KeyChordEngine --> RecodeFilter

    RecodeFilter --> ViterbiBeam & VariantEngine & TabTransformer
    JamsParser --> ViterbiBeam
    EP_Pinned --> PinnedDecoder

    PriorWeights & DiffProfiles -.->|Scoring Weights| ViterbiBeam & VariantEngine & PinnedDecoder
    TabTransformer -.->|Causal Prior Costs| ViterbiBeam & VariantEngine & PinnedDecoder

    ViterbiBeam & VariantEngine & PinnedDecoder --> OutputSchema
    OutputSchema --> ASCIIRenderer
    OutputSchema & ASCIIRenderer --> InteractiveView
```
