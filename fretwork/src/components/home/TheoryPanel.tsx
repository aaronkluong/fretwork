// fretwork/src/components/home/TheoryPanel.tsx

import { useMemo } from "react";
import { getKeyInfo, getChordFunction, getModeName } from "@/lib/musicTheory";
import { CustomDropdown, DropdownOption } from "@/components/ui/CustomDropdown";
import { computePlayabilityScore, formatAppliedSetup } from "@/lib/workingTabState";
import { TabSegment } from "@/types/tab";

interface VariantOption {
  value: string;
  displayText: string;
}

interface TheoryPanelProps {
  showDemo: boolean;
  detectedKey: string;
  autoDetectedKey?: string;
  isKeyOverridden?: boolean;
  onKeyChange?: (newKey: string | null) => void;
  detectedTempo: string;
  chordProgression: string[];
  variantOptions?: VariantOption[];
  activeVariantLabel?: string;
  onSelectVariant?: (label: string) => void;
  /** Live segments for playability + position honesty */
  segments?: TabSegment[];
  difficulty?: string;
  tuning?: string;
  capo?: number;
}

const STANDARD_KEYS = [
  "C major", "C minor",
  "C# major", "C# minor",
  "Db major", "Db minor",
  "D major", "D minor",
  "D# major", "D# minor",
  "Eb major", "Eb minor",
  "E major", "E minor",
  "F major", "F minor",
  "F# major", "F# minor",
  "Gb major", "Gb minor",
  "G major", "G minor",
  "G# major", "G# minor",
  "Ab major", "Ab minor",
  "A major", "A minor",
  "A# major", "A# minor",
  "Bb major", "Bb minor",
  "B major", "B minor",
];

