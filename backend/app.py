# app.py
# FastAPI entry point for the Fretwork ML backend.
# Exposes endpoints:
#   POST /transcribe   — full audio → tab pipeline
#   POST /process-jams — JAMS file → tab
#   GET  /health       — liveness check

import logging
import os
from pathlib import Path
import sys

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add backend directory to sys.path so imports work regardless of working directory
_backend_dir = Path(__file__).parent.resolve()
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

try:
    from backend.endpoints import health, transcribe, jams, pinned
except ImportError:
    from endpoints import health, transcribe, jams, pinned

# Structured logging routed to stdout -> CloudWatch Logs via ECS log driver
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("fretwork")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load TabTransformer position prior and GuitarSet unigram prior on startup
    try:
        try:
            from backend.fretboard.transformer import _load_transformer_prior
        except ImportError:
            from fretboard.transformer import _load_transformer_prior
        _load_transformer_prior()
        logger.info("event=transformer_loaded status=ready")
    except Exception as exc:
        logger.warning("event=transformer_load_skipped reason=%s", exc)
    yield


app = FastAPI(
    title="Fretwork ML Backend",
    description="Audio → guitar tablature via Basic Pitch + Approach 4 TabTransformer beam decoder (July21.ipynb)",
    version="0.2.0",
    lifespan=lifespan,
)


# CORS configuration
_origins_env = os.getenv(
    "ALLOWED_ORIGINS",
    "https://guitar-capstone.kobbyhanson.workers.dev,http://localhost:3000,http://localhost:5173",
)
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Include modular APIRouters
app.include_router(health.router)
app.include_router(transcribe.router)
app.include_router(jams.router)
app.include_router(pinned.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
