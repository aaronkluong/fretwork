"""
Generates two JPEG diagrams for documentation, written in plain language
(minimal code/jargon) for sharing with the team:
  - algorithm_diagram.jpg : how the app picks where to play each note
  - backend_structure.jpg : how a recording turns into a tab, step by step

Run with: python3 docs/diagrams/make_diagrams.py
Requires matplotlib.
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

OUT_DIR = "docs/diagrams"


def box(ax, xy, w, h, text, fc="#E8F0FE", ec="#3B5BA5", fontsize=12, weight="normal"):
    x, y = xy
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.1",
        linewidth=1.8, edgecolor=ec, facecolor=fc,
    )
    ax.add_patch(patch)
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center",
            fontsize=fontsize, weight=weight, linespacing=1.4)
    return patch


def arrow(ax, start, end, **kwargs):
    a = FancyArrowPatch(
        start, end,
        arrowstyle="-|>", mutation_scale=22,
        linewidth=2, color="#444444", **kwargs,
    )
    ax.add_patch(a)


def note(ax, xy, text, fontsize=10.5, color="#555555", ha="left"):
    ax.text(xy[0], xy[1], text, fontsize=fontsize, color=color, ha=ha,
            style="italic", linespacing=1.3)


# ---------------------------------------------------------------------------
# Diagram 1: Algorithm, plain language
# ---------------------------------------------------------------------------

fig, ax = plt.subplots(figsize=(10, 16))
ax.set_xlim(0, 10)
ax.set_ylim(0, 18.5)
ax.axis("off")
ax.set_title(
    "How the app decides where to play each note",
    fontsize=18, weight="bold", pad=16,
)

# Step 1: [17.0, 18.0]
box(ax, (1.5, 17.0), 7.0, 1.0,
    "Step 1: Listen to the recording\nDetect every note that was played,\nthe key, and the chords",
    fc="#FFF3CD", ec="#B58900", fontsize=12.5)
arrow(ax, (5.0, 17.0), (5.0, 16.55))

# Step 2: [15.6, 16.55]
box(ax, (1.5, 15.6), 7.0, 0.95,
    "Step 2: Group notes played at the same time\n(these will become one chord/shape on the tab)",
    fontsize=12.5)
arrow(ax, (5.0, 15.6), (5.0, 15.15))

# Step 3: [13.3, 15.15]
box(ax, (1.0, 13.3), 8.0, 1.85,
    "Step 3: For each group, list every way it\ncould be played on the fretboard\n\n"
    "(the same note can be played on more than\none string/fret - e.g. an open G string\nor the G on the low-E string, 3rd fret)",
    fc="#E8F0FE", fontsize=12.5)
arrow(ax, (5.0, 13.3), (5.0, 12.85))

# Step 4: [8.1, 12.85] - draw the box first (empty), then place title + bullets manually
box(ax, (0.7, 8.1), 8.6, 4.75, "", fc="#E8F0FE", fontsize=13)
ax.text(5.0, 12.55, "Step 4: Score each option for how\n'guitar-friendly' it is",
        ha="center", va="top", fontsize=13, weight="bold", linespacing=1.4)
ax.text(5.0, 11.35, "Better scores go to options that...",
        ha="center", va="top", fontsize=12, weight="bold")

bullets = [
    "are physically comfortable to play (no huge finger stretches)",
    "fit the song's key and chords",
    "favor easy positions beginners use (open strings, lower frets)",
    "match how real guitarists usually play that note (learned from real recordings)",
]
yy = 10.65
for b in bullets:
    ax.text(1.2, yy, "•  " + b, fontsize=11, va="top", linespacing=1.35)
    yy -= 0.65

arrow(ax, (5.0, 8.1), (5.0, 7.65))

# Step 5: [5.85, 7.65]
box(ax, (0.7, 5.85), 8.6, 1.8,
    "Step 5: Pick the smoothest path through\nthe whole song\n\n"
    "Not just the best choice for each chord alone -\n"
    "also reward note choices where the hand doesn't\n"
    "have to jump around the neck too much between chords",
    fc="#E8F0FE", fontsize=12.5)
arrow(ax, (5.0, 5.85), (5.0, 5.4))

# Step 6: [4.4, 5.4]
box(ax, (1.5, 4.4), 7.0, 1.0,
    "Step 6: Draw the final tab\nusing the chosen string/fret\nfor every note",
    fc="#D9F2D9", ec="#2E7D32", fontsize=12.5)

note(ax, (0.3, 3.6),
     "Ongoing work: making Step 5's \"smooth hand movement\" idea even smarter -\n"
     "e.g. thinking in terms of real chord-shape \"zones\" on the neck (CAGED boxes)\n"
     "instead of just minimizing fret distance.",
     fontsize=10)

plt.tight_layout()
plt.savefig(f"{OUT_DIR}/algorithm_diagram.jpg", dpi=160, bbox_inches="tight")
plt.close(fig)


# ---------------------------------------------------------------------------
# Diagram 2: Backend structure, plain language
# ---------------------------------------------------------------------------

fig, ax = plt.subplots(figsize=(10, 12))
ax.set_xlim(0, 10)
ax.set_ylim(0, 14)
ax.axis("off")
ax.set_title(
    "From recording to tab: what happens behind the scenes",
    fontsize=18, weight="bold", pad=16,
)

box(ax, (2.0, 12.6), 6.0, 1.0,
    "You record or upload audio\nin the Fretwork app (website)",
    fc="#E0E0E0", ec="#555555", fontsize=12.5)
arrow(ax, (5.0, 12.6), (5.0, 11.95))

box(ax, (1.0, 11.0), 8.0, 0.9,
    "The audio is sent to the server\nto be analyzed",
    fc="#FFF3CD", ec="#B58900", fontsize=12.5, weight="bold")
arrow(ax, (5.0, 11.0), (5.0, 10.35))

note(ax, (0.3, 10.15), "These three things happen at the same time:", fontsize=11)

box(ax, (0.3, 8.4), 2.95, 1.55,
    "Find the notes\n\nWhat pitches were\nplayed, and when",
    fontsize=11.5)
box(ax, (3.5, 8.4), 2.95, 1.55,
    "Find the key\n\nWhat musical key\nthe song is in",
    fontsize=11.5)
box(ax, (6.7, 8.4), 2.95, 1.55,
    "Find the chords\n\nWhat chords are\nbeing played, and when",
    fontsize=11.5)

arrow(ax, (1.8, 8.4), (4.3, 7.55))
arrow(ax, (5.0, 8.4), (5.0, 7.55))
arrow(ax, (8.2, 8.4), (5.7, 7.55))

box(ax, (1.0, 6.5), 8.0, 1.05,
    "Decide where to play each note on the\nfretboard (string + fret)",
    fc="#E8F0FE", ec="#3B5BA5", fontsize=12.5, weight="bold")
note(ax, (1.3, 6.3), "uses the notes + key + chords from the previous step", fontsize=10.5)
arrow(ax, (5.0, 6.5), (5.0, 5.55))

box(ax, (1.0, 4.5), 8.0, 1.05,
    "Draw the tab as text\n(the familiar 6-line ASCII guitar tab)",
    fc="#D9F2D9", ec="#2E7D32", fontsize=12.5, weight="bold")
arrow(ax, (5.0, 4.5), (5.0, 3.55))

box(ax, (1.5, 2.5), 7.0, 1.0,
    "Result is sent back to the app:\nkey, chords, tab, and timing info",
    fc="#E0E0E0", ec="#555555", fontsize=12.5)
arrow(ax, (5.0, 2.5), (5.0, 1.85))

box(ax, (2.0, 0.9), 6.0, 0.9,
    "Shown to you on the website",
    fc="#FFF3CD", ec="#B58900", fontsize=12.5)

note(ax, (0.3, 0.35),
     "There's also a separate path for testing with GuitarSet practice files - it\n"
     "skips straight to \"decide where to play each note\" since those files already\n"
     "include the notes that were played.",
     fontsize=10)

plt.tight_layout()
plt.savefig(f"{OUT_DIR}/backend_structure.jpg", dpi=160, bbox_inches="tight")
plt.close(fig)

print("Wrote:")
print(f"  {OUT_DIR}/algorithm_diagram.jpg")
print(f"  {OUT_DIR}/backend_structure.jpg")
