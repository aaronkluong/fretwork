# Fretwork - An open-source music intelligence platform

## Project team members
Aaron Luong, Kobby Hanson, Ani Sreekumar, Zev Rosen

## Why

### Problem statement 
Existing AI music transcription tools like Songscription, Songsterr AI, and Klang.io produce note-level output. They fail at the things guitarists actually need: understanding a song's musical context and assigning notes to playable positions on the fretboard. Reviewers of leading commercial tools cite wrong fret positions and lack of theory context as the primary weaknesses. There is no open-source platform that gives a guitarist a complete picture of a song.

We propose a web-based open-source platform that takes any audio file and produces a unified analysis. It outputs detected key, chord progression, transcription, playable guitar tab, and suggested chord voicings. The contributions are a music-theory-aware fret assignment algorithm and an integrated educational layer.

### Impact and market opportunity
A study by Fender shows 10% of the global population has some guitar experience. We estimate a potential market size of 100 million active users who value playability over raw note detection. We will measure impact via website traffic and volume of processed recordings.

### Target customer
Primary users are guitar enthusiasts, music students, and educators. They need accurate and playable transcriptions for songs that lack official tablature.

## Market Overview

| Company name | Stage | Product overview | Primary customer | Key differentiation |
| :--- | :--- | :--- | :--- | :--- |
| Songscription | VC-backed | Music transcription and notation | Educators, musicians | Uses MIDI2ScoreTransformer. Selects inefficient fret choices. |
| Songsterr AI | Established | Tablature and playback | Guitar enthusiasts | Fret positions are often physically impossible. |
| Klang.io | Startup | Sheet music transcription | Composers, educators | Mature but lacks guitar-specific fretboard optimization. |
| Piano Tools | Commercial | AI transcription for piano | Pianists | Piano is 1:1 key-to-note. Guitar is N:1. |

### Competitive Deep Dive: Songscription
*   Model architecture: Based on the MIDI2ScoreTransformer (Beyer et al., 2024).
*   Pipeline: Audio to MIDI to Sheet Music.
*   Weakness: The transition from MIDI to instrument-specific notation lacks deep domain knowledge of guitar ergonomics.

