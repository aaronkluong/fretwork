# Production-Grade Guitar Chord Reference & Playability Guide

This document is a complete, mathematically validated, and symmetrical reference database for guitar chords. It contains consistent coverage across all chromatic roots, detailed playability metadata (intervals, notes, open/muted counts, CAGED shape family, and barres), and corrected visual fingering coordinate mappings.

---

## Data Conventions

### Enharmonic Spelling Policy
All note spellings use **simplified enharmonic equivalents** aligned with the sharp-biased chromatic scale:
> `C · C# · D · D# · E · F · F# · G · G# · A · A# · B`

Double-sharps (𝄪), double-flats (𝄫), and theoretical enharmonics (e.g., `E#`, `Fb`, `Cb`, `Fx`) are **never used**. Simplified equivalents are always preferred for app readability and to match the backend `PITCH_CLASS_NAMES_SHARP` convention:

| Theoretical | Simplified Used Here |
| :--- | :--- |
| E# | F |
| B# | C |
| Fx (F𝄪) | G |
| Cx (C𝄪) | D |
| Cb | B |
| Fb | E |

### Finger Numbering Key
All numeric finger references in the Machine-Readable Supplement use this convention:

| Number | Finger |
| :--- | :--- |
| `0` | Open string (no finger) |
| `1` | Index |
| `2` | Middle |
| `3` | Ring |
| `4` | Pinky |
| `5` | Thumb (over the neck) |

### Mini-Barre Definition
A **mini-barre** is a partial index-finger barre across 2–4 strings at the same fret (rather than a full 5- or 6-string barre). It is marked `[mini-barre]` in the Unified Finger Layout column. Presence of a mini-barre across **≥ 3 strings** upgrades difficulty to at least **Intermediate**.

### Extended Section Scope
The *Extended, Altered, Inverted & Suspended Dominants* table contains **representative movable voicings**, not a fully symmetric 12-root expansion. Because these shapes are movable, any root can be derived by shifting the shape up by the appropriate number of semitones from C (or from whichever root is shown). The `startsAtFret` value in the Machine-Readable Supplement indicates the root position. Shapes marked **(Open Shape)** use open strings and **cannot be transposed** by simple fret-shifting.

---

## Difficulty Classification Legend

| Difficulty | Description | Ergonomic Criteria |
| :--- | :--- | :--- |
| **Beginner** | Basic open positions. No barre required. | Uses open strings, requires 3 or fewer fingers, span within 3 frets. Mini-barre across 1–2 strings at a single fret is still Beginner. |
| **Intermediate** | Simple barre chords and standard movable shapes. | Requires a full barre OR a mini-barre across **≥ 3 strings**, span within 4 frets, minor finger stretches. |
| **Expert** | Jazz voicings, extended chords, and complex thumb-wrap shapes. | Requires thumb wrapping, complex internal muting, stretch spans of 4+ frets, or advanced finger independence. |

> **Tiebreaker rule:** If a chord uses a mini-barre across exactly 2 strings with a fret span of 0–1 and no other stretch, it remains **Beginner**. Mini-barre across ≥ 3 strings at any span → **Intermediate**.

---

## Unified Finger Layout Format
All fingering instructions are listed sequentially from low-pitch string to high-pitch string:
*   `6th (Low E) $\to$ 5th (A) $\to$ 4th (D) $\to$ 3rd (G) $\to$ 2nd (B) $\to$ 1st (High E)`
*   Muted or unplayed strings are skipped in the description.
*   A `[mini-barre]` suffix on a finger entry indicates that finger presses multiple strings at the same fret in a partial barre.
*   Numeric finger codes (0–5) are used in the Machine-Readable Supplement. See the **Finger Numbering Key** above.

---

## Master Chord Variations Lookup Table

