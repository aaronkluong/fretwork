# Related Work

Notes on external papers/projects relevant to the fretboard assignment
algorithm (`backend/fretboard.py`, `combined_all_tuned`). Kept for reference
when tuning the playability/position-prior cost functions or planning future
improvements.

## Automatic Guitar Transcription With Deep Neural Networks (IEEE Access 2025)

- **Link:** 10.1109/ACCESS.2025.3583646
- **Authors:** Simone Chieppa, Pierpaolo Brutti, Rui Pedro Paiva
- **What it is:** A note-level automatic guitar transcription model using a conformer architecture with self-attention and beat-informed quantization. The study highlights the data scarcity problem in guitar transcription and introduces the "GM Dataset" for diverse, real-world evaluation.
- **Relevance:**
  - Employs a state-of-the-art conformer-based model (similar to the direction of advanced AMT).
  - Validates that increasing attention heads doesn't automatically improve performance, emphasizing data quantity and quality.
  - Suggests potential for incorporating BPM estimation instead of beat-informed quantization as a future improvement.
  - Provides a strategy for data augmentation and using diverse datasets to handle real-world audio conditions.
- **Status:** High relevance for current efforts to improve Basic Pitch's F1 score and generalization.

## FretboardFlow (ISMIR 2025)

- **Link:** https://ismir2025program.ismir.net/poster_266.html
- **Authors:** Marcel Vélez Vásquez, Mariëlle Baelemans, Jonathan Driedger, John Ashley Burgoyne
- **What it is:** A dataset + dual-branch Bi-LSTM/GRU model that predicts the
  next guitar chord *voicing* (fretboard fingering) given the chord
  progression and recent fretboard history. Built from 97 songs recorded with
  a hexaphonic pickup (per-string audio -> ground-truth string/fret for every
  note, not just pitch).
- **Relevance:**
  - Their core problem ("given the current chord and where the hand just was,
    what's the next comfortable voicing?") is the same problem our
    `tuned_transition_cost_matrix` hand-engineers, and that Ani's
    hand-position-window Viterbi targets differently.
  - The hexaphonic dataset, if released, would be a much richer source for
    `position_prior_cost` / a future `position_prior_2nd` than GuitarSet,
    since it has full chord-progression context per recording.
- **Caveat:** reviewers noted no human/perceptual validation - only automatic
  metrics, so treat reported accuracy numbers cautiously.
- **Status:** dataset/code availability not yet checked - follow up if we want
  to use it for retraining the position prior.

## "An Algorithm for Optimal Guitar Fingering" (KTH bachelor's thesis)

- **Link:** https://www.diva-portal.org/smash/get/diva2:668903/FULLTEXT01.pdf
- **What it is:** Builds a graph where each note becomes one node per possible
  string/fret position (e.g. a treble A produces 3x4 = 12 candidate nodes),
  connects consecutive notes' candidate nodes with edges, and runs dynamic
  programming with a rule-based cost function (designed with guitar teacher
  Mårten Falk) to find the easiest-to-play path. Limited to **monophonic**
  music. Evaluated by having a guitar teacher (Anders Eriksson, Lidingö Music
  School) play the output for 5 classical pieces - all fully playable, with a
  few awkward spots.
- **Relevance:**
  - Essentially a simpler, monophonic precursor to our
    candidate-graph + Viterbi/DP approach in `assign_combined_all_tuned`.
  - Their "novice prefers first position / open strings" heuristic
    corroborates our `old_theory_cost` open-string/low-position bonuses.
  - **Key limitation they call out: the cost function is short-sighted - only
    the immediately adjacent note affects the transition cost.** This is the
    same first-order limitation my shelved `combined_all_tuned_v2` experiment
    (second-order position prior) and Ani's CAGED-box hand-position-window
    state both attempt to address, from different angles.
  - Their human-playability evaluation methodology (have a real guitar
    teacher play and critique the output) is worth considering as a
    complement to `exact_position_acc` against GuitarSet ground truth.
