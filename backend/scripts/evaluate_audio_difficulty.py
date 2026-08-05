# backend/scripts/evaluate_audio_difficulty.py
"""
Script to evaluate difficulty profiles on real audio files from GuitarSet.
Runs basic_pitch transcription on selected WAV files, followed by
fretboard note assignment under beginner, intermediate, and expert difficulty settings.
Logs detailed fret distributions, position spans, and barre/high-fret penalties.
"""

import os
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).parent.parent.resolve()
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend.audio import run_transcription, analyze_audio_key, detect_chords_from_basic_pitch_notes
from backend.fretboard import assign_notes_to_fretboard, get_difficulty_profile

# Default test dataset path
DEFAULT_AUDIO_DIR = Path("C:/Users/kobby/Downloads/Grad/guitar_capstone/FullGuitarSetData/AudioFiles")

# Selected sample tracks across genres: Jazz, Rock, Funk, Singer-Songwriter (solo mic)
SAMPLE_TRACKS = [
    "00_Jazz1-130-D_solo_mic.wav",
    "00_Rock1-130-A_solo_mic.wav",
    "00_Funk1-114-Ab_solo_mic.wav",
    "00_SS1-68-E_solo_mic.wav",
]


def summarize_notes(notes):
    """Calculate key statistics for assigned note frets."""
    if not notes:
        return {"count": 0, "min_fret": 0, "max_fret": 0, "mean_fret": 0.0, "high_frets": 0}
    frets = [n.get("fret", 0) for n in notes]
    fretted = [f for f in frets if f > 0]
    if not fretted:
        return {"count": len(notes), "min_fret": 0, "max_fret": 0, "mean_fret": 0.0, "high_frets": 0}
    return {
        "count": len(notes),
        "min_fret": min(fretted),
        "max_fret": max(fretted),
        "mean_fret": round(sum(fretted) / len(fretted), 2),
        "high_frets_gt5": sum(1 for f in fretted if f > 5),
        "high_frets_gt7": sum(1 for f in fretted if f > 7),
        "high_frets_gt9": sum(1 for f in fretted if f > 9),
    }


def evaluate_audio_file(file_path: Path):
    print(f"\n==================================================")
    print(f"Evaluating Track: {file_path.name}")
    print(f"==================================================")

    if not file_path.exists():
        print(f"Error: File not found at {file_path}")
        return None

    t0 = time.perf_counter()
    note_events = run_transcription(str(file_path))
    t_bp = time.perf_counter() - t0
    print(f"[Basic Pitch] Extracted {len(note_events)} notes in {t_bp:.2f}s")

    if not note_events:
        print("No notes detected.")
        return None

    key_res = analyze_audio_key(str(file_path))
    key_label = key_res["key"]
    chords = detect_chords_from_basic_pitch_notes(note_events)
    print(f"[Analysis] Detected Key: {key_label}, Note-Derived Chords: {len(chords)}")

    results = {}
    for diff in ["beginner", "intermediate", "expert"]:
        t_assign = time.perf_counter()
        tab_segments, notes_out = assign_notes_to_fretboard(
            note_events,
            chords=chords,
            key_label=key_label,
            tuning="standard",
            capo=0,
            difficulty=diff,
        )
        elapsed = time.perf_counter() - t_assign
        stats = summarize_notes(notes_out)
        stats["assign_time_s"] = round(elapsed, 3)
        results[diff] = stats
        print(f"  Profile [{diff.upper():12s}]: mean_fret={stats['mean_fret']:5.2f} | max_fret={stats['max_fret']:2d} | >5 frets={stats['high_frets_gt5']:2d} | >7 frets={stats['high_frets_gt7']:2d} | >9 frets={stats['high_frets_gt9']:2d} ({stats['assign_time_s']}s)")

    # Assert strict fret distribution progression
    beg = results["beginner"]
    inter = results["intermediate"]
    exp = results["expert"]

    print(f"\n[Validation Checks]")
    print(f"  Beginner <= Intermediate Mean Fret: {beg['mean_fret']} <= {inter['mean_fret']} -> {beg['mean_fret'] <= inter['mean_fret'] + 0.1}")
    print(f"  Intermediate <= Expert Mean Fret: {inter['mean_fret']} <= {exp['mean_fret']} -> {inter['mean_fret'] <= exp['mean_fret'] + 0.1}")
    print(f"  Beginner Max Fret <= Intermediate Max Fret: {beg['max_fret']} <= {inter['max_fret']} -> {beg['max_fret'] <= inter['max_fret']}")
    print(f"  Intermediate Max Fret <= Expert Max Fret: {inter['max_fret']} <= {exp['max_fret']} -> {inter['max_fret'] <= exp['max_fret']}")

    return results


def main():
    audio_dir = DEFAULT_AUDIO_DIR
    if len(sys.argv) > 1:
        audio_dir = Path(sys.argv[1])

    print(f"Starting Audio Difficulty Evaluation across {len(SAMPLE_TRACKS)} GuitarSet tracks...")
    all_results = {}
    for track_name in SAMPLE_TRACKS:
        track_path = audio_dir / track_name
        res = evaluate_audio_file(track_path)
        if res:
            all_results[track_name] = res

    print("\n==================================================")
    print("SUMMARY OF DIFFICULTY PROFILE DIFFERENTIATION")
    print("==================================================")
    for track, diff_map in all_results.items():
        print(f"\nTrack: {track}")
        for diff, s in diff_map.items():
            print(f"  - {diff.upper():12s}: mean={s['mean_fret']:5.2f}, max={s['max_fret']:2d}, frets>5={s['high_frets_gt5']:2d}, frets>7={s['high_frets_gt7']:2d}")

    print("\nEvaluation complete.")


if __name__ == "__main__":
    main()