| Root | Type | Variation Name | Tab (Low E $\to$ High E) | Unified Finger Layout | Difficulty | Notes | Intervals | L Fret | H Fret | Barre | Thumb | CAGED | Bass | Movable | Playability Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **C** | Major | Open C | `x-3-2-0-1-0` | 5th: Ring (3), 4th: Middle (2), 2nd: Index (1) | **Beginner** | C,E,G | 1,3,5 | 0 | 3 | No | No | C | C | No | Classic open shape. Very comfortable. |
| **C** | Major | C Major Barre | `x-3-5-5-5-3` | 5th: Index (3), 4th: Ring (5) [mini-barre], 3rd: Ring (5) [mini-barre], 2nd: Ring (5) [mini-barre], 1st: Index (3) | **Intermediate** | C,G,C,E,G | 1,5,1,3,5 | 3 | 5 | Yes | No | A | C | Yes | 5-string barre on fret 3 (Index); Ring mini-barre covers strings 4, 3, 2 at fret 5. |
| **C** | Minor | C Minor Barre | `x-3-5-5-4-3` | 5th: Index (3), 4th: Ring (5), 3rd: Pinky (5), 2nd: Middle (4), 1st: Index (3) | **Intermediate** | C,G,C,Eb,G | 1,5,1,b3,5 | 3 | 5 | Yes | No | A | C | Yes | Standard minor barre shape at fret 3. |
| **C** | 7 | Open C7 | `x-3-2-3-1-0` | 5th: Ring (3), 4th: Middle (2), 3rd: Pinky (3), 2nd: Index (1) | **Beginner** | C,E,Bb,C,E | 1,3,b7,1,3 | 0 | 3 | No | No | C | C | No | Open C shape adding the flat 7th (Bb) on the G string. |
| **C** | maj7 | Open Cmaj7 | `x-3-2-0-0-0` | 5th: Ring (3), 4th: Middle (2) | **Beginner** | C,E,G,B,E | 1,3,5,7,3 | 0 | 3 | No | No | C | C | No | Leaves the B and high E strings open. |
| **C** | min7 | Cm7 Barre | `x-3-5-3-4-3` | 5th: Index (3), 4th: Ring (5), 3rd: Index (3), 2nd: Middle (4), 1st: Index (3) | **Intermediate** | C,G,Bb,Eb,G | 1,5,b7,b3,5 | 3 | 5 | Yes | No | A | C | Yes | Minor 7th barre shape on the 3rd fret. |
| **C** | sus2 | Csus2 (Open) | `x-3-0-0-3-3` | 5th: Index (3), 2nd: Ring (3), 1st: Pinky (3) | **Beginner** | C,D,G,D,G | 1,2,5,2,5 | 0 | 3 | No | No | C | C | No | Open suspended 2nd chord voicing. |
| **C** | sus4 | Csus4 (Barre) | `x-3-5-5-6-3` | 5th: Index (3), 4th: Ring (5), 3rd: Ring (5), 2nd: Pinky (6), 1st: Index (3) | **Intermediate** | C,G,C,F,G | 1,5,1,4,5 | 3 | 6 | Yes | No | A | C | Yes | **Fixed**: Pinky plays the 2nd string at fret 6. |
| **C** | 5 | C5 Power Chord | `x-3-5-5-x-x` | 5th: Index (3), 4th: Ring (5), 3rd: Pinky (5) | **Beginner** | C,G,C | 1,5,1 | 3 | 5 | No | No | A | C | Yes | Standard 5th power chord shape. |
| **C#/Db** | Major | C# Barre | `x-4-6-6-6-4` | 5th: Index (4), 4th: Ring (6), 3rd: Ring (6), 2nd: Ring (6), 1st: Index (4) | **Intermediate** | C#,G#,C#,F,G# | 1,5,1,3,5 | 4 | 6 | Yes | No | A | C# | Yes | Movable A-shape major barre at fret 4. |
| **C#/Db** | Minor | C#m Barre | `x-4-6-6-5-4` | 5th: Index (4), 4th: Ring (6), 3rd: Pinky (6), 2nd: Middle (5), 1st: Index (4) | **Intermediate** | C#,G#,C#,E,G# | 1,5,1,b3,5 | 4 | 6 | Yes | No | A | C# | Yes | Standard minor shape barre at fret 4. |
| **C#/Db** | 7 | C#7 Barre | `x-4-6-4-6-4` | 5th: Index (4), 4th: Ring (6), 3rd: Index (4), 2nd: Pinky (6), 1st: Index (4) | **Intermediate** | C#,G#,B,F,G# | 1,5,b7,3,5 | 4 | 6 | Yes | No | A | C# | Yes | Dominant 7th shape barre at fret 4. |
| **C#/Db** | maj7 | C#maj7 Barre | `x-4-6-5-6-4` | 5th: Index (4), 4th: Ring (6), 3rd: Middle (5), 2nd: Pinky (6), 1st: Index (4) | **Intermediate** | C#,G#,C#,F,G# | 1,5,7,3,5 | 4 | 6 | Yes | No | A | C# | Yes | Major 7th shape barre at fret 4. |
| **C#/Db** | min7 | C#m7 Barre | `x-4-6-4-5-4` | 5th: Index (4), 4th: Ring (6), 3rd: Index (4), 2nd: Middle (5), 1st: Index (4) | **Intermediate** | C#,G#,B,E,G# | 1,5,b7,b3,5 | 4 | 6 | Yes | No | A | C# | Yes | Minor 7th shape barre at fret 4. |
| **C#/Db** | sus2 | C#sus2 Barre | `x-4-6-6-4-4` | 5th: Index (4), 4th: Ring (6), 3rd: Pinky (6), 2nd: Index (4), 1st: Index (4) | **Intermediate** | C#,G#,C#,D#,G# | 1,5,1,2,5 | 4 | 6 | Yes | No | A | C# | Yes | Movable suspended 2nd barre shape at fret 4. |
| **C#/Db** | sus4 | C#sus4 Barre | `x-4-6-6-7-4` | 5th: Index (4), 4th: Ring (6), 3rd: Ring (6), 2nd: Pinky (7), 1st: Index (4) | **Intermediate** | C#,G#,C#,F#,G# | 1,5,1,4,5 | 4 | 7 | Yes | No | A | C# | Yes | Suspended 4th shape barre chord at fret 4. |
| **C#/Db** | 5 | C#5 Power Chord | `x-4-6-6-x-x` | 5th: Index (4), 4th: Ring (6), 3rd: Pinky (6) | **Beginner** | C#,G#,C# | 1,5,1 | 4 | 6 | No | No | A | C# | Yes | Power chord shape on the 4th fret. |
| **D** | Major | Open D | `x-x-0-2-3-2` | 3rd: Index (2), 2nd: Ring (3), 1st: Middle (2) | **Beginner** | D,A,D,F# | 1,5,1,3 | 0 | 3 | No | No | D | D | No | Standard open major chord. |
| **D** | Minor | Open Dm | `x-x-0-2-3-1` | 3rd: Middle (2), 2nd: Ring (3), 1st: Index (1) | **Beginner** | D,A,D,F | 1,5,1,b3 | 0 | 3 | No | No | D | D | No | Standard open minor shape. |
| **D** | 7 | Open D7 | `x-x-0-2-1-2` | 3rd: Middle (2), 2nd: Index (1), 1st: Ring (2) | **Beginner** | D,A,C,F# | 1,5,b7,3 | 0 | 3 | No | No | D | D | No | Classic open dominant 7th shape. |
| **D** | maj7 | Open Dmaj7 | `x-x-0-2-2-2` | 3rd: Index (2) [mini-barre], 2nd: Index (2) [mini-barre], 1st: Index (2) [mini-barre] | **Intermediate** | D,A,C#,F# | 1,5,7,3 | 2 | 2 | Yes | No | D | D | No | Mini-barre on fret 2 across 3 strings (G, B, High E). ≥ 3-string mini-barre = Intermediate. |
| **D** | min7 | Open Dm7 | `x-x-0-2-1-1` | 3rd: Middle (2), 2nd: Index (1) [mini-barre], 1st: Index (1) [mini-barre] | **Beginner** | D,A,C,F | 1,5,b7,b3 | 1 | 2 | Yes | No | D | D | No | Mini-barre on fret 1 across 2 strings (B, High E). 2-string mini-barre = Beginner. |
| **D** | sus2 | Open Dsus2 | `x-x-0-2-3-0` | 3rd: Index (2), 2nd: Ring (3) | **Beginner** | D,A,D,E | 1,5,1,2 | 0 | 3 | No | No | D | D | No | Open suspended 2nd chord voicing. |
| **D** | sus4 | Open Dsus4 | `x-x-0-2-3-3` | 3rd: Index (2), 2nd: Ring (3), 1st: Pinky (3) | **Beginner** | D,A,D,G | 1,5,1,4 | 2 | 3 | No | No | D | D | No | Suspended 4th shape resolution chord. |
| **D** | 5 | D5 Power Chord | `x-5-7-7-x-x` | 5th: Index (5), 4th: Ring (7), 3rd: Pinky (7) | **Beginner** | D,A,D | 1,5,1 | 5 | 7 | No | No | A | D | Yes | Power chord shape on the 5th fret. |
| **D#/Eb** | Major | Eb Barre | `x-6-8-8-8-6` | 5th: Index (6), 4th: Ring (8), 3rd: Ring (8), 2nd: Ring (8), 1st: Index (6) | **Intermediate** | Eb,Bb,Eb,G,Bb | 1,5,1,3,5 | 6 | 8 | Yes | No | A | Eb | Yes | Movable major barre chord at the 6th fret. |
| **D#/Eb** | Minor | Ebm Barre | `x-6-8-8-7-6` | 5th: Index (6), 4th: Ring (8), 3rd: Pinky (8), 2nd: Middle (7), 1st: Index (6) | **Intermediate** | Eb,Bb,Eb,Gb,Bb | 1,5,1,b3,5 | 6 | 8 | Yes | No | A | Eb | Yes | Minor shape barre chord at the 6th fret. |
| **D#/Eb** | 7 | Eb7 Barre | `x-6-8-6-8-6` | 5th: Index (6), 4th: Ring (8), 3rd: Index (6), 2nd: Pinky (8), 1st: Index (6) | **Intermediate** | Eb,Bb,Db,G,Bb | 1,5,b7,3,5 | 6 | 8 | Yes | No | A | Eb | Yes | Dominant 7th shape barre at the 6th fret. |
| **D#/Eb** | maj7 | Ebmaj7 Barre | `x-6-8-7-8-6` | 5th: Index (6), 4th: Ring (8), 3rd: Middle (7), 2nd: Pinky (8), 1st: Index (6) | **Intermediate** | Eb,Bb,D,G,Bb | 1,5,7,3,5 | 6 | 8 | Yes | No | A | Eb | Yes | Major 7th shape barre at the 6th fret. |
| **D#/Eb** | min7 | Ebm7 Barre | `x-6-8-6-7-6` | 5th: Index (6), 4th: Ring (8), 3rd: Index (6), 2nd: Middle (7), 1st: Index (6) | **Intermediate** | Eb,Bb,Db,Gb,Bb | 1,5,b7,b3,5 | 6 | 8 | Yes | No | A | Eb | Yes | Minor 7th shape barre at the 6th fret. |
| **D#/Eb** | sus2 | Ebsus2 Barre | `x-6-8-8-6-6` | 5th: Index (6), 4th: Ring (8), 3rd: Pinky (8), 2nd: Index (6), 1st: Index (6) | **Intermediate** | Eb,Bb,Eb,F,Bb | 1,5,1,2,5 | 6 | 8 | Yes | No | A | Eb | Yes | Suspended 2nd shape barre chord at fret 6. |
| **D#/Eb** | sus4 | Ebsus4 Barre | `x-6-8-8-9-6` | 5th: Index (6), 4th: Ring (8), 3rd: Ring (8), 2nd: Pinky (9), 1st: Index (6) | **Intermediate** | Eb,Bb,Eb,Ab,Bb | 1,5,1,4,5 | 6 | 9 | Yes | No | A | Eb | Yes | Suspended 4th shape barre chord at fret 6. |
| **D#/Eb** | 5 | Eb5 Power Chord | `x-6-8-8-x-x` | 5th: Index (6), 4th: Ring (8), 3rd: Pinky (8) | **Beginner** | Eb,Bb,Eb | 1,5,1 | 6 | 8 | No | No | A | Eb | Yes | Power chord shape on the 6th fret. |
| **E** | Major | Open E | `0-2-2-1-0-0` | 5th: Middle (2), 4th: Ring (2), 3rd: Index (1) | **Beginner** | E,B,E,G#,B,E | 1,5,1,3,5,1 | 0 | 2 | No | No | E | E | No | Warm baseline open major chord. |
| **E** | Minor | Open Em | `0-2-2-0-0-0` | 5th: Middle (2), 4th: Ring (2) | **Beginner** | E,B,E,G,B,E | 1,5,1,b3,5,1 | 0 | 2 | No | No | E | E | No | Standard open minor chord. |
| **E** | 7 | Open E7 | `0-2-0-1-0-0` | 5th: Middle (2), 3rd: Index (1) | **Beginner** | E,B,D,G#,B,E | 1,5,b7,3,5,1 | 0 | 2 | No | No | E | E | No | Open dominant 7th chord. |
| **E** | maj7 | Open Emaj7 | `0-2-1-1-0-0` | 5th: Ring (2), 4th: Index (1), 3rd: Index (1) | **Beginner** | E,B,D#,G#,B,E | 1,5,7,3,5,1 | 0 | 2 | Yes | No | E | E | No | Uses flat index finger on fret 1. |
| **E** | min7 | Open Em7 | `0-2-0-0-0-0` | 5th: Middle (2) | **Beginner** | E,B,D,G,B,E | 1,5,b7,b3,5,1 | 0 | 2 | No | No | E | E | No | Leaves 5 strings open. |
| **E** | sus2 | Open Esus2 | `0-2-4-4-0-0` | 5th: Middle (2), 4th: Pinky (4), 3rd: Ring (4) | **Beginner** | E,B,F#,B,E | 1,5,2,5,1 | 0 | 4 | No | No | E | E | No | **Fixed**: Corrected Esus2 open shape. |
| **E** | sus4 | Open Esus4 | `0-2-2-2-0-0` | 5th: Middle (2), 4th: Ring (2), 3rd: Pinky (2) | **Beginner** | E,B,E,A,B,E | 1,5,1,4,5,1 | 0 | 2 | No | No | E | E | No | Suspended 4th resolution chord. |
| **E** | 5 | E5 Power Chord | `0-2-2-x-x-x` | 5th: Index (2), 4th: Middle (2) | **Beginner** | E,B,E | 1,5,1 | 0 | 2 | No | No | E | E | No | Open power chord. |
| **F** | Major | F Major Barre | `1-3-3-2-1-1` | 6th: Index (1), 5th: Ring (3), 4th: Pinky (3), 3rd: Middle (2), 2nd: Index (1), 1st: Index (1) | **Intermediate** | F,C,F,A,C,F | 1,5,1,3,5,1 | 1 | 3 | Yes | No | E | F | Yes | Full 6-string barre chord on fret 1. |
| **F** | Minor | F Minor Barre | `1-3-3-1-1-1` | 6th: Index (1), 5th: Ring (3), 4th: Pinky (3), 3rd: Index (1), 2nd: Index (1), 1st: Index (1) | **Intermediate** | F,C,F,Ab,C,F | 1,5,1,b3,5,1 | 1 | 3 | Yes | No | E | F | Yes | Minor shape barre chord at fret 1. |
| **F** | 7 | F7 Barre | `1-3-1-2-1-1` | 6th: Index (1), 5th: Ring (3), 4th: Index (1), 3rd: Middle (2), 2nd: Index (1), 1st: Index (1) | **Intermediate** | F,C,Eb,A,C,F | 1,5,b7,3,5,1 | 1 | 3 | Yes | No | E | F | Yes | Dominant 7th shape barre at fret 1. |
| **F** | maj7 | Open Fmaj7 | `x-x-3-2-1-0` | 4th: Ring (3), 3rd: Middle (2), 2nd: Index (1) | **Beginner** | F,A,C,E | 1,3,5,7 | 0 | 3 | No | No | F | F | No | Easy layout with open High E. |
| **F** | min7 | Fm7 Barre | `1-3-1-1-1-1` | 6th: Index (1), 5th: Ring (3), 4th: Index (1), 3rd: Index (1), 2nd: Index (1), 1st: Index (1) | **Intermediate** | F,C,Eb,Ab,C,F | 1,5,b7,b3,5,1 | 1 | 3 | Yes | No | E | F | Yes | Minor 7th shape barre at fret 1. |
| **F** | sus2 | Fsus2 Barre | `x-8-10-10-8-8` | 5th: Index (8), 4th: Ring (10), 3rd: Pinky (10), 2nd: Index (8), 1st: Index (8) | **Intermediate** | F,C,F,G,C | 1,5,1,2,5 | 8 | 10 | Yes | No | A | F | Yes | A-shape suspended 2nd barre chord. |
| **F** | sus4 | Fsus4 Barre | `1-3-3-3-1-1` | 6th: Index (1), 5th: Ring (3), 4th: Pinky (3), 3rd: Ring (3), 2nd: Index (1), 1st: Index (1) | **Intermediate** | F,C,F,Bb,C,F | 1,5,1,4,5,1 | 1 | 3 | Yes | No | E | F | Yes | Suspended 4th barre shape at fret 1. |
| **F** | 5 | F5 Power Chord | `1-3-3-x-x-x` | 6th: Index (1), 5th: Ring (3), 4th: Pinky (3) | **Beginner** | F,C,F | 1,5,1 | 1 | 3 | No | No | E | F | Yes | Power chord shape on the 1st fret. |
| **F#/Gb** | Major | F# Barre | `2-4-4-3-2-2` | 6th: Index (2), 5th: Ring (4), 4th: Pinky (4), 3rd: Middle (3), 2nd: Index (2), 1st: Index (2) | **Intermediate** | F#,C#,F#,A#,C#,F# | 1,5,1,3,5,1 | 2 | 4 | Yes | No | E | F# | Yes | Movable 6-string major barre at fret 2. |
| **F#/Gb** | Minor | F#m Barre | `2-4-4-2-2-2` | 6th: Index (2), 5th: Ring (4), 4th: Pinky (4), 3rd: Index (2), 2nd: Index (2), 1st: Index (2) | **Intermediate** | F#,C#,F#,A,C#,F# | 1,5,1,b3,5,1 | 2 | 4 | Yes | No | E | F# | Yes | Minor shape barre chord at fret 2. |
| **F#/Gb** | 7 | F#7 Barre | `2-4-2-3-2-2` | 6th: Index (2), 5th: Ring (4), 4th: Index (2), 3rd: Middle (3), 2nd: Index (2), 1st: Index (2) | **Intermediate** | F#,C#,E,A#,C#,F# | 1,5,b7,3,5,1 | 2 | 4 | Yes | No | E | F# | Yes | Dominant 7th shape barre at fret 2. |
| **F#/Gb** | maj7 | F#maj7 Barre | `2-4-3-3-2-2` | 6th: Index (2), 5th: Pinky (4), 4th: Ring (3), 3rd: Middle (3), 2nd: Index (2), 1st: Index (2) | **Intermediate** | F#,C#,F,A#,C#,F# | 1,5,7,3,5,1 | 2 | 4 | Yes | No | E | F# | Yes | **Fixed**: Corrected index finger conflict. |
| **F#/Gb** | min7 | F#m7 Barre | `2-4-2-2-2-2` | 6th: Index (2), 5th: Ring (4), 4th: Index (2), 3rd: Index (2), 2nd: Index (2), 1st: Index (2) | **Intermediate** | F#,C#,E,A,C#,F# | 1,5,b7,b3,5,1 | 2 | 4 | Yes | No | E | F# | Yes | Minor 7th shape barre chord at fret 2. |
| **F#/Gb** | sus2 | F#sus2 Barre | `x-9-11-11-9-9` | 5th: Index (9), 4th: Ring (11), 3rd: Pinky (11), 2nd: Index (9), 1st: Index (9) | **Intermediate** | F#,C#,F#,G#,C# | 1,5,1,2,5 | 9 | 11 | Yes | No | A | F# | Yes | Suspended 2nd shape barre chord at fret 9. |
| **F#/Gb** | sus4 | F#sus4 Barre | `2-4-4-4-2-2` | 6th: Index (2), 5th: Ring (4), 4th: Pinky (4), 3rd: Ring (4), 2nd: Index (2), 1st: Index (2) | **Intermediate** | F#,C#,F#,B,C#,F# | 1,5,1,4,5,1 | 2 | 4 | Yes | No | E | F# | Yes | Suspended 4th shape barre chord at fret 2. |
| **F#/Gb** | 5 | F#5 Power Chord | `2-4-4-x-x-x` | 6th: Index (2), 5th: Ring (4), 4th: Pinky (4) | **Beginner** | F#,C#,F# | 1,5,1 | 2 | 4 | No | No | E | F# | Yes | Movable power chord at fret 2. |
| **G** | Major | Open G | `3-2-0-0-0-3` | 6th: Ring (3), 5th: Middle (2), 1st: Pinky (3) | **Beginner** | G,B,D,G,B,G | 1,3,5,1,3,1 | 0 | 3 | No | No | G | G | No | Standard open major chord. |
| **G** | Minor | G Minor Barre | `3-5-5-3-3-3` | 6th: Index (3), 5th: Ring (5), 4th: Pinky (5), 3rd: Index (3), 2nd: Index (3), 1st: Index (3) | **Intermediate** | G,D,G,Bb,D,G | 1,5,1,b3,5,1 | 3 | 5 | Yes | No | E | G | Yes | Minor shape barre chord at fret 3. |
| **G** | 7 | Open G7 | `3-2-0-0-0-1` | 6th: Ring (3), 5th: Middle (2), 1st: Index (1) | **Beginner** | G,B,D,G,B,F | 1,3,5,1,3,b7 | 0 | 3 | No | No | G | G | No | Open dominant 7th shape. |
| **G** | maj7 | Open Gmaj7 | `3-2-0-0-0-2` | 6th: Ring (3), 5th: Middle (2), 1st: Index (2) | **Beginner** | G,B,D,G,B,F# | 1,3,5,1,3,7 | 0 | 3 | No | No | G | G | No | Easy open major 7th chord. |
| **G** | min7 | Gm7 Barre | `3-5-3-3-3-3` | 6th: Index (3), 5th: Ring (5), 4th: Index (3), 3rd: Index (3), 2nd: Index (3), 1st: Index (3) | **Intermediate** | G,D,F,Bb,D,G | 1,5,b7,b3,5,1 | 3 | 5 | Yes | No | E | G | Yes | Minor 7th shape barre at fret 3. |
| **G** | sus2 | Gsus2 Barre | `x-10-12-12-10-10` | 5th: Index (10), 4th: Ring (12), 3rd: Pinky (12), 2nd: Index (10), 1st: Index (10) | **Intermediate** | G,D,G,A,D | 1,5,1,2,5 | 10 | 12 | Yes | No | A | G | Yes | A-shape suspended 2nd barre at fret 10. |
| **G** | sus4 | Open Gsus4 | `3-x-0-0-1-3` | 6th: Ring (3), 2nd: Index (1), 1st: Pinky (3) | **Beginner** | G,D,G,C,G | 1,5,1,4,1 | 0 | 3 | No | No | G | G | No | Suspended 4th chord voicing. |
| **G** | 5 | G5 Power Chord | `3-5-5-x-x-x` | 6th: Index (3), 5th: Ring (5), 4th: Pinky (5) | **Beginner** | G,D,G | 1,5,1 | 3 | 5 | No | No | E | G | Yes | Power chord shape on the 3rd fret. |
| **G#/Ab** | Major | G# Barre | `4-6-6-5-4-4` | 6th: Index (4), 5th: Ring (6), 4th: Pinky (6), 3rd: Middle (5), 2nd: Index (4), 1st: Index (4) | **Intermediate** | G#,D#,G#,C,D#,G# | 1,5,1,3,5,1 | 4 | 6 | Yes | No | E | G# | Yes | Corrected G#/Ab Major barre at fret 4. |
| **G#/Ab** | Minor | G#m Barre | `4-6-6-4-4-4` | 6th: Index (4), 5th: Ring (6), 4th: Pinky (6), 3rd: Index (4), 2nd: Index (4), 1st: Index (4) | **Intermediate** | G#,D#,G#,B,D#,G# | 1,5,1,b3,5,1 | 4 | 6 | Yes | No | E | G# | Yes | Minor shape barre chord at fret 4. |
| **G#/Ab** | 7 | G#7 Barre | `4-6-4-5-4-4` | 6th: Index (4), 5th: Ring (6), 4th: Index (4), 3rd: Middle (5), 2nd: Index (4), 1st: Index (4) | **Intermediate** | G#,D#,F#,C,D#,G# | 1,5,b7,3,5,1 | 4 | 6 | Yes | No | E | G# | Yes | Dominant 7th shape barre at fret 4. |
| **G#/Ab** | maj7 | G#maj7 Barre | `4-6-5-5-4-4` | 6th: Index (4), 5th: Pinky (6), 4th: Ring (5), 3rd: Middle (5), 2nd: Index (4), 1st: Index (4) | **Intermediate** | G#,D#,G,C,D#,G# | 1,5,7,3,5,1 | 4 | 6 | Yes | No | E | G# | Yes | **Fixed**: Corrected index finger conflict. |
| **G#/Ab** | min7 | G#m7 Barre | `4-6-4-4-4-4` | 6th: Index (4), 5th: Ring (6), 4th: Index (4), 3rd: Index (4), 2nd: Index (4), 1st: Index (4) | **Intermediate** | G#,D#,F#,B,D#,G# | 1,5,b7,b3,5,1 | 4 | 6 | Yes | No | E | G# | Yes | Minor 7th shape barre chord at fret 4. |
| **G#/Ab** | sus2 | G#sus2 Barre | `x-11-13-13-11-11` | 5th: Index (11), 4th: Ring (13), 3rd: Pinky (13), 2nd: Index (11), 1st: Index (11) | **Intermediate** | G#,D#,G#,A#,D# | 1,5,1,2,5 | 11 | 13 | Yes | No | A | G# | Yes | Suspended 2nd shape barre chord at fret 11. |
| **G#/Ab** | sus4 | G#sus4 Barre | `4-6-6-6-4-4` | 6th: Index (4), 5th: Ring (6), 4th: Pinky (6), 3rd: Ring (6), 2nd: Index (4), 1st: Index (4) | **Intermediate** | G#,D#,G#,C#,D#,G# | 1,5,1,4,5,1 | 4 | 6 | Yes | No | E | G# | Yes | Suspended 4th shape barre chord at fret 4. |
| **G#/Ab** | 5 | G#5 Power Chord | `4-6-6-x-x-x` | 6th: Index (4), 5th: Ring (6), 4th: Pinky (6) | **Beginner** | G#,D#,G# | 1,5,1 | 4 | 6 | No | No | E | G# | Yes | Movable power chord at fret 4. |
| **A** | Major | Open A | `x-0-2-2-2-0` | 4th: Index (2), 3rd: Middle (2), 2nd: Ring (2) | **Beginner** | A,E,A,C#,E | 1,5,1,3,5 | 0 | 2 | No | No | A | A | No | Stacks 3 fingers on the 2nd fret. |
| **A** | Minor | Open Am | `x-0-2-2-1-0` | 4th: Middle (2), 3rd: Ring (2), 2nd: Index (1) | **Beginner** | A,E,A,C,E | 1,5,1,b3,5 | 0 | 2 | No | No | A | A | No | Standard open minor chord. |
| **A** | 7 | Open A7 | `x-0-2-0-2-0` | 4th: Middle (2), 2nd: Ring (2) | **Beginner** | A,E,G,C#,E | 1,5,b7,3,5 | 0 | 2 | No | No | A | A | No | Two-finger dominant 7th shape. |
| **A** | maj7 | Open Amaj7 | `x-0-2-1-2-0` | 4th: Middle (2), 3rd: Index (1), 2nd: Ring (2) | **Beginner** | A,E,G#,C#,E | 1,5,7,3,5 | 0 | 2 | No | No | A | A | No | Open major 7th chord. |
| **A** | min7 | Open Am7 | `x-0-2-0-1-0` | 4th: Middle (2), 2nd: Index (1) | **Beginner** | A,E,G,C,E | 1,5,b7,b3,5 | 0 | 2 | No | No | A | A | No | Easy open minor 7th shape. |
| **A** | sus2 | Open Asus2 | `x-0-2-2-0-0` | 4th: Middle (2), 3rd: Ring (2) | **Beginner** | A,E,A,B,E | 1,5,1,2,5 | 0 | 2 | No | No | A | A | No | Open suspended 2nd chord voicing. |
| **A** | sus4 | Open Asus4 | `x-0-2-2-3-0` | 4th: Middle (2), 3rd: Ring (2), 2nd: Pinky (3) | **Beginner** | A,E,A,D,E | 1,5,1,4,5 | 0 | 3 | No | No | A | A | No | Suspended 4th chord shape. |
| **A** | 5 | A5 Power Chord | `x-0-2-2-x-x` | 4th: Index (2), 3rd: Middle (2) | **Beginner** | A,E,A | 1,5,1 | 0 | 2 | No | No | A | A | No | Open power chord. |
| **A#/Bb** | Major | Bb Barre | `x-1-3-3-3-1` | 5th: Index (1), 4th: Ring (3), 3rd: Ring (3), 2nd: Ring (3), 1st: Index (1) | **Intermediate** | Bb,F,Bb,D,F | 1,5,1,3,5 | 1 | 3 | Yes | No | A | Bb | Yes | Barre chord at the 1st fret. |
| **A#/Bb** | Minor | Bbm Barre | `x-1-3-3-2-1` | 5th: Index (1), 4th: Ring (3), 3rd: Pinky (3), 2nd: Middle (2), 1st: Index (1) | **Intermediate** | Bb,F,Bb,Db,F | 1,5,1,b3,5 | 1 | 3 | Yes | No | A | Bb | Yes | Minor shape barre chord at fret 1. |
| **A#/Bb** | 7 | Bb7 Barre | `x-1-3-1-3-1` | 5th: Index (1), 4th: Ring (3), 3rd: Index (1), 2nd: Pinky (3), 1st: Index (1) | **Intermediate** | Bb,F,Ab,D,F | 1,5,b7,3,5 | 1 | 3 | Yes | No | A | Bb | Yes | Dominant 7th shape barre at fret 1. |
| **A#/Bb** | maj7 | Bbmaj7 Barre | `x-1-3-2-3-1` | 5th: Index (1), 4th: Ring (3), 3rd: Middle (2), 2nd: Pinky (3), 1st: Index (1) | **Intermediate** | Bb,F,A,D,F | 1,5,7,3,5 | 1 | 3 | Yes | No | A | Bb | Yes | Major 7th shape barre at fret 1. |
| **A#/Bb** | min7 | Bbm7 Barre | `x-1-3-1-2-1` | 5th: Index (1), 4th: Ring (3), 3rd: Index (1), 2nd: Middle (2), 1st: Index (1) | **Intermediate** | Bb,F,Ab,Db,F | 1,5,b7,b3,5 | 1 | 3 | Yes | No | A | Bb | Yes | Minor 7th shape barre at fret 1. |
| **A#/Bb** | sus2 | Bbsus2 Barre | `x-1-3-3-1-1` | 5th: Index (1), 4th: Ring (3), 3rd: Pinky (3), 2nd: Index (1), 1st: Index (1) | **Intermediate** | Bb,F,Bb,C,F | 1,5,1,2,5 | 1 | 3 | Yes | No | A | Bb | Yes | Suspended 2nd shape barre at fret 1. |
| **A#/Bb** | sus4 | Bbsus4 Barre | `x-1-3-3-4-1` | 5th: Index (1), 4th: Ring (3), 3rd: Ring (3), 2nd: Pinky (4), 1st: Index (1) | **Intermediate** | Bb,F,Bb,Eb,F | 1,5,1,4,5 | 1 | 4 | Yes | No | A | Bb | Yes | Suspended 4th shape barre at fret 1. |
| **A#/Bb** | 5 | Bb5 Power Chord | `x-1-3-3-x-x` | 5th: Index (1), 4th: Ring (3), 3rd: Pinky (3) | **Beginner** | Bb,F,Bb | 1,5,1 | 1 | 3 | No | No | A | Bb | Yes | Power chord shape on the 1st fret. |
| **B** | Major | B Major Barre | `x-2-4-4-4-2` | 5th: Index (2), 4th: Ring (4), 3rd: Ring (4), 2nd: Ring (4), 1st: Index (2) | **Intermediate** | B,F#,B,D#,F# | 1,5,1,3,5 | 2 | 4 | Yes | No | A | B | Yes | Major barre shape at the 2nd fret. |
| **B** | Minor | B Minor Barre | `x-2-4-4-3-2` | 5th: Index (2), 4th: Ring (4), 3rd: Pinky (4), 2nd: Middle (3), 1st: Index (2) | **Intermediate** | B,F#,B,D,F# | 1,5,1,b3,5 | 2 | 4 | Yes | No | A | B | Yes | Minor barre shape at the 2nd fret. |
| **B** | 7 | Open B7 | `x-2-1-2-0-2` | 5th: Middle (2), 4th: Index (1), 3rd: Ring (2), 1st: Pinky (2) | **Beginner** | B,D#,A,B,F# | 1,3,b7,1,5 | 0 | 2 | No | No | B | B | No | 4-finger shape in open position. |
| **B** | maj7 | Bmaj7 Barre | `x-2-4-3-4-2` | 5th: Index (2), 4th: Ring (4), 3rd: Middle (3), 2nd: Pinky (4), 1st: Index (2) | **Intermediate** | B,F#,A#,D#,F# | 1,5,7,3,5 | 2 | 4 | Yes | No | A | B | Yes | Major 7th barre shape on the 2nd fret. |
| **B** | min7 | Bm7 Barre | `x-2-4-2-3-2` | 5th: Index (2), 4th: Ring (4), 3rd: Index (2), 2nd: Middle (3), 1st: Index (2) | **Intermediate** | B,F#,A,D,F# | 1,5,b7,b3,5 | 2 | 4 | Yes | No | A | B | Yes | Minor 7th barre shape on the 2nd fret. |
| **B** | sus2 | Bsus2 Barre | `x-2-4-4-2-2` | 5th: Index (2), 4th: Ring (4), 3rd: Pinky (4), 2nd: Index (2), 1st: Index (2) | **Intermediate** | B,F#,B,C#,F# | 1,5,1,2,5 | 2 | 4 | Yes | No | A | B | Yes | Suspended 2nd shape barre chord at fret 2. |
| **B** | sus4 | Bsus4 Barre | `x-2-4-4-5-2` | 5th: Index (2), 4th: Ring (4), 3rd: Ring (4), 2nd: Pinky (5), 1st: Index (2) | **Intermediate** | B,F#,B,E,F# | 1,5,1,4,5 | 2 | 5 | Yes | No | A | B | Yes | Suspended 4th shape barre chord at fret 2. |
| **B** | 5 | B5 Power Chord | `x-2-4-4-x-x` | 5th: Index (2), 4th: Ring (4), 3rd: Pinky (4) | **Beginner** | B,F#,B | 1,5,1 | 2 | 4 | No | No | A | B | Yes | Power chord rooted on the 2nd fret. |

