# XGBoost Note Repair Pre-Decoder Adjudicator

> **Note on Active Architecture:**
> The live production backend uses **Upstream Heuristic Curation + TabTransformer Position Prior (`prox_viterbi_transformer`)** as documented in [results.md](file:///C:/Users/kobby/Downloads/Grad/guitar_capstone/docs/results.md).
> 
> This directory (`backend/xgboost_backup`) maintains the pre-trained artifacts, feature extraction logic, test suite, and implementation documentation for **XGBoost Note Repair** as an alternative ultra-fast CPU inference path.

---

## 1. Overview & Motivation

Audio-to-tab transcription models (such as Basic Pitch) frequently introduce artifacts:
* **Phantom Notes:** Tiny onset clicks or string noise detected as low-amplitude pitch events.
* **Octave Slips:** Harmonic overtones misclassified as pitches 12, 19, or 24 semitones above the fundamental.

While the production backend resolves playability and arrangement accuracy using a deep neural `TabTransformer` sequence prior ($~5.0\text{ s/track}$ inference latency with beam search width $k=8$), **XGBoost Note Repair** provides an ultra-lightweight gradient-boosted classifier that evaluates note validity **before decoding** in under **$0.002\text{ seconds}$ per note batch** ($~0.171\text{ s/track}$ total latency).

If the backend ever needs to prioritize **ultra-fast CPU inference** or run in constrained edge environments without neural sequence evaluation overhead, XGBoost Note Repair can be plugged directly into the transcription pipeline.

---

## 2. Benchmark & Evaluation Summary

Evaluated across **GuitarSet** (in-distribution LOPO cross-validation) and **GAPS** (zero-shot out-of-distribution benchmark) in [unified_evaluation.ipynb](file:///C:/Users/kobby/Downloads/Grad/guitar_capstone/jupyter_notebooks/unified_evaluation.ipynb) and [results.md](file:///C:/Users/kobby/Downloads/Grad/guitar_capstone/docs/results.md):

| Pipeline Configuration | Pre-Decoder Filter / Repair | Decoder / Prior | Train Time (s) | Total Latency (per track) | GuitarSet Exact Tab Accuracy |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Baseline** | None (Raw Notes) | Standard Viterbi | N/A | 0.189 s | 58.49% |
| **Heuristic** | Upstream Rule Filters | Standard Viterbi | N/A | 0.113 s | 60.85% |
| **Production TabTransformer** | Upstream Heuristics | `TabTransformer` Beam ($k=8$) | N/A | 4.985 s | **65.29%** |
| **Neural (MLP)** | MLP Note Adjudicator | Standard Viterbi | 4.54 s | 0.123 s | 59.79% |
| **XGBoost (v2)** | **XGBoost (v2) Adjudicator** | Standard Viterbi | **0.35 s** | **0.171 s** | **60.55%** |
| **XGBoost + Transformer**| XGBoost (v2) Adjudicator | `TabTransformer` Beam ($k=8$) | 0.35 s | 5.343 s | **61.78%** |

### Key Trade-offs:
1. **Training Efficiency:** XGBoost trains in **$0.35\text{ seconds}$**, compared to $4.54\text{ s}$ for MLP and several minutes for neural models.
2. **Speed vs. Deep Context:** XGBoost + Viterbi runs in $0.171\text{ s/track}$ and achieves $60.55\%$ accuracy, outperforming the raw baseline ($58.49\%$) while remaining $30\times$ faster than deep sequence beam search.

---

## 3. Directory Artifacts

The `backend/xgboost_backup` directory contains all assets required to load, run, and test the XGBoost model:

* **`xgb_v2_note_repair.joblib`**: Serialized XGBoost v2 binary classification model trained to predict note validity ($1 = \text{Valid}$, $0 = \text{Phantom / Slip}$).
* **`scaler.joblib`**: Serialized `sklearn.preprocessing.StandardScaler` matching the 8 extraction feature distributions.
* **`dadagp_priors.json`**: JSON file containing distilled DadaGP bigram transition counts and total count statistics used to evaluate transition prior probabilities (`prior_prob`).
* **`feature_extraction.py`**: Python module extracting the 8 acoustic and sequence features per transcribed note.
* **`test_xgb_note_repair.py`**: Pytest unit test suite verifying model load, feature extraction shapes, filtering decisions, and latency limits.

---

## 4. Feature Extraction Design (8 Features)

Each candidate note event from audio transcription is converted into an 8-element feature vector ($X \in \mathbb{R}^{N \times 8}$):

1. **`amp_rank`**: Normalized percentile rank of the note's amplitude relative to all detected notes in the track ($0.0 - 1.0$).
2. **`duration`**: Note duration in seconds ($\text{end} - \text{start}$).
3. **`register_distance`**: Absolute difference in MIDI pitch between the note and the local median MIDI pitch in a 9-note sliding window.
4. **`in_key`**: Binary indicator ($1.0$ or $0.0$) specifying whether the pitch class belongs to the detected key scale.
5. **`is_overtone`**: Binary indicator ($1.0$ or $0.0$) detecting whether a simultaneous note exists at $+12$, $+19$, or $+24$ semitones with higher amplitude.
6. **`prior_prob`**: Bigram transition probability $P(m_i \mid m_{i-1})$ calculated against the DadaGP transition priors.
7. **`ioi`**: Inter-onset interval (seconds between the start of the current note and the previous note).
8. **`note_density`**: Count of neighboring notes starting within $\pm 100\text{ ms}$ of the current note.

---

## 5. How to Enable XGBoost Note Repair in the Backend

If you wish to activate XGBoost Note Repair inside [backend/transcribe.py](file:///C:/Users/kobby/Downloads/Grad/guitar_capstone/backend/transcribe.py):

```python
import joblib
import json
from pathlib import Path
from backend.transcribe import apply_xgb_note_repair

# 1. Load artifacts from backend/xgboost_backup
ml_docs_dir = Path("backend/xgboost_backup")
xgb_model = joblib.load(ml_docs_dir / "xgb_v2_note_repair.joblib")
scaler = joblib.load(ml_docs_dir / "scaler.joblib")

with open(ml_docs_dir / "dadagp_priors.json", "r", encoding="utf-8") as f:
    raw_priors = json.load(f)
    dadagp_priors = {
        tuple(int(x) for x in k.split("_")): float(v)
        for k, v in raw_priors.get("priors", {}).items()
    }
    total_bigrams = float(raw_priors.get("total_bigrams", 1.0))

# 2. Filter notes before fretboard decoding
repaired_notes = apply_xgb_note_repair(
    notes=transcribed_notes,
    key_pc=detected_key_pc,
    xgb_model=xgb_model,
    scaler=scaler,
    dadagp_priors=dadagp_priors,
    total_bigrams=total_bigrams,
    valid_threshold=0.058 # Tuned threshold from unified_evaluation.ipynb
)
```

---

## 6. Running Unit Tests

To run the XGBoost note repair unit tests:

```bash
pytest backend/xgboost_backup/test_xgb_note_repair.py
```
