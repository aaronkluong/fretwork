# backend/endpoints/jams.py
# Endpoint handler for POST /process-jams.

import logging
from pathlib import Path
import sys
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

_backend_dir = Path(__file__).parent.parent.resolve()
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

try:
    from backend.services.pipeline import process_jams_annotation
except ImportError:
    from services.pipeline import process_jams_annotation

router = APIRouter(tags=["JAMS Processing"])
logger = logging.getLogger("fretwork.endpoints.jams")


@router.post("/process-jams")
async def process_jams(
    jams_file: UploadFile = File(...),
    tuning: str = Form("standard"),
    capo: int = Form(0),
    difficulty: str = Form("expert"),
):
    """
    Upload a .jams annotation file and receive a tab schema.
    Calculates optimized tab fingerings and variants.
    """
    try:
        content = await jams_file.read()
        return await process_jams_annotation(
            file_bytes=content,
            filename=jams_file.filename or "annotation.jams",
            tuning=tuning,
            capo=capo,
            difficulty=difficulty,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("event=process_jams_error error=%s", e)
        raise HTTPException(status_code=500, detail=str(e))