---

## Extended, Altered, Inverted & Suspended Dominants (App-Ready Extensions)

> **Transposition Guide (Symmetry via Movable Shapes):**
> All shapes in this section marked `Movable = Yes` are **position-independent**. To derive any root not shown, shift the entire voicing up the neck by the semitone distance between the displayed root and the target root.
>
> **Formula:** `targetStartFret = displayedStartFret + (targetRootPC - displayedRootPC) mod 12`
>
> | Semitones from C | Root |
> | :--- | :--- |
> | 0 | C |
> | 1 | C# |
> | 2 | D |
> | 3 | D# |
> | 4 | E |
> | 5 | F |
> | 6 | F# |
> | 7 | G |
> | 8 | G# |
> | 9 | A |
> | 10 | A# |
> | 11 | B |
>
> ⚠️ **Exception: Open Shapes cannot be transposed:** Shapes marked **(Open Shape)** in the Variation Name use open strings and require a different voicing for other roots. Affected rows: `Cadd9 (Open Shape)`.

| Root | Type | Variation Name | Tab (Low E $\to$ High E) | Unified Finger Layout | Difficulty | Notes | Intervals | L Fret | H Fret | Barre | Thumb | CAGED | Bass | Movable | Playability Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **C** | maj9 | Cmaj9 (Jazz Shape) | `x-3-2-4-3-x` | 5th: Middle (3), 4th: Index (2), 3rd: Pinky (4), 2nd: Ring (3) | **Expert** | C,E,B,D | 1,3,7,2 | 2 | 4 | No | No | A | C | Yes | Jazz major 9th voicing. Needs internal string mutes. |
| **C** | 9 | C9 (Jazz/Funk Shape) | `x-3-2-3-3-3` | 5th: Middle (3), 4th: Index (2), 3rd: Ring (3) [mini-barre], 2nd: Ring (3) [mini-barre], 1st: Ring (3) [mini-barre] | **Intermediate** | C,E,Bb,D,G | 1,3,b7,2,5 | 2 | 3 | Yes | No | A | C | Yes | Ring mini-barre covers strings 3, 2, 1 at fret 3. ≥ 3-string mini-barre = Intermediate. |
| **A** | min9 | Am9 (Full Movable) | `5-7-5-5-5-7` | 6th: Index (5), 5th: Ring (7), 4th: Index (5), 3rd: Index (5), 2nd: Index (5), 1st: Pinky (7) | **Intermediate** | A,E,G,C,E,B | 1,5,b7,b3,5,2 | 5 | 7 | Yes | No | E | A | Yes | **Fixed**: Complete Am9 shape with index barre. |
| **C** | add9 | Cadd9 (Open Shape) | `x-3-2-0-3-0` | 5th: Ring (3), 4th: Middle (2), 2nd: Pinky (3) | **Beginner** | C,E,G,D,E | 1,3,5,2,3 | 0 | 3 | No | No | C | C | No | Popular acoustic open voicing. |
| **A** | 6 | Open A6 | `x-0-2-2-2-2` | 4th: Index (2) [mini-barre], 3rd: Index (2) [mini-barre], 2nd: Index (2) [mini-barre], 1st: Index (2) [mini-barre] | **Intermediate** | A,E,F#,A,C# | 1,5,6,1,3 | 2 | 2 | Yes | No | A | A | No | Mini-barre across 4 strings (D, G, B, High E). ≥ 3-string mini-barre = Intermediate. |
| **A** | min6 | Open Am6 | `x-0-2-2-1-2` | 4th: Middle (2), 3rd: Ring (2), 2nd: Index (1), 1st: Pinky (2) | **Intermediate** | A,E,F#,A,C | 1,5,6,1,b3 | 1 | 2 | No | No | A | A | No | Standard open minor 6th shape. |
| **E** | 7#9 | E7#9 (Standard Hendrix) | `0-7-6-7-8-x` | 5th: Middle (7), 4th: Index (6), 3rd: Ring (7), 2nd: Pinky (8) | **Intermediate** | E,B,G#,D,G | 1,5,3,b7,#2 | 6 | 8 | No | No | C | E | No | **Fixed**: High E string muted for standard rock playability. |
| **G** | 7b9 | G7b9 (Jazz Shape) | `3-x-3-4-3-4` | 6th: Ring (3), 4th: Index (3), 3rd: Pinky (4), 2nd: Index (3), 1st: Middle (4) | **Expert** | G,F,B,D,Ab | 1,b7,3,5,b2 | 3 | 4 | Yes | No | E | G | Yes | Highly dissonant jazz dominant shape. |
| **C** | 7#5 | C7#5 (Altered Shape) | `x-3-x-3-5-4` | 5th: Index (3), 3rd: Middle (3), 2nd: Pinky (5), 1st: Ring (4) | **Expert** | C,Bb,E,Ab | 1,b7,3,#5 | 3 | 5 | No | No | A | C | Yes | **Fixed**: Corrected layout strings to skip muted 4th string. |
| **B** | m7b5 | Bm7b5 (Half-Diminished) | `x-2-3-2-3-x` | 5th: Index (2), 4th: Ring (3), 3rd: Middle (2), 2nd: Pinky (3) | **Intermediate** | B,F,A,D | 1,b5,b7,b3 | 2 | 3 | No | No | A | B | Yes | Movable half-diminished shape. |
| **C** | dim7 | Cdim7 (Fully Diminished) | `x-3-4-2-4-x` | 5th: Index (3), 4th: Ring (4), 3rd: Middle (2), 2nd: Pinky (4) | **Intermediate** | C,Gb,A,Eb | 1,b5,bb7,b3 | 2 | 4 | No | No | A | C | Yes | Movable fully diminished 7th shape. |
| **-** | dim | Movable Diminished Triad | `x-x-1-2-1-x` | 4th: Index (1), 3rd: Ring (2), 2nd: Index (1) | **Intermediate** | root,b3,b5 | 1,b3,b5 | 1 | 2 | No | No | - | root | Yes | Movable dim triad. Root is on the 4th string. |
| **-** | aug | Movable Augmented Triad | `x-x-3-2-2-x` | 4th: Ring (3), 3rd: Middle (2), 2nd: Index (2) | **Intermediate** | root,3,#5 | 1,3,#5 | 2 | 3 | No | No | - | root | Yes | **Fixed**: Corrected Faug augmented shape. Root is on 4th string. |
| **D** | Slash | D/F# (First Inversion) | `2-0-0-2-3-2` | 6th: Thumb (2), 3rd: Middle (2), 2nd: Pinky (3), 1st: Ring (2) | **Intermediate** | F#,A,D,A,D,F# | 3,5,1,5,1,3 | 0 | 3 | No | Yes | D | F# | No | D Major chord with F# (3rd) in the bass. |
| **C** | Slash | C/G (Second Inversion) | `3-3-2-0-1-0` | 6th: Pinky (3), 5th: Ring (3), 4th: Middle (2), 2nd: Index (1) | **Beginner** | G,C,E,G,C,E | 5,1,3,5,1,3 | 0 | 3 | No | No | C | G | No | C Major chord with G (5th) in the bass. |
| **A** | Slash | Am/C (First Inversion) | `x-3-2-2-1-0` | 5th: Pinky (3), 4th: Middle (2), 3rd: Ring (2), 2nd: Index (1) | **Beginner** | C,E,A,C,E | b3,5,1,b3,5 | 0 | 3 | No | No | A | C | No | **Fixed**: Corrected Ring/Pinky finger collision in layout. |
| **G** | min7 | Gm7 Shell Voicing | `3-x-3-3-6-x` | 6th: Index (3), 4th: Middle (3), 3rd: Ring (3), 2nd: Pinky (6) | **Expert** | G,F,Bb,F | 1,b7,b3,b7 | 3 | 6 | No | No | E | G | Yes | **Fixed**: Renamed Gm7 Shell Voicing. |
| **C** | 11 | C11 (Movable Shape) | `x-3-3-3-3-x` | 5th: Index (3) [mini-barre], 4th: Index (3) [mini-barre], 3rd: Index (3) [mini-barre], 2nd: Index (3) [mini-barre] | **Intermediate** | C,F,Bb,D | 1,4,b7,9 | 3 | 3 | Yes | No | A | C | Yes | True dominant C11: rootless Bb major triad (F, Bb, D) over C bass. Full index mini-barre across fret 3. Contains no b3 — contrast with Cm11 below. |
| **C** | min11 | Cm11 (Movable Shape) | `x-3-1-3-3-x` | 5th: Ring (3) [mini-barre], 4th: Index (1), 3rd: Ring (3) [mini-barre], 2nd: Ring (3) [mini-barre] | **Intermediate** | C,Eb,Bb,F | 1,b3,b7,4 | 1 | 3 | Yes | No | A | C | Yes | Ring covers strings 5, 3, 2 at fret 3 (non-contiguous around Index on string 4 at fret 1). Requires independent Ring finger control. |
| **C** | 13 | C13 (Movable Shape) | `x-3-2-3-5-x` | 5th: Middle (3), 4th: Index (2), 3rd: Ring (3), 2nd: Pinky (5) | **Expert** | C,E,Bb,A | 1,3,b7,6 | 2 | 5 | No | No | A | C | Yes | Movable dominant 13th shape. |
| **C** | 7sus4 | C7sus4 (Movable Shape) | `x-3-5-3-6-3` | 5th: Index (3), 4th: Ring (5), 3rd: Index (3), 2nd: Pinky (6), 1st: Index (3) | **Intermediate** | C,G,Bb,F,G | 1,5,b7,4,5 | 3 | 6 | Yes | No | A | C | Yes | Movable 7sus4 shape. Essential resolution chord. |

