# Fretwork ML Backend (Live Architecture)

This is the Python-based machine learning backend for Fretwork. It powers live audio-to-tab transcription using **Upstream Heuristic Curation + Causal TabTransformer Position Prior (`prox_viterbi_transformer`)**.

---

## 1. Live Architecture Stack

```
Audio Input ──► Basic Pitch (audio/transcribe.py) ──► Upstream Curation (audio/recode.py) ──► TabTransformer Prior ──► Output Tab + Neck Variants
```

* **API Gateway & Routing**: FastAPI application handlers (`endpoints/transcribe.py`, `endpoints/pinned.py`, `endpoints/jams.py`, `endpoints/health.py`) and pipeline orchestration service (`services/pipeline.py`).
* **Audio Transcription**: Polyphonic note detection via [Basic Pitch](https://github.com/spotify/basic-pitch) (`audio/transcribe.py`).
* **Upstream Heuristic Note Curation**: Filters transient phantom notes and noise clicks before decoding (`audio/recode.py`).
* **Harmonic & Audio Analysis**: Key scale detection (`audio/key_detection.py`), chord recognition (`audio/chord_detection.py`), tempo detection (`audio/tempo_detection.py`), and audio format normalization (`audio/audio_io.py`).
* **Sequence Position Prior**: 1M parameter causal `TabTransformer` trained on DadaGP (`models/tab_transformer_final.pt`) with beam search decoding ($k=8$, weight $W=2.0$) and GuitarSet unigram position priors (`models/guitarset_position_prior.json`).
* **Playability & Ergonomics**: Neck-anchored position solver (`assign_notes_to_fretboard`) and alternative fingering generator (`get_fingering_variants`).
* **ASCII Tab Export & Processors**: Formatted plain-text tablature generator (`processors/ascii_renderer.py`) and JAMS ground-truth processor (`processors/jams_processor.py`).

---

## 2. Directory Layout

```
backend/
├── app.py                      # FastAPI web application entry point
├── requirements.txt            # Python dependencies (FastAPI, Torch, Librosa, etc.)
├── Dockerfile                  # Production container definition for AWS ECS Fargate
├── ecs-task-def.json           # AWS ECS Fargate task definition
├── README.md                   # Backend documentation
├── audio/                      # Audio processing & music analysis package
│   ├── audio_io.py             # Audio format conversion & WAV normalization
│   ├── transcribe.py           # Basic Pitch audio-to-MIDI transcription runner
│   ├── recode.py               # Upstream phantom note & amplitude curation
│   ├── key_detection.py        # Key signature & scale pitch class analyzer
│   ├── chord_detection.py      # Polyphonic chord progression analyzer
│   ├── tempo_detection.py      # Tempo (BPM) detection
│   └── stem_separation.py     # Demucs guitar stem separation service
├── endpoints/                  # FastAPI modular route handlers package
│   ├── health.py               # GET /health - Liveness & readiness probe endpoint
│   ├── transcribe.py           # POST /transcribe - Full audio to tab transcription
│   ├── jams.py                 # POST /process-jams - JAMS file tab processor
│   └── pinned.py               # POST /transcribe/pinned - Re-decoding with pin/delete constraints
├── fretboard/                  # Position pathfinding & TabTransformer package
│   ├── algorithms.py           # prox_viterbi_transformer & beam search solver
│   ├── transformer.py          # PyTorch TabTransformer neural network definition
│   ├── scoring.py              # Bi-gram physical transition cost matrix
│   ├── theory.py               # Fretboard matrix & tuning geometry
│   ├── config.py               # Tuning & position constants
│   └── api.py                  # High-level entry points (assign_notes_to_fretboard)
├── models/                     # Deep learning neural weights & position priors
│   ├── tab_transformer_final.pt    # Pre-trained TabTransformer neural weights (1M params)
│   └── guitarset_position_prior.json # GuitarSet unigram fretboard position priors
├── processors/                 # Formatters & dataset processors package
│   ├── ascii_renderer.py       # Multi-track ASCII tablature renderer
│   └── jams_processor.py       # JAMS ground-truth tab alignment processor
├── scripts/                    # Deployment & operations automation
│   ├── deploy_aws.ps1          # AWS ECS Fargate deployment script (PowerShell)
│   └── deploy_aws.sh           # AWS ECS Fargate deployment script (Bash)
├── services/                   # High-level orchestration & business logic
│   └── pipeline.py             # Multi-threaded audio processing & decoding pipeline
├── tests/                      # Live backend unit & integration test suite
│   ├── test_api_endpoints.py   # API route & status code test suite
│   ├── test_difficulty.py      # Difficulty profile cost tuning test suite
│   ├── test_pinned_decoding.py # Pinned constraint & note deletion test suite
│   ├── test_pipeline_integration.py # Baseline pipeline integration & ground-truth test suite
│   ├── test_theory_config.py  # Music theory configuration test suite
│   └── test_tuning_capo.py    # Alternate tuning & capo offset test suite
└── xgboost_backup/             # Backup folder: XGBoost (v2) fast CPU note repair
    ├── README.md               # Implementation README & benchmark metrics
    ├── test_xgb_note_repair.py # Unit tests for XGBoost note repair
    ├── xgb_v2_note_repair.joblib
    ├── scaler.joblib
    ├── dadagp_priors.json
    └── feature_extraction.py
```

---

## 3. Performance & Evaluation Metrics

* **Exact Tab Position Accuracy (Mode A - Audio)**: **65.29%** (vs 34.89% on legacy backend baseline).
* **Out-of-Distribution Accuracy (Mode B - GAPS)**: **61.40%**.
* **Physical Playing Errors**: Cut from **4.11 errors/track $\rightarrow$ < 0.26 errors/track** (eliminating string collisions & impossible hand stretches).

For complete evaluation metrics across all 13 pipeline configurations, see [docs/results.md](../docs/results.md).

---

## 4. Alternative Architectures

* **XGBoost Note Repair**: Pre-trained CPU fallback model stored in [backend/xgboost_backup](./xgboost_backup). Refer to [xgboost_backup/README.md](./xgboost_backup/README.md) for specs and activation instructions.

---

## 5. Development & Running Locally

```bash
# 1. Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run FastAPI development server
python app.py
```

---

## 6. Docker & Containerized Deployment

```bash
docker build -t fretwork-backend .
docker run -p 8000:8000 fretwork-backend
```
