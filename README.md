# Fretwork - Guitar Transcription and Tablature Engine

Fretwork transcribes audio into playable guitar tablature by mapping notes to natural fretboard fingerings.

## The Problem
Most automatic transcription tools ignore guitar geometry. They output raw notes without considering hand stretches, string collisions, or shifting positions along the neck, producing tabs that are difficult or impossible to play.

## Our Approach
Fretwork uses audio transcription models like Basic Pitch combined with a causal TabTransformer prior and Viterbi decoding (`prox_viterbi_transformer`) to choose ergonomic, playable neck positions.

## Documentation
- [Executive Summary](./docs/fretwork.md) - High-level vision, problem space, and core research takeaways.
- [System Architecture](./docs/architecture.md) - Master Mermaid diagram, team roles, and pipeline data flow.
- [Technical Specification](./docs/technical_spec.md) - Formal logic and mathematical model for the Viterbi fretboard algorithm.
- [Evaluation & Production Results](./docs/results.md) - Empirical benchmarks across GuitarSet & GAPS datasets, model comparison, and accuracy metrics.
- [Data Assets and Schemas](./docs/data.md) - Deep dive into GuitarSet, JAMS, and audio assets.
- [Execution Checklist](./docs/checklist.md) - Project milestone tracker and active task roadmap.
- [Technical Review](./docs/review.md) - Architectural gaps and technical recommendations.
- [Deployment Guide](./docs/deployment.md) - Infrastructure overview for AWS and Cloudflare.
- [AWS & Docker Deployment](./docs/aws_docker.md) - Detailed AWS ECS Fargate & ECR deployment guide.
- [Tablature Reading Guide](./docs/reading_tabs.md) - Guide to reading guitar tabs.

## Core Features
- **Audio-to-Tab Conversion**: Polyphonic note detection from audio files.
- **Fretboard Optimization**: Pathfinding to minimize awkward hand stretches and position jumps.
- **Harmonic Analysis**: Key, tempo, and chord progression detection.

## Web Interface (`/fretwork`)
Built with Next.js 16, Tailwind CSS v4, TypeScript, and alphaTab for interactive tab rendering and ASCII export.

### Quickstart & Development
All primary commands are configured to run directly from the **workspace root directory** (`/`):

```bash
# Install workspace dependencies
pnpm install

# Run backend (FastAPI:8000) and frontend (Next.js:3000) concurrently
pnpm dev
```

### Workspace Commands (Root Workspace)
| Command | Description | Working Directory |
| :--- | :--- | :---: |
| `pnpm dev` | Run backend & frontend concurrently | Root (`/`) |
| `pnpm dev:backend` | Run Python FastAPI server only (`http://localhost:8000`) | Root (`/`) |
| `pnpm dev:frontend` | Run Next.js web client only (`http://localhost:3000`) | Root (`/`) |
| `pnpm test` | Run full test suite (Vitest + Pytest) | Root (`/`) |
| `pnpm test:frontend` | Run Vitest unit & component test suite | Root (`/`) |
| `pnpm test:backend` | Run Pytest backend integration test suite | Root (`/`) |
| `pnpm lint` | Run ESLint code quality checks | Root (`/`) |
| `pnpm check-types` | Run TypeScript strict type verification | Root (`/`) |
| `pnpm build` | Build production Next.js bundle | Root (`/`) |
| `pnpm pages:build` | Build OpenNext Cloudflare Pages bundle | Root (`/`) |
| `pnpm pages:deploy` | Deploy build output to Cloudflare Pages | Root (`/`) |

### Git Hooks
This repo uses **Husky** to run linting and type-checking on pre-commit.

### Deployment (Cloudflare Pages & AWS ECS)
* **Frontend (Cloudflare Pages)**: `pnpm pages:build` and `pnpm pages:deploy`
* **Backend (AWS ECS Fargate)**: `backend/scripts/deploy_aws.ps1` or `backend/scripts/deploy_aws.sh`

> [!NOTE]
> On Windows native environments, `pages:build` can hit symlink errors. Build inside WSL or with Windows Developer Mode enabled.

## Team
| Name | Role | Contact |
| :--- | :--- | :--- |
| **Zev Rosen** | Project Manager | zar27@ischool.berkeley.edu |
| **Ani Sreekumar** | Product Manager | anisreekumar@berkeley.edu |
| **Kobby Hanson** | Lead Developer | kobbyhanson@berkeley.edu |
| **Aaron Luong** | Model Evaluation | aaluong@berkeley.edu |