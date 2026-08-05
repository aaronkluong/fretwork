# backend/endpoints/pinned.py
# Endpoint handler for POST /transcribe/pinned (re-decoding with pin/delete constraints).

import json
import logging
from typing import Any, Dict, List, Optional
from pathlib import Path
import sys
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field

_backend_dir = Path(__file__).parent.parent.resolve()
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

try:
    from backend.services.pipeline import process_audio_transcription_pinned
except ImportError:
    from services.pipeline import process_audio_transcription_pinned

router = APIRouter(tags=["Transcription"])
logger = logging.getLogger("fretwork.endpoints.pinned")


class PinnedTranscriptionRequest(BaseModel):
    notes: List[Dict[str, Any]] = Field(..., description="List of note event objects with start, duration, midi")
    pins: Optional[Dict[str, Any]] = Field(default=None, description="Pin constraints: note index -> [string, fret]")
    delete: Optional[List[int]] = Field(default=None, description="Note indices to delete prior to decoding")
    tuning: str = Field(default="standard")
    capo: int = Field(default=0)
    difficulty: str = Field(default="expert")
    key_signature: Optional[str] = Field(default=None)
    chords: Optional[List[Dict[str, Any]]] = Field(default=None)


@router.post("/transcribe/pinned")
async def transcribe_pinned(payload: PinnedTranscriptionRequest):
    """
    Re-decode a note sequence with pinned position constraints or note deletions (matches July21.ipynb).
    """
    try:
        return await process_audio_transcription_pinned(
            note_events=payload.notes,
            tuning=payload.tuning,
            capo=payload.capo,
            difficulty=payload.difficulty,
            key_label=payload.key_signature,
            chords=payload.chords or [],
            pins=payload.pins,
            delete=payload.delete,
        )
    except ValueError as e:
        detail = str(e).strip() or "Invalid pinned transcription request."
        logger.warning("event=transcribe_pinned_client_error error=%s", detail)
        raise HTTPException(status_code=422, detail=detail)
    except HTTPException:
        raise
    except Exception as e:
        detail = str(e).strip() or f"{type(e).__name__}: pinned decoding failed"
        logger.exception("event=transcribe_pinned_error error=%s", detail)
        raise HTTPException(status_code=500, detail=detail)
