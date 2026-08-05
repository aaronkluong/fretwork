# Infrastructure and deployment strategy: Hybrid Cloud

Fretwork operates on a hybrid-cloud architecture, utilizing a split-deployment strategy to balance low-latency user interfaces with high-compute ML workloads.

---

## 1. Architectural Strategy

We separate concerns between the delivery of the web application and the execution of the music intelligence pipeline:

*   **Frontend (Delivery Layer)**: Hosted on **Cloudflare Pages**. This ensures global, low-latency access to the Next.js application and static assets.
*   **Backend (Compute Layer)**: Hosted on **AWS (ECS Fargate)**. This provides the necessary CPU and memory resources for Python-based ML models (Basic Pitch), signal processing (Librosa), and the Viterbi optimizer.

---

## 2. Technology Stack

| Component | Technology | Primary Function |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js 16 (Turbopack) | Interactive tab rendering, file uploads, state management. |
| **Edge Delivery** | Cloudflare Pages | Global CDN, SSR/ISR via OpenNext adapter. |
| **API Backend** | FastAPI (Python 3.11) | High-performance API serving the ML pipeline. |
| **Authentication**| Unauthenticated Gateway (PoC) | API key middleware removed to streamline PoC evaluation; CORS configured for web client origins. |
| **Containerization**| Docker | Unified environment for Python deps and audio libraries. |
| **Registry** | AWS ECR | Private repository for backend container images. |
| **Compute** | AWS ECS Fargate | Serverless container execution for ML workloads. |
| **Networking** | AWS ALB / VPC | Secure routing and load balancing for the API. |

---

## 3. Specialized Guides

For detailed configuration, build commands, and deployment workflows, refer to the following specialized documents:

### [Cloudflare Pages Guide](./cloudflare.md)
*   Build configuration (`pnpm pages:build`).
*   OpenNext adapter setup.
*   Environment variable management (`NEXT_PUBLIC_API_URL`).

### [AWS + Docker Deployment Guide](./aws_docker.md)
*   Dockerfile configuration for Python audio dependencies and `TF_USE_LEGACY_KERAS=1`.
*   Automated ECR build and push workflows via [backend/scripts/deploy_aws.sh](file:///C:/Users/kobby/Downloads/Grad/guitar_capstone/backend/scripts/deploy_aws.sh) and [backend/scripts/deploy_aws.ps1](file:///C:/Users/kobby/Downloads/Grad/guitar_capstone/backend/scripts/deploy_aws.ps1).
*   ECS Fargate Task Definitions (CPU/Memory sizing: 1024 CPU / 3072 MB RAM).
*   Application Load Balancer (ALB) setup and CloudWatch structured logging.

---

## 4. Deployment Roadmap

1.  **Backend Containerization & Build Automation** [Done]: `Dockerfile`, `ecs-task-def.json`, and deployment scripts (`deploy_aws.sh` / `deploy_aws.ps1`) finalized.
2.  **AWS Infrastructure** [Done]: Provisioned ECR repository (`fretwork-backend`) and ECS Fargate cluster configuration.
3.  **API Gateway Unauthenticated PoC Mode** [Done]: Configured endpoints in `backend/endpoints/` running in unauthenticated mode for direct PoC demonstration.
4.  **Frontend Connectivity**: Deploy Next.js frontend to Cloudflare Pages and configure `NEXT_PUBLIC_API_URL` pointing to AWS ALB.
5.  **E2E Validation**: Perform full-cycle end-to-end latency and playability testing (Audio Upload $\to$ AWS Processing $\to$ Cloudflare Rendering).