### Relevant Readings and Research
*   Bittner et al., "A Lightweight Polyphonic Note Transcription Model" (Basic Pitch) - [Link](https://arxiv.org/abs/2203.09893)
*   Gardner et al., "MT3: Multi-Task Multitrack Music Transcription" - [Link](https://arxiv.org/abs/2111.03017)
*   Riley et al., "High Resolution Guitar Transcription via Domain Adaptation" - [Link](https://arxiv.org/abs/2402.15258)
*   "TART: Technique-Aware Audio-to-Tab Guitar Transcription" - [Link](https://arxiv.org/abs/2510.02597)
*   Beyer et al., "MIDI2ScoreTransformer" - [Link](https://arxiv.org/abs/2410.00210)

## What

### Minimal Viable Product (MVP)
A web application where users upload audio and receive optimized tablature.
*   **Core Feature Deliverables**:
    *   Format algorithm outputs into standard ASCII tablature format. (Completed)
    *   Display detected key signature and identified chords clearly. (Completed)
    *   Deliver an interactive HTML-based tab presentation interface with a toggle/button to export as standard ASCII. (Completed)
    *   Standardize the internal pipeline interfaces using model-ready input/output JSON schemas. (Completed)
*   **Performance Targets**:
    *   Fret assignment accuracy: Target improvement from 70% (naive) to 95% (optimized). Currently achieved 68.8% exact position accuracy on unseen test recordings using Viterbi global optimization.
*   **Data science approach**:
    *   Backbone: Basic Pitch or MT3 for note detection.
    *   Context: Librosa (key detection via chromagram), Autochord (chord recognition).
    *   Optimization: Viterbi path optimization for fret assignment.
    *   Chord Recognition & Voicings: Position-dependent chord voicing library.

### Value Proposition and Differentiation
Fretwork provides transcriptions that reflect how experienced guitarists actually play. It prioritizes ergonomic efficiency and musical context. The project is open-source.

## Success Metrics
- Accuracy: Fret position accuracy measured against GuitarSet. Currently achieved 68.8% exact position accuracy with the `combined_all_tuned` model.
- Efficiency: Average fretboard movement distance reduction compared to naive models (current achieved average fret jump of **0.9116** with zero duplicate-string violations).
- Engagement: Website traffic and recording processing volume.

## How

### Roadmap and Phases

### Phase 1: Research & Baseline Infrastructure (Completed)
*   Set up repository, shared development environment, and Next.js web client.
*   Configure Tailwind CSS v4 design tokens and Husky pre-commit checks.
*   Validate Essentia for key detection and Chordino for chord recognition.
*   Ingest and structure GuitarSet for evaluation.
*   Transitioned from Greedy note-by-note mapping to Viterbi global sequence optimization.
*   Incorporated empirical position priors from GuitarSet training recordings.
*   Tuned scoring weights on the validation set, achieving 68.8% exact position accuracy.

### Phase 2: Web Client & Engine Integration (Completed)
*   Built client-side `JamsProcessor` utility in TypeScript to parse JAMS formats.
*   Implemented stateful interactive HTML tab presentation and dynamic ASCII tab generator.
*   Refactored frontend into modular components and custom hooks (`useAnalysis`, `useToasts`).
*   Activated learned empirical priors and dynamic weight shaping (difficulty levels) in the backend API.

### Phase 3: Production Infrastructure & Security (Active)
*   **AWS ECS Fargate Deployment**: Containerize the Python backend and deploy to ECS behind an ALB.
*   **API Gateway Unauthenticated PoC Mode**: Configured endpoints in `backend/endpoints/` running in unauthenticated mode for direct PoC evaluation.
*   **Inference Latency Benchmarking**: Conduct performance tests on AWS hardware.
*   **S3 Ingestion Pipeline**: Implement a formal asset protection layer for user-uploaded audio.
*   **Transcription Stability**: Implement TensorFlow determinism pins and output post-processing (quantization/denoising).
*   **ML Refinement Model (Anomaly Detection)**: Develop the primary refinement layer to spot "off notes" and "impossible reaches," providing a final cleansed output.

### Phase 4: Advanced Intelligence & UI (Active)
*   **Add LLM Layer**: Implement an LLM post-processing layer to improve, validate, and clean up the tab outputs (@Aaron Luong).
*   **Algorithm Improvements & Playing Position**: Improve Viterbi heuristics and add physical playing position preferences (@Ani Sreekumar).
*   **Capo & Tunings**: Add support for dynamic tunings and capo fret shifting in the optimizer (Completed) (@Ani Sreekumar).
*   **Competitor UI Comparison**: Analyze competitor interfaces (Songsterr, Songscription, Klang) and add missing features to our UI (@Zev Abraham Rosen).
*   **Difficulty Level Selection**: Add support for `beginner`, `intermediate`, and `expert` difficulties, implementing the "Difficulty Match Stage" at the end of the post-processing sequence (Completed) (@Kobby Hanson, based on the `docs/cloudflare.md` routing context).
*   **Key Signature Override**: Interactive key signature selector (24 major/minor keys) in UI with instant client-side CAGED recalculation (Completed) (@Kobby Hanson).
*   **Multi-Fingering Variants**: Anchored beam search alternate fingering arrangement generation in backend API (Completed) (@Kobby Hanson).
*   **Testing & Feedback**: Conduct UI test sessions and capture user feedback on playability (@Zev Abraham Rosen).
*   **Peer Review**: Finalize deliverables and submit peer review (@channel).

### Data sets
*   GuitarSet: 360 recordings with string and fret ground truth.
*   McGill Billboard: 1,000 songs with chord annotations.
*   Isophonics: Chord, key, and beat reference annotations.
*   Chordonomicon: 200k chord progressions for harmonic priors.

### Project management

| Role | Lead | Backup |
| :--- | :--- | :--- |
| Project manager | Zev Rosen | Ani Sreekumar |
| Product manager | Ani Sreekumar | Zev Rosen |
| Data/Infrastructure | Kobby Hanson | Aaron Luong |
| Model evaluation | Aaron Luong | Kobby Hanson |
| Lead developer | Kobby Hanson | Aaron Luong |

### Technical approach and planning
EDA focuses on annotation consistency across datasets. The fretboard algorithm uses shortest-path optimization to minimize hand movement. Key challenges include the subjective nature of "correct" tabs and the computational cost of audio processing.