export function TheoryPanel({
  showDemo,
  detectedKey,
  autoDetectedKey,
  isKeyOverridden = false,
  onKeyChange,
  detectedTempo,
  chordProgression,
  variantOptions = [],
  activeVariantLabel,
  onSelectVariant,
  segments = [],
  difficulty = "expert",
  tuning = "standard",
  capo = 0,
}: TheoryPanelProps) {
  const keyInfo = useMemo(() => getKeyInfo(detectedKey), [detectedKey]);
  const modeName = useMemo(() => getModeName(detectedKey), [detectedKey]);

  const keyOptions = useMemo<DropdownOption<string>[]>(() => {
    return [
      ...(!STANDARD_KEYS.includes(detectedKey)
        ? [{ value: detectedKey, label: detectedKey }]
        : []),
      ...STANDARD_KEYS.filter((k) => k.endsWith("major")).map((k) => ({
        value: k,
        label: k,
        group: "Major Keys",
        badge: k === autoDetectedKey ? "★ Auto" : undefined,
      })),
      ...STANDARD_KEYS.filter((k) => k.endsWith("minor")).map((k) => ({
        value: k,
        label: k,
        group: "Minor Keys",
        badge: k === autoDetectedKey ? "★ Auto" : undefined,
      })),
    ];
  }, [detectedKey, autoDetectedKey]);

  const chordFunctions = useMemo(() => {
    if (!keyInfo || !showDemo) return {} as Record<string, string>;
    const map: Record<string, string> = {};
    chordProgression.forEach((chord) => {
      const fn = getChordFunction(chord, detectedKey);
      if (fn) map[chord] = fn.roman;
    });
    return map;
  }, [keyInfo, chordProgression, detectedKey, showDemo]);

  const activePositionLabel = useMemo(() => {
    if (!showDemo) return null;
    const activeOption = variantOptions.find((o) => o.value === activeVariantLabel);
    if (!activeOption) return null;
    const parts = activeOption.displayText.split(": ");
    return parts.length > 1 ? parts.slice(1).join(": ") : activeOption.displayText;
  }, [variantOptions, activeVariantLabel, showDemo]);

  const totalVariants = useMemo(() => {
    if (!showDemo) return 0;
    return variantOptions.length > 1 ? variantOptions.length : 1;
  }, [variantOptions, showDemo]);

  const arrangementCount = totalVariants;

  const playabilityScore = useMemo(() => {
    if (!showDemo) return null;
    if (segments.length > 0) {
      return computePlayabilityScore(segments, difficulty);
    }
    // Fallback when segments not wired
    let score = 92;
    if (activePositionLabel?.toLowerCase().includes("fret 7") || activePositionLabel?.toLowerCase().includes("fret 8")) {
      score = 84;
    } else if (activePositionLabel?.toLowerCase().includes("fret 10") || activePositionLabel?.toLowerCase().includes("fret 12")) {
      score = 78;
    }
    const hasComplexChords = chordProgression.some((c) => c.includes("7") || c.includes("maj") || c.includes("dim") || c.includes("aug"));
    if (hasComplexChords) score -= 4;
    return Math.max(65, Math.min(98, score));
  }, [showDemo, segments, difficulty, activePositionLabel, chordProgression]);

  const appliedSetup = useMemo(
    () => formatAppliedSetup({ difficulty, tuning, capo, keySignature: detectedKey }),
    [difficulty, tuning, capo, detectedKey]
  );

  return (
    <section className="border-border-custom flex h-full flex-col justify-between rounded-2xl border bg-white/40 p-6 shadow-xl backdrop-blur md:col-span-1 dark:bg-surface/40">
      <div>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Theory Context
        </h2>
        <p className="mb-4 text-body font-body opacity-75">
          Harmonic insights extracted from audio & arrangement.
        </p>
      </div>

      {showDemo && playabilityScore !== null && (
        <div className="mb-4 flex flex-col gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>
              Playability Score • {playabilityScore}% ({playabilityScore >= 85 ? "Optimal Fret Span" : "Moderate Stretch"})
            </span>
          </div>
          <p className="pl-6 text-[10px] font-semibold capitalize opacity-80">
            Applied: {appliedSetup}
          </p>
        </div>
      )}
      <div className={`flex flex-col gap-3.5 ${!showDemo ? "mt-auto opacity-40" : "opacity-100"}`}>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col justify-between rounded-2xl border border-surface/30 bg-white/50 p-3.5 dark:bg-accent-secondary/50">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-caption font-semibold uppercase opacity-60">Key Signature</p>
              {isKeyOverridden && showDemo && (
                <button
                  type="button"
                  onClick={() => onKeyChange?.(null)}
                  className="cursor-pointer font-medium text-[10px] text-primary hover:underline"
                  title="Reset to auto-detected key"
                >
                  Reset (Auto)
                </button>
              )}
            </div>

            {showDemo ? (
              <>
                <CustomDropdown
                  options={keyOptions}
                  value={detectedKey}
                  onChange={(val) => onKeyChange?.(val)}
                  allowHoverExpand={true}
                  buttonClassName="py-1.5 text-xs font-bold"
                />
                <div className="mt-1.5 flex items-center justify-between text-[10px] opacity-75">
                  {isKeyOverridden ? (
                    <span className="font-semibold text-amber-600 dark:text-amber-400">Edited by user</span>
                  ) : (
                    <span className="font-semibold text-secondary dark:text-text-custom">Auto-detected</span>
                  )}
                  {modeName && (
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-semibold text-primary dark:bg-primary/20">
                      {modeName}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-1 h-7 w-full rounded-xl bg-surface/40 dark:bg-surface/20" />
            )}
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-surface/30 bg-white/50 p-3.5 dark:bg-accent-secondary/50">
            <p className="text-caption font-semibold uppercase opacity-60">Tempo</p>
            {showDemo ? (
              <p className="mt-1 text-sm font-bold">{detectedTempo}</p>
            ) : (
              <div className="mt-2 h-5 w-16 rounded-xl bg-surface/40 dark:bg-surface/20" />
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-surface/30 bg-white/50 p-3.5 dark:bg-accent-secondary/50 transition-opacity duration-300">
          <p className="mb-2 text-caption font-semibold uppercase opacity-60">Detected Progression</p>
          {showDemo ? (
            <div className="flex flex-wrap gap-2">
              {chordProgression.map((chord, idx) => {
                const romanLabel = chordFunctions[chord];
                return (
                  <span
                    key={idx}
                    className="group relative inline-flex flex-col items-center rounded-xl border border-secondary/20 bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary dark:text-text-custom transition-all duration-200 hover:scale-105 hover:border-secondary/40 shadow-sm"
                  >
                    {chord}
                    {romanLabel && (
                      <span className="mt-0.5 text-[9px] font-normal opacity-60 leading-none">
                        {romanLabel}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-7 w-12 rounded-xl border border-secondary/10 bg-secondary/5 opacity-50" />
              ))}
            </div>
          )}
        </div>

        {showDemo && (
          <div className="grid grid-cols-2 gap-3">
            {activePositionLabel && (
              <div className="flex flex-col justify-between rounded-2xl border border-surface/30 bg-white/50 p-3.5 dark:bg-accent-secondary/50">
                <p className="text-caption font-semibold uppercase opacity-60">Playing Position</p>
                <p className="mt-1 text-xs font-bold capitalize text-primary dark:text-text-custom">
                  {activePositionLabel}
                </p>
              </div>
            )}

            <div className="flex flex-col justify-between rounded-2xl border border-surface/30 bg-white/50 p-3.5 dark:bg-accent-secondary/50">
              <p className="text-caption font-semibold uppercase opacity-60">Arrangements</p>
              <p className="mt-1 text-xs font-bold">
                {arrangementCount === 1
                  ? "1 way to play"
                  : `${arrangementCount} ways to play`}
              </p>
            </div>
          </div>
        )}

        {showDemo && variantOptions.length > 1 && (
          <div className="rounded-2xl border border-surface/30 bg-white/50 p-3.5 dark:bg-accent-secondary/50">
            <p className="mb-2 text-caption font-semibold uppercase opacity-60">Multiple Ways to Play</p>
            <div className="flex flex-wrap gap-1.5">
              {variantOptions.map(({ value, displayText }, idx) => (
                <button
                  key={`${value}-${idx}`}
                  type="button"
                  onClick={() => onSelectVariant?.(value)}
                  className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                    activeVariantLabel === value
                      ? "bg-primary text-white shadow"
                      : "bg-surface opacity-70 hover:opacity-100 dark:bg-accent-secondary"
                  }`}
                >
                  {displayText}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
