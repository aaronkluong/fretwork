# backend/audio/stem_separation.py
# Optional Demucs audio stem separation service for isolating guitar tracks.
# Matches July21.ipynb Cell 14 (htdemucs_6s guitar stem extraction).

import logging
import os
import shutil
import subprocess
import sys
from pathlib import Path

logger = logging.getLogger("fretwork.stem_separation")

_CACHE_DIR = Path(__file__).parent.parent / "audio_cache" / "separated_stems"


def is_demucs_available() -> bool:
    """Check if demucs package is installed in the current environment."""
    try:
        import demucs  # noqa: F401
        return True
    except ImportError:
        return False


def separate_guitar_stem(
    audio_path: str,
    stem: str = "guitar",
    model_name: str = "htdemucs_6s",
    use_cache: bool = True,
) -> str:
    """
    Separate a target stem (default: 'guitar') from a mixed audio file.

    If demucs is available, extracts the target stem and returns the path to
    the isolated WAV file. If demucs is unavailable or separation fails, logs
    a warning and gracefully returns the original audio_path.
    """
    audio_path = Path(audio_path).resolve()
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    # Check cache
    safe_name = audio_path.stem.replace("/", "_").replace("\\", "_")
    target_dir = _CACHE_DIR / safe_name
    cached_stem = target_dir / f"{stem}.wav"

    if use_cache and cached_stem.exists() and cached_stem.stat().st_size > 0:
        logger.info("event=stem_cache_hit audio=%s stem=%s path=%s", safe_name, stem, cached_stem)
        return str(cached_stem)

    if not is_demucs_available():
        logger.warning(
            "demucs package not installed; bypassing stem separation for %s", audio_path.name
        )
        return str(audio_path)

    logger.info("event=demucs_separation_start audio=%s model=%s stem=%s", audio_path.name, model_name, stem)
    target_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Run demucs separation CLI
        cmd = [
            sys.executable,
            "-m",
            "demucs",
            "-n",
            model_name,
            "--two-stems",
            stem,
            "-o",
            str(target_dir),
            str(audio_path),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if res.returncode != 0:
            logger.warning("demucs separation failed code=%d stderr=%s", res.returncode, res.stderr)
            return str(audio_path)

        # Demucs places files in target_dir / model_name / audio_stem / stem.wav
        separated_file = target_dir / model_name / safe_name / f"{stem}.wav"
        if not separated_file.exists():
            # Search for any generated stem wav file
            found = list(target_dir.glob(f"**/{stem}.wav"))
            if found:
                separated_file = found[0]

        if separated_file.exists() and separated_file.stat().st_size > 0:
            shutil.copy(separated_file, cached_stem)
            logger.info("event=demucs_separation_done cached_to=%s", cached_stem)
            return str(cached_stem)
        else:
            logger.warning("separated stem file not found at %s", separated_file)
            return str(audio_path)

    except Exception as exc:
        logger.warning("stem separation failed with exception: %s", exc)
        return str(audio_path)
