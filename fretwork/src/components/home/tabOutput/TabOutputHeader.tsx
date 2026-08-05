import { useState, useEffect, useRef } from "react";
import { TabSegment } from "@/types/tab";
import { TabVersion } from "@/hooks/useAnalysis";
import { generateAsciiTab } from "@/lib/asciiGenerator";

interface TabOutputHeaderProps {
  showDemo: boolean;
  viewMode: "html" | "ascii" | "notation";
  setViewMode: (mode: "html" | "ascii" | "notation") => void;
  isModified: boolean;
  tabVersions: TabVersion[];
  variantLabels: string[];
  activeVariantLabel: string;
  recommendedLabel: string;
  onRecalculate?: () => void;
  onSelectVariant?: (label: string) => void;
  showVersionDropdown: boolean;
  setShowVersionDropdown: (show: boolean) => void;
  activeVersionId: string;
  onSelectVersion?: (versionId: string) => void;
  userSegmentsPerLine: number;
  setUserSegmentsPerLine: (num: number) => void;
  segments: TabSegment[];
  detectedKey: string;
  detectedTempo: string;
  chordProgression: string[];
  showToast: (text: string, tone?: "info" | "error" | "success") => void;
  children?: React.ReactNode;
}

export function TabOutputHeader({
  showDemo,
  viewMode,
  setViewMode,
  isModified,
  tabVersions,
  variantLabels,
  activeVariantLabel,
  recommendedLabel,
  onRecalculate,
  onSelectVariant,
  showVersionDropdown: _showVersionDropdown,
  setShowVersionDropdown: _setShowVersionDropdown,
  activeVersionId,
  onSelectVersion,
  userSegmentsPerLine,
  setUserSegmentsPerLine,
  segments,
  detectedKey,
  detectedTempo,
  chordProgression,
  showToast,
  children,
}: TabOutputHeaderProps) {
  const [isRevertClicked, setIsRevertClicked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [prevTabVersionsLength, setPrevTabVersionsLength] = useState(tabVersions.length);
  if (tabVersions.length !== prevTabVersionsLength) {
    setPrevTabVersionsLength(tabVersions.length);
    if (tabVersions.length <= 1) {
      setIsRevertClicked(false);
      setIsHovered(false);
      setIsPinned(false);
    }
  }

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  // Click outside to unpin dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPinned(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isDropdownExpanded = isHovered || isPinned;
  const activeVersion = tabVersions.find((v) => v.id === activeVersionId) || tabVersions[0];

  return (
    <>
      {/* Row 1: Output Header & View Mode Selector + Recalculate/Revert Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Guitar Tablature Output
          </h2>
          <p className="text-body font-body opacity-75">
            Playable tab mapping derived from Viterbi global optimization and custom voicing rules.
          </p>
        </div>

        {showDemo && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Recalculate Button - Always rendered adjacent to selectors (disabled by default, active when modified) */}
            {onRecalculate && (() => {
              const pinnedCount = segments.reduce((count, seg) => {
                if (!seg.pinned_positions) return count;
                return count + Object.values(seg.pinned_positions).filter(Boolean).length;
              }, 0);
              
              return (
                <button
                  type="button"
                  onClick={onRecalculate}
                  disabled={!isModified}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-all duration-300 ${
                    isModified
                      ? "bg-primary font-bold text-white shadow-md shadow-primary/30 ring-2 ring-primary/40 hover:scale-105 active:scale-95 cursor-pointer"
                      : "border border-slate-200 bg-slate-100/80 font-medium text-slate-400 opacity-50 shadow-none cursor-not-allowed dark:border-white/5 dark:bg-surface/50 dark:text-slate-500"
                  }`}
                  title={
                    isModified
                      ? `Notes modified — click to re-optimize fretboard fingerings${pinnedCount > 0 ? ` (${pinnedCount} pinned)` : ""}!`
                      : "Modify notes in the tab view to enable recalculating tab fingerings"
                  }
                >
                  <svg className={`h-3.5 w-3.5 ${isModified ? "animate-spin-slow" : "opacity-60"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isModified ? `Recalculate Tab *` : "Recalculate Tab"}
                </button>
              );
            })()}

            {/* Version History / Revert Control - Hidden initially, activates when versions/modifications exist */}
            {tabVersions && tabVersions.length > 1 && (
              <div ref={dropdownRef} className="relative flex items-center transition-all duration-300 animate-in fade-in">
                {!isRevertClicked ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRevertClicked(true);
                      setIsHovered(true);
                    }}
                    className="group flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-300/80 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 shadow-sm transition-all duration-300 ease-out hover:scale-105 hover:bg-amber-500/20 active:scale-95 dark:border-amber-400/30 dark:text-amber-400"
                    title="Click to view version history and revert"
                  >
                    <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Revert Version
                  </button>
                ) : (
                  <div
                    className="relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      type="button"
                      onClick={() => setIsPinned((prev) => !prev)}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-all duration-200 ${
                        isPinned
                          ? "border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/20"
                          : "border-amber-400/50 bg-white text-slate-700 hover:border-primary dark:border-amber-400/30 dark:bg-surface dark:text-slate-200"
                      }`}
                      title="Hover to preview versions or click to lock/unlock dropdown expansion"
                    >
                      <svg className="h-3.5 w-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{activeVersion?.label || "Select Version"}</span>
                      <svg className={`h-3 w-3 transition-transform duration-200 ${isDropdownExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Options Popup Container with continuous hover hit-box */}
                    {isDropdownExpanded && (
                      <div className="absolute right-0 top-full z-50 pt-1">
                        <div className="min-w-[160px] overflow-hidden rounded-xl border border-amber-400/30 bg-white py-1 shadow-xl animate-in fade-in zoom-in-95 dark:bg-surface dark:border-amber-400/20">
                          {tabVersions.map((v) => {
                            const isActive = v.id === activeVersionId;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => {
                                  onSelectVersion?.(v.id);
                                }}
                                className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-xs transition-colors ${
                                  isActive
                                    ? "bg-primary/10 font-bold text-primary dark:bg-primary/20"
                                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-accent-secondary"
                                }`}
                              >
                                <span>{v.label}</span>
                                {isActive && (
                                  <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mode Selectors */}
            <div className="flex gap-1 rounded-xl bg-surface p-1 dark:bg-accent-secondary shadow-inner">
              {(["notation", "html", "ascii"] as const).map((mode) => {
                const labels = { notation: "Notation", html: "Interactive HTML", ascii: "ASCII Tab" };
                const isActive = viewMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ease-out active:scale-95 ${
                      isActive
                        ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
                        : "opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Audio player / Listen along section slot */}
      {children}

      {/* ASCII View Actions Sub-Bar (only when in ASCII mode) */}
      {showDemo && viewMode === "ascii" && (
        <div className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] items-stretch sm:items-center gap-3 pt-1 w-full">
          {/* 1. Measures selector (Left aligned) */}
          <div className="flex items-center gap-2 justify-start shrink-0">
            <span className="text-xs font-semibold opacity-70">Measures:</span>
            <div className="flex items-center gap-1 rounded-xl border border-border-custom bg-surface/40 p-1 dark:bg-accent-secondary/40 shadow-inner">
              {[4, 8, 12, 16].map((num) => (
                <button
                  key={num}
                  onClick={() => setUserSegmentsPerLine(num)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-200 ease-out active:scale-95 ${
                    userSegmentsPerLine === num
                      ? "bg-primary text-white shadow-sm scale-105"
                      : "opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                  title={`Max ${num} measures per line`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Copy ASCII Tab button (Center aligned on desktop) */}
          <div className="flex justify-center w-full">
            <button
              type="button"
              onClick={() => {
                const asciiTabStr = generateAsciiTab(segments, userSegmentsPerLine);
                navigator.clipboard.writeText(asciiTabStr);
                showToast("Copied ASCII tab.", "success");
              }}
              className="border-border-custom dark:border-border-custom flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border bg-white/70 px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-surface hover:shadow active:translate-y-0 active:scale-95 dark:bg-surface dark:hover:bg-accent-secondary/80 w-full sm:w-auto"
            >
              <svg className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-primary dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 002 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy ASCII Tab
            </button>
          </div>

          {/* 3. Download Tab button (Right aligned on desktop) */}
          <div className="flex justify-end w-full">
            <button
              type="button"
              onClick={() => {
                const asciiContent = generateAsciiTab(segments, userSegmentsPerLine).trim();
                const header = `Fretwork Tab Export\nKey: ${detectedKey}  •  Tempo: ${detectedTempo}\nProgression: ${chordProgression.join(" - ")}\n\n`;
                const fullText = header + asciiContent;
                const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `fretwork_tab_${detectedKey.replace(/\s+/g, "_")}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast("Downloaded tab file.", "success");
              }}
              className="border-border-custom dark:border-border-custom flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border bg-white/70 px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-surface hover:shadow active:translate-y-0 active:scale-95 dark:bg-surface dark:hover:bg-accent-secondary/80 w-full sm:w-auto"
            >
              <svg className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-primary dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Tab
            </button>
          </div>
        </div>
      )}
    </>
  );
}
