# backend/services/pipeline.py
# Core business logic for audio transcription and JAMS processing.

import asyncio
import logging
import os
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import sys

# Ensure backend path is in sys.path
_backend_dir = Path(__file__).parent.parent.resolve()
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

try:
    from backend.audio import (
        run_transcription,
        analyze_audio_key,
        detect_chords,
        detect_chords_from_basic_pitch_notes,
        analyze_audio_tempo,
        separate_guitar_stem,
        ensure_wav,
    )
    from backend.processors import process_jams_file, render_tab_segments
    from backend.fretboard import (
        assign_notes_to_fretboard,
        assign_notes_to_fretboard_pinned,
        get_fingering_variants,
        tab_capo_header,
    )
except ImportError:
    from audio import (
        run_transcription,
        analyze_audio_key,
        detect_chords,
        detect_chords_from_basic_pitch_notes,
        analyze_audio_tempo,
        separate_guitar_stem,
        ensure_wav,
    )
    from processors import process_jams_file, render_tab_segments
    from fretboard import (
        assign_notes_to_fretboard,
        assign_notes_to_fretboard_pinned,
        get_fingering_variants,
        tab_capo_header,
    )

logger = logging.getLogger("fretwork.pipeline")
_executor = ThreadPoolExecutor(max_workers=6)


def _timed(label: str, fn, *args, **kwargs):
    """Call fn(*args, **kwargs), log its duration, and return the result."""
    t0 = time.perf_counter()
    result = fn(*args, **kwargs)
    elapsed = time.perf_counter() - t0
    logger.info("step=%s duration_s=%.3f", label, elapsed)
    return result


def _safe_detect_chords(path: str):
    """Detect chords safely using autochord fallback without raising unhandled exceptions."""
    try:
        return _timed("chord_detection", detect_chords, path)
    except Exception as exc:
        logger.warning("chord_detection failed: %s", exc)
        return []


def _safe_detect_tempo(path: str):
    """Detect tempo safely without raising unhandled exceptions."""
    try:
        return _timed("tempo_detection", analyze_audio_tempo, path)
    except Exception as exc:
        logger.warning("tempo_detection failed: %s", exc)
        return None


async def process_audio_transcription(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    tuning: str = "standard",
    capo: int = 0,
    difficulty: str = "expert",
    separate_stems: bool = False,
) -> dict:
    """Execute full ML audio transcription pipeline."""
    request_id = f"{filename}-{int(time.time())}"
    logger.info("request_id=%s event=transcribe_start filename=%s separate_stems=%s", request_id, filename, separate_stems)
    t_request = time.perf_counter()

    suffix = os.path.splitext(filename or "audio")[1] or ".wav"
    if suffix == ".wav" and content_type:
        ct = (content_type or "").split(";")[0].strip().lower()
        _ct_ext = {
            "audio/webm": ".webm",
            "audio/ogg": ".ogg",
            "audio/mp4": ".m4a",
            "audio/mpeg": ".mp3",
            "audio/wav": ".wav",
            "audio/x-wav": ".wav",
        }
        if filename in (None, "", "audio", "blob") or not os.path.splitext(filename or "")[1]:
            suffix = _ct_ext.get(ct, suffix)

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    logger.info(
        "request_id=%s event=file_written size_bytes=%d suffix=%s content_type=%s",
        request_id, os.path.getsize(tmp_path), suffix, content_type,
    )

    wav_path = tmp_path
    converted_path = None

    try:
        wav_path, converted_path = await asyncio.get_running_loop().run_in_executor(
            _executor, lambda: _timed("audio_normalize", ensure_wav, tmp_path, suffix)
        )

        loop = asyncio.get_running_loop()

        # Optional Demucs Stem Separation
        processing_wav_path = wav_path
        if separate_stems:
            processing_wav_path = await loop.run_in_executor(
                _executor, lambda: _timed("demucs_stem_separation", separate_guitar_stem, wav_path)
            )

        note_future = loop.run_in_executor(
            _executor, lambda: _timed("basic_pitch", run_transcription, processing_wav_path)
        )
        key_future = loop.run_in_executor(
            _executor, lambda: _timed("key_detection", analyze_audio_key, processing_wav_path)
        )
        tempo_future = loop.run_in_executor(
            _executor, lambda: _safe_detect_tempo(processing_wav_path)
        )

        note_events, key_result, tempo_bpm = await asyncio.gather(
            note_future, key_future, tempo_future
        )

        # Primary chord detection: Note-derived sliding window chords (July21.ipynb Approach 4)
        chords = []
        if note_events:
            chords = detect_chords_from_basic_pitch_notes(note_events)
            logger.info("request_id=%s event=primary_note_derived_chords count=%d", request_id, len(chords))
        
        # Fallback to autochord if note-derived detection produced 0 chords
        if not chords:
            chords = await loop.run_in_executor(
                _executor, lambda: _safe_detect_chords(processing_wav_path)
            )
            if chords:
                logger.info("request_id=%s event=fallback_autochord_chords count=%d", request_id, len(chords))

        key_label = key_result["key"]
        key_confidence = key_result["confidence"]
        logger.info(
            "request_id=%s event=inference_done notes=%d key=%s key_confidence=%s chords=%d tempo_bpm=%s",
            request_id, len(note_events), key_label, key_confidence, len(chords), tempo_bpm,
        )

        tab_segments, notes_out = await loop.run_in_executor(
            _executor,
            lambda: _timed(
                "prox_viterbi_transformer", assign_notes_to_fretboard,
                note_events, chords=chords, key_label=key_label,
                tuning=tuning, capo=capo, difficulty=difficulty,
            ),
        )

        header = tab_capo_header(tuning, capo)
        ascii_tab = header + "\n\n" + _timed(
            "ascii_render", render_tab_segments, tab_segments
        )

        raw_variants = await loop.run_in_executor(
            _executor,
            lambda: _timed(
                "fingering_variants", get_fingering_variants,
                note_events, chords=chords, key_label=key_label,
                tuning=tuning, capo=capo, difficulty=difficulty,
            ),
        )

        variants_out = [
            {
                "label": v["label"],
                "tab_segments": v["tab_segments"],
                "notes": v["notes"],
                "ascii_tab": header + "\n\n" + render_tab_segments(v["tab_segments"]),
            }
            for v in raw_variants
        ]
        logger.info(
            "request_id=%s event=variants_done count=%d", request_id, len(variants_out)
        )

        total = time.perf_counter() - t_request
        logger.info(
            "request_id=%s event=transcribe_done segments=%d total_s=%.3f",
            request_id, len(tab_segments), total,
        )

        return {
            "key_signature": key_label,
            "key_confidence": key_confidence,
            "tempo_bpm": tempo_bpm,
            "tuning": tuning,
            "capo": capo,
            "difficulty": difficulty,
            "chords": chords,
            "tab_segments": tab_segments,
            "notes": notes_out,
            "ascii_tab": ascii_tab,
            "variants": variants_out,
        }

    finally:
        for path in {tmp_path, converted_path}:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except OSError:
                    pass


