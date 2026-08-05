# backend/feature_extraction.py
# 8-feature extraction logic for note event pre-decoder classification

import gzip
import json
import math
from collections import defaultdict
from pathlib import Path
import numpy as np
import pandas as pd

# Open string MIDI notes for standard tuning E2 A2 D4 G4 B4 E5
OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]

def load_dadagp_priors(dadagp_dir: Path):
    """
    Compile DadaGP bigram transition priors from distilled shard files.
    Returns (dadagp_priors, total_bigrams)
    """
    dadagp_priors = defaultdict(float)
    total_bigrams = 1.0

    if dadagp_dir.exists():
        shard_files = sorted(list(dadagp_dir.glob("shard_*.jsonl.gz")))
        for shard_file in shard_files:
            try:
                with gzip.open(shard_file, "rt") as f:
                    for line in f:
                        data = json.loads(line)
                        notes = []
                        for item in data.get("events", []):
                            if item[0] == "g":
                                for s, f_val in item[1]:
                                    notes.append(OPEN_STRING_MIDI[s] + f_val)
                        for i in range(len(notes) - 1):
                            bigram = (notes[i], notes[i+1])
                            dadagp_priors[bigram] += 1.0
                            total_bigrams += 1.0
            except Exception:
                pass
    return dadagp_priors, total_bigrams

def get_transition_prior(m1, m2, dadagp_priors, total_bigrams):
    val = dadagp_priors.get((m1, m2), 0.0)
    return max(1e-5, (val + 1.0) / (total_bigrams + 128))

def extract_8_features(bp_notes: list, detected_key: int, dadagp_priors: dict, total_bigrams: float) -> np.ndarray:
    """
    Extract standard 8-feature representation per note event.
    Features:
      1. amp_rank
      2. duration
      3. register_distance
      4. in_key
      5. is_overtone
      6. prior_prob
      7. ioi
      8. note_density
    """
    if not bp_notes:
        return np.empty((0, 8))

    amplitudes = [n["amplitude"] for n in bp_notes]
    sorted_amps = sorted(amplitudes)
    key_scale = [(detected_key + interval) % 12 for interval in [0, 2, 4, 5, 7, 9, 11]]

    features = []
    for i, tn in enumerate(bp_notes):
        # 1. amp_rank
        amp_rank = sum(1 for a in sorted_amps if a < tn["amplitude"]) / len(amplitudes)
        
        # 2. duration
        duration = float(tn.get("duration", tn.get("end", tn["start"] + 0.1) - tn["start"]))
        
        # 3. register_distance
        window_midis = [w["midi"] for j, w in enumerate(bp_notes) if max(0, i-4) <= j < min(len(bp_notes), i+5) and j != i]
        local_median = np.median(window_midis) if window_midis else tn["midi"]
        register_distance = abs(tn["midi"] - local_median)
        
        # 4. in_key
        pitch_class = tn["midi"] % 12
        in_key = 1.0 if (pitch_class in key_scale) else 0.0
        
        # 5. is_overtone
        is_overtone = 0.0
        for other in bp_notes:
            if abs(tn["start"] - other["start"]) <= 0.050:
                if tn["midi"] - other["midi"] in [12, 19, 24]:
                    if other["amplitude"] > tn["amplitude"]:
                        is_overtone = 1.0
                        break
                        
        # 6. prior_prob
        prev_midi = bp_notes[i-1]["midi"] if i > 0 else tn["midi"]
        prior_prob = get_transition_prior(prev_midi, tn["midi"], dadagp_priors, total_bigrams)
        
        # 7. ioi
        ioi = tn["start"] - bp_notes[i-1]["start"] if i > 0 else 0.0
        
        # 8. note_density
        note_density = sum(1.0 for other in bp_notes if abs(tn["start"] - other["start"]) <= 0.1)
        
        features.append([
            amp_rank,
            duration,
            register_distance,
            in_key,
            is_overtone,
            prior_prob,
            ioi,
            note_density
        ])

    return np.array(features)
