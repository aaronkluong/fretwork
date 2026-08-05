# backend/endpoints/health.py
# Health check endpoint for ALB / ECS container readiness probes.

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
def health():
    """Liveness & readiness probe endpoint."""
    return {"status": "ok"}