async def process_jams_annotation(
    file_bytes: bytes,
    filename: str,
    tuning: str = "standard",
    capo: int = 0,
    difficulty: str = "expert",
) -> dict:
    """Execute JAMS file parsing pipeline with dynamic solver support and variant generation."""
    request_id = f"{filename}-{int(time.time())}"
    logger.info("request_id=%s event=process_jams_start filename=%s tuning=%s capo=%d difficulty=%s", request_id, filename, tuning, capo, difficulty)
    t_request = time.perf_counter()

    with tempfile.NamedTemporaryFile(suffix=".jams", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        result = _timed("jams_processing", process_jams_file, tmp_path)
        loop = asyncio.get_running_loop()

        note_events = result.get("notes", [])
        chords = result.get("chords", [])
        key_label = result.get("key_signature", "C major")

        tab_segments, notes_out = await loop.run_in_executor(
            _executor,
            lambda: _timed(
                "prox_viterbi_transformer", assign_notes_to_fretboard,
                note_events, chords=chords, key_label=key_label,
                tuning=tuning, capo=capo, difficulty=difficulty,
            ),
        )

        header = tab_capo_header(tuning, capo)
        ascii_tab = header + "\n\n" + _timed(
            "ascii_render", render_tab_segments, tab_segments
        )

        raw_variants = await loop.run_in_executor(
            _executor,
            lambda: _timed(
                "fingering_variants", get_fingering_variants,
                note_events, chords=chords, key_label=key_label,
                tuning=tuning, capo=capo, difficulty=difficulty,
            ),
        )

        variants_out = [
            {
                "label": v["label"],
                "tab_segments": v["tab_segments"],
                "notes": v["notes"],
                "ascii_tab": header + "\n\n" + render_tab_segments(v["tab_segments"]),
            }
            for v in raw_variants
        ]

        total = time.perf_counter() - t_request
        logger.info("request_id=%s event=process_jams_done total_s=%.3f", request_id, total)

        return {
            "key_signature": key_label,
            "key_confidence": "from_jams",
            "tempo_bpm": result.get("tempo"),
            "tuning": tuning,
            "capo": capo,
            "difficulty": difficulty,
            "chords": chords,
            "tab_segments": tab_segments,
            "notes": notes_out,
            "ascii_tab": ascii_tab,
            "variants": variants_out,
        }

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


async def process_audio_transcription_pinned(
    note_events: list,
    tuning: str = "standard",
    capo: int = 0,
    difficulty: str = "expert",
    key_label: str = None,
    chords: list = None,
    pins: dict = None,
    delete: list = None,
    request_id: str = "internal",
) -> dict:
    """
    Execute pinned re-decoding pipeline given a list of note_events.
    """
    if chords is None:
        chords = []

    loop = asyncio.get_running_loop()
    tab_segments, notes_out = await loop.run_in_executor(
        _executor,
        lambda: assign_notes_to_fretboard_pinned(
            note_events,
            chords=chords,
            key_label=key_label,
            tuning=tuning,
            capo=capo,
            difficulty=difficulty,
            pins=pins,
            delete=delete,
        ),
    )

    header = tab_capo_header(tuning, capo)
    ascii_tab = header + "\n\n" + render_tab_segments(tab_segments)

    return {
        "key_signature": key_label or "",
        "tuning": tuning,
        "capo": capo,
        "difficulty": difficulty,
        "chords": chords,
        "tab_segments": tab_segments,
        "notes": notes_out,
        "ascii_tab": ascii_tab,
    }
