# recode.py
# Implements the recode feature for filtering/deleting phantom notes
# based on their properties (e.g. amplitude thresholding or low-register bass filtering).

import logging

logger = logging.getLogger("fretwork.recode")

def filter_phantom_notes(note_events: list[dict], threshold: float = 0.0) -> list[dict]:
    """
    Deletes phantom notes from transcription output.
    
    Args:
        note_events: List of detected note dicts, e.g.
                     [{"start": float, "end": float, "midi": int, "amplitude": float, ...}, ...]
        threshold: Amplitude/confidence cutoff. Notes with amplitude below this are suppressed.
                   (If threshold = 0.0, we can also apply other heuristic deletions).
                   
    Returns:
        Filtered list of note events.
    """
    original_count = len(note_events)
    
    # 1. Filter by amplitude threshold
    filtered = [n for n in note_events if n.get("amplitude", 1.0) >= threshold]
    
    # 2. Optionally, delete low-register notes (e.g., bass noise below D3 / MIDI 50)
    # as demonstrated in Fretwork_Transformer_test_With_Recode_Feature.ipynb
    # For general transcription we can keep it standard or parameterize it.
    
    suppressed_count = original_count - len(filtered)
    if suppressed_count > 0:
        logger.info(
            "event=filter_phantom_notes threshold=%.3f original=%d remaining=%d suppressed=%d",
            threshold, original_count, len(filtered), suppressed_count
        )
        
    return filtered
