import { useState, useEffect, useRef } from "react";
import { TabSegment } from "@/types/tab";
import { generateAsciiTab, getColWidth, formatChordLabel } from "@/lib/asciiGenerator";

interface AsciiTabViewProps {
  segments: TabSegment[];
  detectedKey: string;
  detectedTempo: string;
  chordProgression: string[];
  showToast: (text: string, tone?: "info" | "error" | "success") => void;
  onNoteClick: (segmentIdx: number, stringKey: string, fretVal: number | null) => void;
  audioUrl?: string | null;
  currentPlaybackTime?: number;
  userSegmentsPerLine?: number;
}

export function AsciiTabView({
  segments,
  detectedKey,
  detectedTempo,
  chordProgression,
  showToast,
  onNoteClick,
  audioUrl,
  currentPlaybackTime = 0,
  userSegmentsPerLine = 8,
}: AsciiTabViewProps) {
  const asciiContainerRef = useRef<HTMLPreElement>(null);
  const [layoutInfo, setLayoutInfo] = useState<{ containerWidth: number; charWidth: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const measureLayout = () => {
      if (!asciiContainerRef.current) return;
      const container = asciiContainerRef.current;
      const containerWidth = container.clientWidth;
      if (!containerWidth) return;

      const measureSpan = document.createElement("span");
      measureSpan.style.font = getComputedStyle(container).font;
      measureSpan.style.visibility = "hidden";
      measureSpan.style.position = "absolute";
      measureSpan.style.whiteSpace = "pre";
      measureSpan.textContent = "M".repeat(100);
      document.body.appendChild(measureSpan);
      const charWidth = measureSpan.clientWidth / 100;
      document.body.removeChild(measureSpan);

      if (charWidth === 0) return;

      setLayoutInfo({ containerWidth, charWidth });
    };

    measureLayout();

    const observer = new ResizeObserver(() => {
      measureLayout();
    });

    if (asciiContainerRef.current) {
      observer.observe(asciiContainerRef.current);
    }

    window.addEventListener("resize", measureLayout);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureLayout);
    };
  }, []);

  const colWidth = getColWidth(segments);
  let effectiveSegmentsPerLine = userSegmentsPerLine;

  if (layoutInfo && layoutInfo.containerWidth > 0 && layoutInfo.charWidth > 0) {
    const paddingX = 48;
    const availableWidth = layoutInfo.containerWidth - paddingX;
    const availableChars = Math.floor(availableWidth / layoutInfo.charWidth);

    const steps = [16, 12, 8, 4, 2, 1];
    let bestFit = 1;
    for (const step of steps) {
      const requiredChars = 2 + step * (colWidth + 1);
      if (step <= userSegmentsPerLine && requiredChars <= availableChars) {
        bestFit = step;
        break;
      }
    }
    effectiveSegmentsPerLine = bestFit;
  }

  const stringKeys = ["string_1", "string_2", "string_3", "string_4", "string_5", "string_6"] as const;
  const stringPrefixes = ["e|", "B|", "G|", "D|", "A|", "E|"];

  // Split segments into rows of effectiveSegmentsPerLine
  const segmentRows: { rowIdx: number; rowSegments: { seg: TabSegment; globalIdx: number }[] }[] = [];
  let currentRow: { seg: TabSegment; globalIdx: number }[] = [];
  segments.forEach((seg, globalIdx) => {
    currentRow.push({ seg, globalIdx });
    if (currentRow.length === effectiveSegmentsPerLine || globalIdx === segments.length - 1) {
      segmentRows.push({ rowIdx: segmentRows.length, rowSegments: currentRow });
      currentRow = [];
    }
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      {layoutInfo && effectiveSegmentsPerLine < userSegmentsPerLine && (
        <div className="flex items-center justify-start">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-caption font-semibold text-amber-700 dark:text-amber-300">
            <svg className="h-3.5 w-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Auto-scaled to {effectiveSegmentsPerLine} measures per line due to screen width
          </span>
        </div>
      )}
      <pre
        ref={asciiContainerRef}
        className="text-[10px] sm:text-xs md:text-sm lg:text-label border-border-custom overflow-x-auto rounded-2xl border bg-surface/50 p-4 sm:p-6 font-mono leading-relaxed text-slate-700 shadow-inner dark:bg-background-custom dark:text-slate-200"
      >
        {segmentRows.map(({ rowIdx, rowSegments }) => {
          // Render chord line
          const chordLineElements = [
            <span key="prefix" className="opacity-0 select-none">{"  "}</span>
          ];
          rowSegments.forEach(({ seg, globalIdx }) => {
            const chordLabel = formatChordLabel(seg.suggested_chord);
            const paddedChord = chordLabel.padEnd(colWidth + 1, " ");
            const isActive =
              audioUrl != null &&
              currentPlaybackTime >= seg.time_start &&
              currentPlaybackTime < seg.time_end;

            chordLineElements.push(
              <span
                key={globalIdx}
                onClick={() => onNoteClick(globalIdx, "string_6", seg.positions.string_6)}
                className={`cursor-pointer font-bold transition-all rounded-sm ${
                  isActive ? "bg-primary text-white shadow-sm" : "hover:bg-primary/20 hover:text-primary"
                }`}
                title="Click to edit chord/segment details"
              >
                {paddedChord}
              </span>
            );
          });

          // Render 6 string lines (string_1 is high e, string_6 is low E)
          const stringLinesElements = stringKeys.map((strKey, strIdx) => {
            const cells = [
              <span key="prefix" className="select-none">{stringPrefixes[strIdx]}</span>
            ];
            rowSegments.forEach(({ seg, globalIdx }) => {
              const fretVal = seg.positions[strKey];
              const isPinned = seg.pinned_positions?.[strKey] ?? false;
              const isActive =
                audioUrl != null &&
                currentPlaybackTime >= seg.time_start &&
                currentPlaybackTime < seg.time_end;
              if (fretVal === null || fretVal === undefined) {
                cells.push(
                  <span
                    key={globalIdx}
                    onClick={() => onNoteClick(globalIdx, strKey, null)}
                    className={`cursor-pointer transition-colors rounded-sm ${
                      isPinned
                        ? "text-amber-600 dark:text-amber-400 font-bold bg-amber-400/25"
                        : isActive
                        ? "bg-primary/20 text-primary font-bold"
                        : "hover:bg-primary/20 hover:text-primary"
                    }`}
                    title={`Click to add a note on the ${stringPrefixes[strIdx].replace("|", "")} string`}
                  >
                    {"-".repeat(colWidth)}|
                  </span>
                );
              } else {
                const fretText = fretVal.toString();
                const trailingDashesCount = colWidth - 1 - fretText.length;
                cells.push(
                  <span key={globalIdx} className={`transition-colors ${isActive ? "bg-primary/20 rounded-sm" : ""}`}>
                    <span>-</span>
                    <span
                      onClick={() => onNoteClick(globalIdx, strKey, fretVal)}
                      className={`inline-block cursor-pointer font-bold rounded-sm px-1 -mx-1 transition-colors ${
                        isPinned
                          ? "bg-amber-400 text-black shadow-sm"
                          : isActive
                          ? "bg-primary text-white shadow-sm"
                          : "hover:bg-primary hover:text-white dark:hover:bg-teal-400 dark:hover:text-black"
                      }`}
                      title={`Click to edit Note ${fretVal} on ${stringPrefixes[strIdx].replace("|", "")} string`}
                    >
                      {fretText}
                    </span>
                    <span>{trailingDashesCount > 0 ? "-".repeat(trailingDashesCount) : ""}|</span>
                  </span>
                );
              }
            });
            return (
              <div key={strKey} className="whitespace-pre leading-normal">
                {cells}
              </div>
            );
          });

          return (
            <div key={rowIdx} className="mb-4 last:mb-0">
              <div className="whitespace-pre leading-normal">
                {chordLineElements}
              </div>
              {stringLinesElements}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
