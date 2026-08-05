# AWS + Docker Deployment Guide

## Scope

This guide covers packaging and deploying the **ML backend pipeline** on AWS using Docker.
The Next.js frontend is deployed separately on Cloudflare Pages (see [cloudflare.md](./cloudflare.md)).

The backend is responsible for:
1. Receiving an audio file
2. Running transcription models (Basic Pitch / MT3)
3. Running the Viterbi fretboard optimizer
4. Returning an Output JSON tab schema

This workload requires a real Linux server (model inference, NumPy/Librosa, Python dependencies). It cannot run on Cloudflare's Edge runtime.

---

## Architecture Overview

```
Browser / Next.js Frontend (Cloudflare Pages)
        │
        │  POST /transcribe  (audio file)
        ▼
AWS API Gateway  ──►  ECS Fargate Task (Docker container)
                             │
                             ├── Basic Pitch / MT3  (transcription)
                             ├── JamsProcessor      (normalization)
                             └── Viterbi Pathfinder (tab optimization)
                             │
                        Output JSON Tab Schema
```

**Why ECS Fargate?**
- Serverless containers: no EC2 instances to manage
- Pay per task run (cost-effective for a capstone project)
- Scales to zero when idle
- Supports GPU task definitions if MT3 inference becomes too slow on CPU

---

## 1. Project Structure

The ML backend is located in `backend/` at the repository root:

```
guitar_capstone/
├── fretwork/          # Next.js frontend (Cloudflare Pages)
├── backend/           # ML pipeline & API backend (AWS ECS Fargate)
│   ├── Dockerfile     # Production container definition
│   ├── requirements.txt
│   ├── app.py         # FastAPI web application entry point
│   ├── audio/         # Basic Pitch audio transcription, key/chord detection & stem separation
│   ├── endpoints/     # FastAPI route handlers (/transcribe, /transcribe/pinned, /process-jams, /health)
│   ├── fretboard/     # TabTransformer & Viterbi pathfinder
│   ├── models/        # TabTransformer weights & position priors
│   ├── processors/    # ASCII renderer & JAMS processor
│   ├── scripts/       # ECR build & push automation (deploy_aws.ps1 / deploy_aws.sh)
│   └── services/      # Multi-threaded pipeline orchestrator
└── docs/              # Technical documentation & guides
```

---

## 2. Dockerfile

```dockerfile
# Use a slim Python base with system audio libraries
FROM python:3.11-slim

# Install system dependencies needed by Librosa / soundfile
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set legacy Keras engine to support basic_pitch Keras 2 SavedModel under TF 2.16+
ENV TF_USE_LEGACY_KERAS=1

WORKDIR /app

# Install Python dependencies first (layer cache optimization)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the API port
EXPOSE 8000

# Start FastAPI with Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Key points:**
- `libsndfile1` and `ffmpeg` are required by Librosa for audio decoding
- Python dependencies are copied before app code so Docker can cache the layer. Rebuilds are much faster when only code changes
- Port `8000` is the FastAPI/Uvicorn default

---

## 3. requirements.txt (Baseline)

```
fastapi
uvicorn[standard]
basic-pitch
librosa
numpy
scipy
```

Add `torch` / MT3 dependencies once the model integration is finalized. MT3 is significantly larger, so expect the image to grow to ~3–4 GB.

---

## 4. FastAPI Entry Point (`app.py`)

```python
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import tempfile, os
from transcribe import run_transcription
from optimizer import run_viterbi

app = FastAPI(title="Fretwork ML Backend")

# Allow requests from the Cloudflare frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://guitar-capstone.kobbyhanson.workers.dev"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name
    try:
        note_events = run_transcription(tmp_path)
        tab_json    = run_viterbi(note_events)
        return tab_json
    finally:
        os.unlink(tmp_path)

@app.get("/health")
def health():
    return {"status": "ok"}
```

---

## 5. Building and Pushing to AWS ECR

Amazon Elastic Container Registry (ECR) is the private Docker registry used by ECS.

### 5.1 Automated One-Command Deployment

From the root of the repository, you can use the helper deploy scripts:

* **PowerShell (Windows)**:
  ```powershell
  .\backend\scripts\deploy_aws.ps1 -AccountId "992685484195" -Region "us-east-1"
  ```
* **Bash (Linux / macOS / WSL)**:
  ```bash
  chmod +x backend/scripts/deploy_aws.sh
  ./backend/scripts/deploy_aws.sh 992685484195 us-east-1
  ```

### 5.2 Manual Step-by-Step Execution

```bash
# 1. Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS \
    --password-stdin <your-account-id>.dkr.ecr.us-east-1.amazonaws.com

