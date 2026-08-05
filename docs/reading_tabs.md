# Beginner's Guide to Reading Guitar Tablature

This guide explains how to read guitar tablature (tabs) and covers both the core concepts of tablature notation and the symbols representing various guitar techniques.

This guide is based on the beginner's tutorial by instructor **Kurt Berg**. 
📺 [Watch the Video Tutorial on YouTube](https://www.youtube.com/watch?v=Yb4ajV0C1BE)

---

## 🎼 Core Concepts

### 1. The Staff
Guitar tabs use six horizontal lines, each representing one of the six strings on a standard guitar. 
* The **top line** represents the **high E string** (1st string, highest pitch).
* The **bottom line** represents the **low E string** (6th string, lowest pitch).

```text
e|-------------------| (1st string - High E)
B|-------------------| (2nd string - B)
G|-------------------| (3rd string - G)
D|-------------------| (4th string - D)
A|-------------------| (5th string - A)
E|-------------------| (6th string - Low E)
```

> [!NOTE]
> Reading tab is like looking at your fretboard from the top down. The line at the bottom corresponds to the physical string closest to the ceiling.

### 2. Numbers & Chords
* **Numbers** placed on the lines indicate the **fret** to be pressed and played.
* A **`0`** indicates an **open string** (played without pressing any frets).
* **Vertically stacked numbers** represent a **chord**, meaning all stacked notes are strummed/played at the same time.

```text
  Single Notes          A Major Chord
e|---0---3---5---|    e|---0-----------|
B|---------------|    B|---2-----------|
G|---------------|    G|---2-----------|
D|---------------|    D|---2-----------|
A|---------------|    A|---0-----------|
E|---------------|    E|---------------|
```

---

## 🎸 Advanced Symbols & Techniques

Tablatures use specific symbols to denote expressive physical techniques on the guitar. Below is a breakdown of the standard symbols, their meanings, and how they appear in ASCII representation.

| Technique | Tab Symbol | Visual Example | JSON Marking | Explanation | Video Timestamp |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Slide Up** | `/` | `5/7` | `slide_up` | Slide a fretting finger from one fret to another while keeping pressure on the string. | `4:37 - 5:51` |
| **Slide Down** | `\` | `7\5` | `slide_down` | Slide a fretting finger down the fretboard. | `4:37 - 5:51` |
| **Hammer-on** | `h` | `5h7` | `hammer_on` | Strike a string on a lower fret (5), then press down firmly on a higher fret (7) with another finger without picking again. | `5:52 - 7:34` |
| **Pull-off** | `p` | `7p5` | `pull_off` | Pick a note on a higher fret (7), then flick the finger off to sound a lower note (5) already held down. | `5:52 - 7:34` |
| **Vibrato** | `~` | `7~` | `vibrato` | Rapidly bend the string up and down slightly to create a wavering, singing effect. | `7:35 - 8:04` |
| **Dead Note** | `x` | `x` | `dead_note` | Mute the string with the fretting hand so that picking it produces a percussive, pitch-less click. | `8:04 - 8:43` |
| **Bend** | `b` | `7b9` | `bend` | Pick a note (7) and push/pull the string upward to bend its pitch to match a higher fret (9). | `9:00 - 10:14` |
| **Pre-bend** | `pb` | `7pb9` | `pre_bend` | Bend the string *before* picking it, then pick the note to sound the higher pitch immediately. | `9:00 - 10:14` |
| **Bend Release** | `br` | `9br7` | `bend_release` | Bend a note up, then release it back down to the original pitch while it is still vibrating. | `9:00 - 10:14` |
| **Harmonics** | `< >` or `*` | `<12>` | `harmonic` | Lightly touch the string directly above the fret wire (commonly 12th, 7th, or 5th frets) and pick it to create a bell-like tone. | `10:15 - 10:38` |

---

## 💡 Key Takeaways for Learners

> [!IMPORTANT]
> **1. Timing is not built-in**
> Standard tablature is excellent for showing *where* to put your fingers, but it rarely displays precise rhythm or note durations. Always **listen to the audio recording** of the song while reading the tab to match the timing correctly (Video Timestamp: `11:46 - 12:11`).

> [!WARNING]
**2. Tabs can contain errors**
Since many online tabs are user-generated or auto-generated, they frequently vary in accuracy. Use tabs as a guide, but always trust your ears. If a fret position or sequence feels physically awkward or sounds wrong, look for alternative fingerings (Video Timestamp: `11:03 - 11:45`).

---

## 🔬 Note on Fretwork Evaluation
While the Fretwork platform aims for maximum playability, our research team uses specialized **"Matched-Only"** tabs during benchmarking. These tabs isolate the fretboard algorithm from the noise of the transcription model by only showing notes where the AI correctly detected the pitch and timing. This ensures our fretboard recommendations are technically sound compared to human-annotated ground truth.