---

## Chord Diagram Metadata (Machine-Readable Supplement)

This table provides the structured numeric data required for chord diagram rendering. It mirrors every row in the tables above. Fields:

- **`frets[]`** — 6-element array (Low E → High E). `-1` = muted/skipped, `0` = open string, `1+` = fret number.
- **`fingers[]`** — 6-element array. `0` = open/muted, `1`–`4` = Index–Pinky, `5` = Thumb.
- **`barres`** — JSON object(s): `{finger, fret, fromString, toString}` where string 1 = High E, string 6 = Low E.
- **`startsAtFret`** — lowest non-zero, non-muted fret value (chord box scroll position).
- **`displayFrets`** — number of fret rows needed to render the diagram (H Fret − startsAtFret + 1, minimum 4).

---

### Core Chord Diagram Metadata

| Root | Type | Variation Name | frets[] | fingers[] | barres | startsAtFret | displayFrets |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C | Major | Open C | `-1,3,2,0,1,0` | `0,3,2,0,1,0` | — | 1 | 4 |
| C | Major | C Major Barre | `-1,3,5,5,5,3` | `0,1,3,3,3,1` | `{f:1,fret:3,from:5,to:1}` | 3 | 4 |
| C | Minor | C Minor Barre | `-1,3,5,5,4,3` | `0,1,3,4,2,1` | `{f:1,fret:3,from:5,to:1}` | 3 | 4 |
| C | 7 | Open C7 | `-1,3,2,3,1,0` | `0,3,2,4,1,0` | — | 1 | 4 |
| C | maj7 | Open Cmaj7 | `-1,3,2,0,0,0` | `0,3,2,0,0,0` | — | 2 | 4 |
| C | min7 | Cm7 Barre | `-1,3,5,3,4,3` | `0,1,3,1,2,1` | `{f:1,fret:3,from:5,to:1}` | 3 | 4 |
| C | sus2 | Csus2 (Open) | `-1,3,0,0,3,3` | `0,1,0,0,3,4` | — | 3 | 4 |
| C | sus4 | Csus4 (Barre) | `-1,3,5,5,6,3` | `0,1,3,3,4,1` | `{f:1,fret:3,from:5,to:1}` | 3 | 5 |
| C | 5 | C5 Power Chord | `-1,3,5,5,-1,-1` | `0,1,3,4,0,0` | — | 3 | 4 |
| C# | Major | C# Barre | `-1,4,6,6,6,4` | `0,1,3,3,3,1` | `{f:1,fret:4,from:5,to:1}` | 4 | 4 |
| C# | Minor | C#m Barre | `-1,4,6,6,5,4` | `0,1,3,4,2,1` | `{f:1,fret:4,from:5,to:1}` | 4 | 4 |
| C# | 7 | C#7 Barre | `-1,4,6,4,6,4` | `0,1,3,1,4,1` | `{f:1,fret:4,from:5,to:1}` | 4 | 4 |
| C# | maj7 | C#maj7 Barre | `-1,4,6,5,6,4` | `0,1,3,2,4,1` | `{f:1,fret:4,from:5,to:1}` | 4 | 4 |
| C# | min7 | C#m7 Barre | `-1,4,6,4,5,4` | `0,1,3,1,2,1` | `{f:1,fret:4,from:5,to:1}` | 4 | 4 |
| C# | sus2 | C#sus2 Barre | `-1,4,6,6,4,4` | `0,1,3,4,1,1` | `{f:1,fret:4,from:5,to:1}` | 4 | 4 |
| C# | sus4 | C#sus4 Barre | `-1,4,6,6,7,4` | `0,1,3,3,4,1` | `{f:1,fret:4,from:5,to:1}` | 4 | 5 |
| C# | 5 | C#5 Power Chord | `-1,4,6,6,-1,-1` | `0,1,3,4,0,0` | — | 4 | 4 |
| D | Major | Open D | `-1,-1,0,2,3,2` | `0,0,0,1,3,2` | — | 2 | 4 |
| D | Minor | Open Dm | `-1,-1,0,2,3,1` | `0,0,0,2,3,1` | — | 1 | 4 |
| D | 7 | Open D7 | `-1,-1,0,2,1,2` | `0,0,0,2,1,3` | — | 1 | 4 |
| D | maj7 | Open Dmaj7 | `-1,-1,0,2,2,2` | `0,0,0,0,1,1` | `{f:1,fret:2,from:3,to:1}` | 2 | 4 |
| D | min7 | Open Dm7 | `-1,-1,0,2,1,1` | `0,0,0,2,1,1` | `{f:1,fret:1,from:2,to:1}` | 1 | 4 |
| D | sus2 | Open Dsus2 | `-1,-1,0,2,3,0` | `0,0,0,1,3,0` | — | 2 | 4 |
| D | sus4 | Open Dsus4 | `-1,-1,0,2,3,3` | `0,0,0,1,3,4` | — | 2 | 4 |
| D | 5 | D5 Power Chord | `-1,5,7,7,-1,-1` | `0,1,3,4,0,0` | — | 5 | 4 |
| Eb | Major | Eb Barre | `-1,6,8,8,8,6` | `0,1,3,3,3,1` | `{f:1,fret:6,from:5,to:1}` | 6 | 4 |
| Eb | Minor | Ebm Barre | `-1,6,8,8,7,6` | `0,1,3,4,2,1` | `{f:1,fret:6,from:5,to:1}` | 6 | 4 |
| Eb | 7 | Eb7 Barre | `-1,6,8,6,8,6` | `0,1,3,1,4,1` | `{f:1,fret:6,from:5,to:1}` | 6 | 4 |
| Eb | maj7 | Ebmaj7 Barre | `-1,6,8,7,8,6` | `0,1,3,2,4,1` | `{f:1,fret:6,from:5,to:1}` | 6 | 4 |
| Eb | min7 | Ebm7 Barre | `-1,6,8,6,7,6` | `0,1,3,1,2,1` | `{f:1,fret:6,from:5,to:1}` | 6 | 4 |
| Eb | sus2 | Ebsus2 Barre | `-1,6,8,8,6,6` | `0,1,3,4,1,1` | `{f:1,fret:6,from:5,to:1}` | 6 | 4 |
| Eb | sus4 | Ebsus4 Barre | `-1,6,8,8,9,6` | `0,1,3,3,4,1` | `{f:1,fret:6,from:5,to:1}` | 6 | 5 |
| Eb | 5 | Eb5 Power Chord | `-1,6,8,8,-1,-1` | `0,1,3,4,0,0` | — | 6 | 4 |
| E | Major | Open E | `0,2,2,1,0,0` | `0,2,3,1,0,0` | — | 1 | 4 |
| E | Minor | Open Em | `0,2,2,0,0,0` | `0,2,3,0,0,0` | — | 2 | 4 |
| E | 7 | Open E7 | `0,2,0,1,0,0` | `0,2,0,1,0,0` | — | 1 | 4 |
| E | maj7 | Open Emaj7 | `0,2,1,1,0,0` | `0,3,1,1,0,0` | `{f:1,fret:1,from:4,to:3}` | 1 | 4 |
| E | min7 | Open Em7 | `0,2,0,0,0,0` | `0,2,0,0,0,0` | — | 2 | 4 |
| E | sus2 | Open Esus2 | `0,2,4,4,0,0` | `0,2,4,3,0,0` | — | 2 | 4 |
| E | sus4 | Open Esus4 | `0,2,2,2,0,0` | `0,2,3,4,0,0` | — | 2 | 4 |
| E | 5 | E5 Power Chord | `0,2,2,-1,-1,-1` | `0,1,2,0,0,0` | — | 2 | 4 |
| F | Major | F Major Barre | `1,3,3,2,1,1` | `1,3,4,2,1,1` | `{f:1,fret:1,from:6,to:1}` | 1 | 4 |
| F | Minor | F Minor Barre | `1,3,3,1,1,1` | `1,3,4,1,1,1` | `{f:1,fret:1,from:6,to:1}` | 1 | 4 |
| F | 7 | F7 Barre | `1,3,1,2,1,1` | `1,3,1,2,1,1` | `{f:1,fret:1,from:6,to:1}` | 1 | 4 |
| F | maj7 | Open Fmaj7 | `-1,-1,3,2,1,0` | `0,0,3,2,1,0` | — | 1 | 4 |
| F | min7 | Fm7 Barre | `1,3,1,1,1,1` | `1,3,1,1,1,1` | `{f:1,fret:1,from:6,to:1}` | 1 | 4 |
| F | sus2 | Fsus2 Barre | `-1,8,10,10,8,8` | `0,1,3,4,1,1` | `{f:1,fret:8,from:5,to:1}` | 8 | 4 |
| F | sus4 | Fsus4 Barre | `1,3,3,3,1,1` | `1,3,4,3,1,1` | `{f:1,fret:1,from:6,to:1}` | 1 | 4 |
| F | 5 | F5 Power Chord | `1,3,3,-1,-1,-1` | `1,3,4,0,0,0` | — | 1 | 4 |
| F# | Major | F# Barre | `2,4,4,3,2,2` | `1,3,4,2,1,1` | `{f:1,fret:2,from:6,to:1}` | 2 | 4 |
| F# | Minor | F#m Barre | `2,4,4,2,2,2` | `1,3,4,1,1,1` | `{f:1,fret:2,from:6,to:1}` | 2 | 4 |
| F# | 7 | F#7 Barre | `2,4,2,3,2,2` | `1,3,1,2,1,1` | `{f:1,fret:2,from:6,to:1}` | 2 | 4 |
| F# | maj7 | F#maj7 Barre | `2,4,3,3,2,2` | `1,4,3,2,1,1` | `{f:1,fret:2,from:6,to:1}` | 2 | 4 |
| F# | min7 | F#m7 Barre | `2,4,2,2,2,2` | `1,3,1,1,1,1` | `{f:1,fret:2,from:6,to:1}` | 2 | 4 |
| F# | sus2 | F#sus2 Barre | `-1,9,11,11,9,9` | `0,1,3,4,1,1` | `{f:1,fret:9,from:5,to:1}` | 9 | 4 |
| F# | sus4 | F#sus4 Barre | `2,4,4,4,2,2` | `1,3,4,3,1,1` | `{f:1,fret:2,from:6,to:1}` | 2 | 4 |
| F# | 5 | F#5 Power Chord | `2,4,4,-1,-1,-1` | `1,3,4,0,0,0` | — | 2 | 4 |
| G | Major | Open G | `3,2,0,0,0,3` | `3,2,0,0,0,4` | — | 2 | 4 |
| G | Minor | G Minor Barre | `3,5,5,3,3,3` | `1,3,4,1,1,1` | `{f:1,fret:3,from:6,to:1}` | 3 | 4 |
| G | 7 | Open G7 | `3,2,0,0,0,1` | `3,2,0,0,0,1` | — | 1 | 4 |
| G | maj7 | Open Gmaj7 | `3,2,0,0,0,2` | `3,2,0,0,0,1` | — | 2 | 4 |
| G | min7 | Gm7 Barre | `3,5,3,3,3,3` | `1,3,1,1,1,1` | `{f:1,fret:3,from:6,to:1}` | 3 | 4 |
| G | sus2 | Gsus2 Barre | `-1,10,12,12,10,10` | `0,1,3,4,1,1` | `{f:1,fret:10,from:5,to:1}` | 10 | 4 |
| G | sus4 | Open Gsus4 | `3,-1,0,0,1,3` | `3,0,0,0,1,4` | — | 1 | 4 |
| G | 5 | G5 Power Chord | `3,5,5,-1,-1,-1` | `1,3,4,0,0,0` | — | 3 | 4 |
| G# | Major | G# Barre | `4,6,6,5,4,4` | `1,3,4,2,1,1` | `{f:1,fret:4,from:6,to:1}` | 4 | 4 |
| G# | Minor | G#m Barre | `4,6,6,4,4,4` | `1,3,4,1,1,1` | `{f:1,fret:4,from:6,to:1}` | 4 | 4 |
| G# | 7 | G#7 Barre | `4,6,4,5,4,4` | `1,3,1,2,1,1` | `{f:1,fret:4,from:6,to:1}` | 4 | 4 |
| G# | maj7 | G#maj7 Barre | `4,6,5,5,4,4` | `1,4,3,2,1,1` | `{f:1,fret:4,from:6,to:1}` | 4 | 4 |
| G# | min7 | G#m7 Barre | `4,6,4,4,4,4` | `1,3,1,1,1,1` | `{f:1,fret:4,from:6,to:1}` | 4 | 4 |
| G# | sus2 | G#sus2 Barre | `-1,11,13,13,11,11` | `0,1,3,4,1,1` | `{f:1,fret:11,from:5,to:1}` | 11 | 4 |
| G# | sus4 | G#sus4 Barre | `4,6,6,6,4,4` | `1,3,4,3,1,1` | `{f:1,fret:4,from:6,to:1}` | 4 | 4 |
| G# | 5 | G#5 Power Chord | `4,6,6,-1,-1,-1` | `1,3,4,0,0,0` | — | 4 | 4 |
| A | Major | Open A | `-1,0,2,2,2,0` | `0,0,1,2,3,0` | — | 2 | 4 |
| A | Minor | Open Am | `-1,0,2,2,1,0` | `0,0,2,3,1,0` | — | 1 | 4 |
| A | 7 | Open A7 | `-1,0,2,0,2,0` | `0,0,2,0,3,0` | — | 2 | 4 |
| A | maj7 | Open Amaj7 | `-1,0,2,1,2,0` | `0,0,2,1,3,0` | — | 1 | 4 |
| A | min7 | Open Am7 | `-1,0,2,0,1,0` | `0,0,2,0,1,0` | — | 1 | 4 |
| A | sus2 | Open Asus2 | `-1,0,2,2,0,0` | `0,0,2,3,0,0` | — | 2 | 4 |
| A | sus4 | Open Asus4 | `-1,0,2,2,3,0` | `0,0,2,3,4,0` | — | 2 | 4 |
| A | 5 | A5 Power Chord | `-1,0,2,2,-1,-1` | `0,0,1,2,0,0` | — | 2 | 4 |
| Bb | Major | Bb Barre | `-1,1,3,3,3,1` | `0,1,3,3,3,1` | `{f:1,fret:1,from:5,to:1}` | 1 | 4 |
| Bb | Minor | Bbm Barre | `-1,1,3,3,2,1` | `0,1,3,4,2,1` | `{f:1,fret:1,from:5,to:1}` | 1 | 4 |
| Bb | 7 | Bb7 Barre | `-1,1,3,1,3,1` | `0,1,3,1,4,1` | `{f:1,fret:1,from:5,to:1}` | 1 | 4 |
| Bb | maj7 | Bbmaj7 Barre | `-1,1,3,2,3,1` | `0,1,3,2,4,1` | `{f:1,fret:1,from:5,to:1}` | 1 | 4 |
| Bb | min7 | Bbm7 Barre | `-1,1,3,1,2,1` | `0,1,3,1,2,1` | `{f:1,fret:1,from:5,to:1}` | 1 | 4 |
| Bb | sus2 | Bbsus2 Barre | `-1,1,3,3,1,1` | `0,1,3,4,1,1` | `{f:1,fret:1,from:5,to:1}` | 1 | 4 |
| Bb | sus4 | Bbsus4 Barre | `-1,1,3,3,4,1` | `0,1,3,3,4,1` | `{f:1,fret:1,from:5,to:1}` | 1 | 5 |
| Bb | 5 | Bb5 Power Chord | `-1,1,3,3,-1,-1` | `0,1,3,4,0,0` | — | 1 | 4 |
| B | Major | B Major Barre | `-1,2,4,4,4,2` | `0,1,3,3,3,1` | `{f:1,fret:2,from:5,to:1}` | 2 | 4 |
| B | Minor | B Minor Barre | `-1,2,4,4,3,2` | `0,1,3,4,2,1` | `{f:1,fret:2,from:5,to:1}` | 2 | 4 |
| B | 7 | Open B7 | `-1,2,1,2,0,2` | `0,2,1,3,0,4` | — | 1 | 4 |
| B | maj7 | Bmaj7 Barre | `-1,2,4,3,4,2` | `0,1,3,2,4,1` | `{f:1,fret:2,from:5,to:1}` | 2 | 4 |
| B | min7 | Bm7 Barre | `-1,2,4,2,3,2` | `0,1,3,1,2,1` | `{f:1,fret:2,from:5,to:1}` | 2 | 4 |
| B | sus2 | Bsus2 Barre | `-1,2,4,4,2,2` | `0,1,3,4,1,1` | `{f:1,fret:2,from:5,to:1}` | 2 | 4 |
| B | sus4 | Bsus4 Barre | `-1,2,4,4,5,2` | `0,1,3,3,4,1` | `{f:1,fret:2,from:5,to:1}` | 2 | 5 |
| B | 5 | B5 Power Chord | `-1,2,4,4,-1,-1` | `0,1,3,4,0,0` | — | 2 | 4 |