# 2. Create the ECR repository (one-time)
aws ecr create-repository --repository-name fretwork-backend --region us-east-1

# 3. Build the image
docker build --platform linux/amd64 -t fretwork-backend:latest -f backend/Dockerfile backend/

# 4. Tag it for ECR
docker tag fretwork-backend:latest \
  <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/fretwork-backend:latest

# 5. Push
docker push \
  <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/fretwork-backend:latest
```

Replace `<your-account-id>` with your 12-digit AWS account ID (`992685484195` default) and adjust the region as needed.

---

## 6. ECS Fargate Deployment

### 6.1 Task Definition

Create a task definition (`backend/ecs-task-def.json`):

```json
{
  "family": "fretwork-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "3072",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "fretwork-backend",
      "image": "<account-id>.dkr.ecr.us-west-2.amazonaws.com/fretwork-backend:latest",
      "portMappings": [{ "containerPort": 8000 }],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fretwork-backend",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register it:
```bash
aws ecs register-task-definition --cli-input-json file://backend/ecs-task-def.json
```

**CPU/Memory sizing:**
| Use case | CPU | Memory |
|---|---|---|
| Basic Pitch only (dev/demo) | 512 | 1024 MB |
| Basic Pitch + Viterbi | 1024 | 3072 MB |
| MT3 (full model, CPU) | 2048 | 8192 MB |

### 6.2 ECS Service + ALB (for persistent endpoint)

For a persistent API endpoint exposed via a URL:

1. Create an ECS Cluster (`fretwork-cluster`)
2. Create an Application Load Balancer targeting port 8000
3. Create an ECS Service using the task definition above, attached to the ALB

This gives a stable URL like `http://fretwork-backend-alb-xxxx.us-west-2.elb.amazonaws.com`.

### 6.3 Alternative: Run on Demand (no ALB, lower cost)

For a capstone / demo, you can run a one-off task instead of a persistent service:

```bash
aws ecs run-task \
  --cluster fretwork-cluster \
  --task-definition fretwork-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxx],securityGroups=[sg-xxxx],assignPublicIp=ENABLED}"
```

This spins up a container, handles the request, and terminates; you only pay while it runs.

---

## 7. Connecting the Frontend to the Backend

In the Next.js app (`fretwork/`), set the backend URL as an environment variable:

**`.env.local` (local dev):**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Cloudflare Pages (production):**
Set `NEXT_PUBLIC_API_URL` in *Workers & Pages > fretwork > Settings > Variables and Secrets* to your ALB URL.

The frontend then calls:
```typescript
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transcribe`, {
  method: "POST",
  body: formData,
});
```

---

## 8. Local Development with Docker

To test the backend locally before pushing to AWS:

```bash
# Build
docker build -t fretwork-backend ./backend

# Run
docker run -p 8000:8000 fretwork-backend

# Test the health endpoint
curl http://localhost:8000/health
# → {"status": "ok"}
```

To test with a real audio file:
```bash
curl -X POST http://localhost:8000/transcribe \
  -F "audio=@assets/audio/some_track.wav"
```

---

## 9. IAM Permissions (Minimum Required)

The `ecsTaskExecutionRole` needs:
- `AmazonECSTaskExecutionRolePolicy` (pull from ECR, write to CloudWatch Logs)

If the backend reads/writes from S3 (e.g., storing audio or tab results), attach an additional inline policy:
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::fretwork-assets/*"
}
```

---

## 10. Summary: Cloudflare vs. AWS Split

| Concern | Platform | Why |
|---|---|---|
| Next.js UI | Cloudflare Pages | Fast global CDN, zero-config for Next.js |
| ML inference (Basic Pitch, MT3) | AWS ECS Fargate | Requires Python, large deps, real compute |
| Fretboard optimizer (Viterbi) | AWS ECS Fargate | CPU-bound computation, not suitable for edge |
| Audio file storage (future) | AWS S3 | Object storage, integrates naturally with ECS |
