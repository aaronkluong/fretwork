# backend/endpoints/transcribe.py
# Endpoint handler for POST /transcribe.

import logging
from pathlib import Path
import sys
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

_backend_dir = Path(__file__).parent.parent.resolve()
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

try:
    from backend.services.pipeline import process_audio_transcription
except ImportError:
    from services.pipeline import process_audio_transcription

router = APIRouter(tags=["Transcription"])
logger = logging.getLogger("fretwork.endpoints.transcribe")


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    tuning: str = Form("standard"),
    capo: int = Form(0),
    difficulty: str = Form("expert"),
    separate_stems: bool = Form(False),
):
    """
    Upload an audio file (WAV, MP3, M4A) and receive an Output JSON tab schema.
    """
    try:
        content = await audio.read()
        return await process_audio_transcription(
            file_bytes=content,
            filename=audio.filename or "audio",
            content_type=audio.content_type or "",
            tuning=tuning,
            capo=capo,
            difficulty=difficulty,
            separate_stems=separate_stems,
        )
    except ValueError as e:
        detail = str(e).strip() or "Invalid audio input."
        logger.warning("event=transcribe_client_error error=%s", detail)
        raise HTTPException(status_code=400, detail=detail)
    except HTTPException:
        raise
    except Exception as e:
        detail = str(e).strip() or f"{type(e).__name__}: audio processing failed"
        logger.exception("event=transcribe_error error=%s", detail)
        raise HTTPException(status_code=500, detail=detail)