---

### Extended Chord Diagram Metadata

| Root | Type | Variation Name | frets[] | fingers[] | barres | startsAtFret | displayFrets |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C | maj9 | Cmaj9 (Jazz Shape) | `-1,3,2,4,3,-1` | `0,2,1,4,3,0` | — | 2 | 4 |
| C | 9 | C9 (Jazz/Funk Shape) | `-1,3,2,3,3,3` | `0,2,1,3,3,3` | `{f:3,fret:3,from:3,to:1}` | 2 | 4 |
| A | min9 | Am9 (Full Movable) | `5,7,5,5,5,7` | `1,3,1,1,1,4` | `{f:1,fret:5,from:6,to:2}` | 5 | 4 |
| C | add9 | Cadd9 (Open Shape) ⚠️ | `-1,3,2,0,3,0` | `0,3,2,0,4,0` | — | 2 | 4 |
| A | 6 | Open A6 | `-1,0,2,2,2,2` | `0,0,1,1,1,1` | `{f:1,fret:2,from:4,to:1}` | 2 | 4 |
| A | min6 | Open Am6 | `-1,0,2,2,1,2` | `0,0,2,3,1,4` | — | 1 | 4 |
| E | 7#9 | E7#9 (Standard Hendrix) | `0,7,6,7,8,-1` | `0,2,1,3,4,0` | — | 6 | 4 |
| G | 7b9 | G7b9 (Jazz Shape) | `3,-1,3,4,3,4` | `3,0,1,4,1,2` | — | 3 | 4 |
| C | 7#5 | C7#5 (Altered Shape) | `-1,3,-1,3,5,4` | `0,1,0,2,4,3` | — | 3 | 4 |
| B | m7b5 | Bm7b5 (Half-Diminished) | `-1,2,3,2,3,-1` | `0,1,3,2,4,0` | — | 2 | 4 |
| C | dim7 | Cdim7 (Fully Diminished) | `-1,3,4,2,4,-1` | `0,1,3,2,4,0` | — | 2 | 4 |
| — | dim | Movable Diminished Triad | `-1,-1,1,2,1,-1` | `0,0,1,3,1,0` | — | 1 | 4 |
| — | aug | Movable Augmented Triad | `-1,-1,3,2,2,-1` | `0,0,3,2,1,0` | — | 2 | 4 |
| D | Slash | D/F# (First Inversion) | `2,0,0,2,3,2` | `5,0,0,2,4,3` | — | 2 | 4 |
| C | Slash | C/G (Second Inversion) | `3,3,2,0,1,0` | `4,3,2,0,1,0` | — | 1 | 4 |
| A | Slash | Am/C (First Inversion) | `-1,3,2,2,1,0` | `0,4,2,3,1,0` | — | 1 | 4 |
| G | min7 | Gm7 Shell Voicing | `3,-1,3,3,6,-1` | `1,0,2,3,4,0` | — | 3 | 5 |
| C | 11 | C11 (Movable Shape) | `-1,3,3,3,3,-1` | `0,1,1,1,1,0` | `{f:1,fret:3,from:5,to:2}` | 3 | 4 |
| C | min11 | Cm11 (Movable Shape) | `-1,3,1,3,3,-1` | `0,3,1,3,3,0` | — | 1 | 4 |
| C | 13 | C13 (Movable Shape) | `-1,3,2,3,5,-1` | `0,2,1,3,4,0` | — | 2 | 5 |
| C | 7sus4 | C7sus4 (Movable Shape) | `-1,3,5,3,6,3` | `0,1,3,1,4,1` | `{f:1,fret:3,from:5,to:1}` | 3 | 5 |
