import { useEffect, useRef, useState } from "react";
import { TabSegment } from "@/types/tab";
import { NoteEvent, buildAlphaTexFromNotes } from "@/lib/alphaTex";

interface AlphaTabPrototypeProps {
  segments: TabSegment[];
  notes?: NoteEvent[];
  tempoBpm?: number | null;
  keyLabel?: string | null;
  onNoteClick: (segmentIdx: number, stringKey: string, fretVal: number | null) => void;
}

const STRING_KEYS = [
  "string_1",
  "string_2",
  "string_3",
  "string_4",
  "string_5",
  "string_6",
] as const;

/**
 * Fallback: one quarter-note chord stab per detected segment, used only when
 * note-level data (start/duration per note) isn't available.
 */
function segmentsToAlphaTex(segments: TabSegment[]): string {
  const measures = segments.map((seg) => {
    const notes: string[] = [];
    STRING_KEYS.forEach((key, idx) => {
      const fret = seg.positions[key];
      if (fret !== null && fret !== undefined) {
        notes.push(`${fret}.${idx + 1}`);
      }
    });
    if (notes.length === 0) return "r.4";
    if (notes.length === 1) return `${notes[0]}.4`;
    return `(${notes.join(" ")}).4`;
  });

  return `.\n${measures.join(" | ")} |`;
}

export function AlphaTabPrototype({ segments, notes, tempoBpm, keyLabel, onNoteClick }: AlphaTabPrototypeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Synchronize internal theme state with document class changes and system preferences
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    checkTheme();

    const observer = new MutationObserver(() => {
      checkTheme();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => checkTheme();
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  const onNoteClickRef = useRef(onNoteClick);
  useEffect(() => {
    onNoteClickRef.current = onNoteClick;
  }, [onNoteClick]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (segments.length === 0 && (!notes || notes.length === 0)) return;

    let api: import("@coderline/alphatab").AlphaTabApi | null = null;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    // Clear previous SVG/canvas contents completely to avoid double rendering or styling lag
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    // Direct color mapping ensures theme colors are updated instantly without CSS variable resolution delay
    const isDark = theme === "dark";
    const tabColor = isDark ? "#cbd5e1" : "#000000";
    const staffColor = isDark ? "rgba(203, 213, 225, 0.35)" : "rgba(0, 0, 0, 0.45)";

    import("@coderline/alphatab").then((alphaTab) => {
      if (disposed || !containerRef.current) return;

      api = new alphaTab.AlphaTabApi(containerRef.current, {
        core: {
          fontDirectory: "/alphatab/font/",
          engine: "svg",
          useWorkers: false,
          includeNoteBounds: true, // required for clicks
        },
        display: {
          staveProfile: alphaTab.StaveProfile.ScoreTab,
          resources: {
            staffLineColor: staffColor,
            barSeparatorColor: tabColor,
            barNumberColor: tabColor,
            mainGlyphColor: tabColor,
            secondaryGlyphColor: tabColor,
            scoreInfoColor: tabColor,
            tablatureColor: tabColor,
          } as unknown as Record<string, unknown>,
        },
        notation: {
          elements: {
            scoreTitle: false,
            scoreSubTitle: false,
            scoreArtist: false,
            scoreAlbum: false,
          },
        } as unknown as Record<string, unknown>,
        player: {
          enablePlayer: false,
          scrollMode: alphaTab.ScrollMode.Off,
          scrollElement: containerRef.current,
        },
      });

      api.error.on((err) => console.error("[AlphaTab error]", err));

      // Handle clicking notes
      api.noteMouseUp.on((note) => {
        if (note && !disposed) {
          // note.string is 1-based (1 = high e/string_1, 6 = low E/string_6)
          const stringKey = `string_${note.string}`;
          const beat = note.beat as { index?: number; voice?: { bar?: { index?: number } } } | undefined;
          const barIdx = beat?.voice?.bar?.index ?? 0;
          // In notation view, each segment maps 1-to-1 to a measure (barIdx)
          let segmentIdx = barIdx;
          if (segmentIdx >= segments.length) {
            segmentIdx = Math.max(0, segments.length - 1);
          }
          if (segmentIdx >= 0 && segmentIdx < segments.length) {
            onNoteClickRef.current(segmentIdx, stringKey, note.fret);
          }
        }
      });

      const tex =
        notes && notes.length > 0
          ? buildAlphaTexFromNotes(notes, { tempoBpm, keyLabel })
          : segmentsToAlphaTex(segments);
      api.tex(tex);

      // Re-trigger layout calculations on container resize to enable fluid, auto-wrapping responsiveness
      if (containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (!disposed) {
            api?.render();
          }
        });
        resizeObserver.observe(containerRef.current);
      }
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      api?.destroy();
    };
  }, [segments, notes, tempoBpm, keyLabel, theme]);

  return (
    <div
      ref={containerRef}
      className="border-border-custom overflow-hidden rounded-2xl border bg-surface/50 p-4 sm:p-6 text-black shadow-inner dark:bg-background-custom dark:text-slate-200 min-h-[200px] w-full"
    />
  );
}


