# backend/tests/test_theory_config.py
import json
from pathlib import Path
import backend.fretboard.config as cfg

def test_theory_config_alignment():
    config_path = Path(__file__).resolve().parent.parent.parent / "config" / "theory_config.json"
    assert config_path.exists(), "config/theory_config.json does not exist"
    
    with open(config_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)
        
    assert cfg.MAX_FRET == raw_data["max_fret"]
    assert cfg.STANDARD_TUNING == raw_data["standard_tuning"]
    assert cfg.STRING_NAMES == raw_data["string_names"]
    assert cfg.STRING_DISPLAY_LABELS == raw_data["string_display_labels"]
    assert cfg.TUNINGS == raw_data["tunings"]
    
    erg = raw_data["ergonomics"]
    assert cfg.COMFORTABLE_SPAN == erg["comfortable_span"]
    assert cfg.MAX_REACHABLE_SPAN == erg["max_reachable_span"]
    assert cfg.LARGE_JUMP_THRESHOLD == erg["large_jump_threshold"]
    assert cfg.MAX_GROUP_CANDIDATES == erg["max_group_candidates"]
    assert cfg.ONSET_TOLERANCE_SECONDS == erg["onset_tolerance_seconds"]
