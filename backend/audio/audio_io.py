# audio_io.py
# Normalize uploaded browser/mobile audio (webm/ogg/m4a/mp3/...) to WAV so
# Basic Pitch + librosa can load it without a system ffmpeg install.
#
# Local Windows often lacks ffmpeg on PATH; Docker images ship it. We prefer
# imageio-ffmpeg's bundled binary, then fall back to a system `ffmpeg`.

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from typing import Optional, Tuple

logger = logging.getLogger("fretwork")

# Formats soundfile / librosa can usually open without ffmpeg.
_NATIVE_EXTS = {".wav", ".flac", ".ogg", ".aiff", ".aif"}

# Browser MediaRecorder + common upload types that need decoding.
_NEEDS_CONVERT_EXTS = {".webm", ".m4a", ".mp4", ".mp3", ".aac", ".opus", ".wma"}


def _ffmpeg_exe() -> Optional[str]:
    """Return a usable ffmpeg executable path, or None."""
    system = shutil.which("ffmpeg")
    if system:
        return system
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as exc:
        logger.warning("imageio_ffmpeg unavailable: %s", exc)
        return None


def _can_load_with_soundfile(path: str) -> bool:
    try:
        import soundfile as sf

        info = sf.info(path)
        return info.frames > 0 and info.samplerate > 0
    except Exception:
        return False


def ensure_wav(src_path: str, suffix_hint: str = "") -> Tuple[str, Optional[str]]:
    """
    Ensure `src_path` is a WAV file librosa/Basic Pitch can open.

    Returns:
        (wav_path, temp_path_to_cleanup_or_None)
        If conversion was needed, wav_path is a new temp file and the second
        value is that path (caller must delete it). Otherwise (src_path, None).
    """
    ext = os.path.splitext(src_path)[1].lower()
    if not ext and suffix_hint:
        ext = suffix_hint.lower() if suffix_hint.startswith(".") else f".{suffix_hint.lower()}"

    # Fast path: already a native format that opens cleanly.
    if ext in _NATIVE_EXTS and _can_load_with_soundfile(src_path):
        return src_path, None

    # Also accept unknown extensions if soundfile can read them (e.g. mislabeled wav).
    if ext not in _NEEDS_CONVERT_EXTS and _can_load_with_soundfile(src_path):
        return src_path, None

    ff = _ffmpeg_exe()
    if not ff:
        raise RuntimeError(
            "This audio format (e.g. WebM from browser recording) needs ffmpeg "
            "to decode, but none is available. Install ffmpeg, or re-upload a "
            "WAV/MP3 file."
        )

    out_fd, out_path = tempfile.mkstemp(suffix=".wav")
    os.close(out_fd)

    cmd = [
        ff,
        "-y",
        "-i",
        src_path,
        "-ac",
        "1",
        "-ar",
        "22050",
        "-sample_fmt",
        "s16",
        out_path,
    ]
    try:
        result = subprocess.run(
            cmd,
            check=False,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except subprocess.TimeoutExpired as exc:
        _safe_unlink(out_path)
        raise RuntimeError("Audio conversion timed out while decoding the recording.") from exc
    except OSError as exc:
        _safe_unlink(out_path)
        raise RuntimeError(f"Failed to run ffmpeg for audio conversion: {exc}") from exc

    if result.returncode != 0 or not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
        _safe_unlink(out_path)
        stderr = (result.stderr or "").strip().splitlines()
        tail = stderr[-3:] if stderr else []
        hint = " ".join(tail) if tail else "unknown ffmpeg error"
        raise RuntimeError(
            f"Could not decode uploaded audio ({ext or 'unknown format'}). "
            f"Try exporting as WAV/MP3. Details: {hint}"
        )

    logger.info(
        "event=audio_converted src_ext=%s out_bytes=%d",
        ext or "unknown",
        os.path.getsize(out_path),
    )
    return out_path, out_path


def _safe_unlink(path: str) -> None:
    try:
        if path and os.path.exists(path):
            os.unlink(path)
    except OSError:
        pass
