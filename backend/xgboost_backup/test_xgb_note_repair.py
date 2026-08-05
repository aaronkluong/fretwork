"""
test_xgb_note_repair.py — unit tests for XGBoost (v2) note repair pre-decoder filter.
"""

import time
import pytest
from pathlib import Path
import backend.app as app
import backend.transcribe as transcribe
try:
    import backend.xgboost_backup.feature_extraction as fe
except ImportError:
    import feature_extraction as fe


def test_feature_extraction_shape():
    mock_notes = [
        {"start": 0.0, "end": 0.5, "duration": 0.5, "midi": 60, "amplitude": 0.8},
        {"start": 0.5, "end": 1.0, "duration": 0.5, "midi": 64, "amplitude": 0.7},
        {"start": 1.0, "end": 1.5, "duration": 0.5, "midi": 67, "amplitude": 0.9},
    ]
    feats = fe.extract_8_features(mock_notes, detected_key=0, dadagp_priors={}, total_bigrams=1.0)
    assert feats.shape == (3, 8)


def test_xgboost_backup_artifacts_exist():
    import joblib
    import json
    backup_dir = Path(__file__).parent
    assert (backup_dir / "xgb_v2_note_repair.joblib").exists()
    assert (backup_dir / "scaler.joblib").exists()
    assert (backup_dir / "dadagp_priors.json").exists()


def test_xgb_note_repair_filter_and_latency():
    import joblib
    import json
    ml_docs_dir = Path(__file__).parent
    xgb_model = joblib.load(ml_docs_dir / "xgb_v2_note_repair.joblib")
    scaler = joblib.load(ml_docs_dir / "scaler.joblib")
    with open(ml_docs_dir / "dadagp_priors.json", "r", encoding="utf-8") as f:
        raw_priors = json.load(f)
        dadagp_priors = {
            tuple(int(x) for x in k.split("_")): float(v)
            for k, v in raw_priors.get("priors", {}).items()
        }
        dadagp_total = float(raw_priors.get("total_bigrams", 1.0))

    mock_notes = [
        {"start": 0.0, "end": 0.5, "duration": 0.5, "midi": 60, "note_name": "C4", "amplitude": 0.95},
        {"start": 0.5, "end": 0.52, "duration": 0.02, "midi": 24, "note_name": "C1", "amplitude": 0.01}, # Likely phantom / octave error
        {"start": 0.6, "end": 1.1, "duration": 0.5, "midi": 64, "note_name": "E4", "amplitude": 0.85},
    ]

    t0 = time.perf_counter()
    repaired = transcribe.apply_xgb_note_repair(
        mock_notes,
        key_pc=0,
        xgb_model=xgb_model,
        scaler=scaler,
        dadagp_priors=dadagp_priors,
        total_bigrams=dadagp_total,
    )
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    assert isinstance(repaired, list)
    # Check execution speed is well within acceptable limits (< 500ms on un-warmed test runner CPU)
    assert elapsed_ms < 500.0
