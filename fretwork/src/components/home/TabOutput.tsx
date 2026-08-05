import { useState, useRef, useSyncExternalStore, useCallback } from "react";
import { TabSegment } from "@/types/tab";
import { NoteEvent } from "@/lib/alphaTex";
import { TabVersion } from "@/hooks/useAnalysis";
import { HtmlTabView } from "./HtmlTabView";
import { AsciiTabView } from "./AsciiTabView";
import { AlphaTabPrototype } from "./AlphaTabPrototype";
import { NoteEditModal, EditingNoteState } from "./tabOutput/NoteEditModal";
import { TabOutputHeader } from "./tabOutput/TabOutputHeader";

interface TabOutputProps {
  showDemo: boolean;
  segments: TabSegment[];
  notes?: NoteEvent[];
  audioUrl: string | null;
  detectedKey: string;
  detectedTempo: string;
  detectedTempoBpm?: number | null;
  chordProgression: string[];
  showToast: (text: string, tone?: "info" | "error" | "success") => void;
  variantLabels?: string[];
  activeVariantLabel?: string;
  recommendedLabel?: string;
  onSelectVariant?: (label: string) => void;
  onUpdateSegment?: (index: number, positions: { [key: string]: number | null }, chord?: string, pinned?: { [key: string]: boolean }) => void;
  onRecalculate?: () => void;
  onResetToAuto?: () => void;
  isModified?: boolean;
  tuning?: string;
  capo?: number;
  tabVersions?: TabVersion[];
  activeVersionId?: string;
  onSelectVersion?: (versionId: string) => void;
}

const emptySubscribe = () => () => {};

export function TabOutput({
  showDemo,
  segments,
  notes,
  audioUrl,
  detectedKey,
  detectedTempo,
  detectedTempoBpm,
  chordProgression,
  showToast,
  variantLabels = [],
  activeVariantLabel = "Recommended",
  recommendedLabel = "",
  onSelectVariant,
  onUpdateSegment,
  onRecalculate,
  onResetToAuto,
  isModified = false,
  tuning = "standard",
  capo = 0,
  tabVersions = [],
  activeVersionId = "v0",
  onSelectVersion,
}: TabOutputProps) {
  const [viewMode, setViewMode] = useState<"html" | "ascii" | "notation">("notation");
  const [userSegmentsPerLine, setUserSegmentsPerLine] = useState<number>(8);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [editingNote, setEditingNote] = useState<EditingNoteState | null>(null);

  const effectiveShowVersionDropdown = showVersionDropdown && tabVersions.length > 1;

  const handleNoteClick = useCallback((segmentIdx: number, stringKey: string, fretVal: number | null) => {
    const segment = segments[segmentIdx];
    const isPinned = Boolean(segment?.pinned_positions?.[stringKey]);
    setEditingNote({
      segmentIdx,
      originalStringKey: stringKey,
      originalFret: fretVal,
      stringKey,
      fret: fretVal,
      suggestedChord: segment?.suggested_chord ?? "",
      isPinned,
    });
  }, [segments]);

  const seekAudioTo = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleSaveEditingNote = (noteState: EditingNoteState) => {
    const segment = segments[noteState.segmentIdx];
    if (segment) {
      const updatedPositions = { ...segment.positions };
      if (noteState.originalStringKey && noteState.originalStringKey !== noteState.stringKey) {
        updatedPositions[noteState.originalStringKey] = null;
      }
      updatedPositions[noteState.stringKey] = noteState.fret;

      const updatedPinned = { ...(segment.pinned_positions || {}) };
      if (noteState.originalStringKey && noteState.originalStringKey !== noteState.stringKey) {
        delete updatedPinned[noteState.originalStringKey];
      }

      if (noteState.isPinned) {
        updatedPinned[noteState.stringKey] = true;
      } else {
        delete updatedPinned[noteState.stringKey];
      }

      onUpdateSegment?.(noteState.segmentIdx, updatedPositions, noteState.suggestedChord, updatedPinned);
      showToast(
        noteState.isPinned ? "Pinned note." : "Updated note.",
        "success"
      );
    }
    setEditingNote(null);
  };

  void onResetToAuto;

  return (
    <section className="border-border-custom flex flex-1 flex-col gap-5 rounded-3xl border bg-white/40 p-6 shadow-2xl backdrop-blur dark:bg-surface/40">
      <TabOutputHeader
        showDemo={showDemo}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isModified={isModified}
        tabVersions={tabVersions}
        variantLabels={variantLabels}
        activeVariantLabel={activeVariantLabel}
        recommendedLabel={recommendedLabel}
        onRecalculate={onRecalculate}
        onSelectVariant={onSelectVariant}
        showVersionDropdown={effectiveShowVersionDropdown}
        setShowVersionDropdown={setShowVersionDropdown}
        activeVersionId={activeVersionId}
        onSelectVersion={onSelectVersion}
        userSegmentsPerLine={userSegmentsPerLine}
        setUserSegmentsPerLine={setUserSegmentsPerLine}
        segments={segments}
        detectedKey={detectedKey}
        detectedTempo={detectedTempo}
        chordProgression={chordProgression}
        showToast={showToast}
      >
        {showDemo && audioUrl && (
          <div className="border-border-custom flex flex-col gap-2 rounded-xl border bg-white/40 p-3 dark:bg-surface/40">
            <div className="flex items-center gap-2 text-caption font-semibold opacity-70">
              <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Listen along — the active segment highlights as the recording plays
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
              onTimeUpdate={(e) => setCurrentPlaybackTime(e.currentTarget.currentTime)}
            />
          </div>
        )}
      </TabOutputHeader>

      {showDemo ? (
        <div className="animate-in fade-in flex min-h-[350px] flex-1 flex-col gap-6">
          {viewMode === "notation" ? (
            <AlphaTabPrototype
              segments={segments}
              notes={notes}
              tempoBpm={detectedTempoBpm}
              keyLabel={detectedKey}
              onNoteClick={handleNoteClick}
            />
          ) : viewMode === "html" ? (
            <HtmlTabView
              segments={segments}
              audioUrl={audioUrl}
              currentPlaybackTime={currentPlaybackTime}
              detectedKey={detectedKey}
              onSeek={seekAudioTo}
              onNoteClick={handleNoteClick}
            />
          ) : (
            <AsciiTabView
              segments={segments}
              detectedKey={detectedKey}
              detectedTempo={detectedTempo}
              chordProgression={chordProgression}
              showToast={showToast}
              onNoteClick={handleNoteClick}
              audioUrl={audioUrl}
              currentPlaybackTime={currentPlaybackTime}
              userSegmentsPerLine={userSegmentsPerLine}
            />
          )}
        </div>
      ) : (
        <div className="border-border-custom flex min-h-[300px] flex-1 flex-col items-center justify-center rounded-3xl border border-dashed text-center opacity-60">
          <svg className="mb-4 h-12 w-12 text-secondary dark:text-text-custom" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <h3 className="mb-1 text-base font-bold">No Tab Output Generated Yet</h3>
          <p className="max-w-sm text-xs">
            Upload a performance file or click &quot;Load Demo&quot; in the top bar to visualize the optimized fret mappings.
          </p>
        </div>
      )}

      <NoteEditModal
        editingNote={editingNote}
        segments={segments}
        tuning={tuning}
        capo={capo}
        mounted={mounted}
        onClose={() => setEditingNote(null)}
        onSave={handleSaveEditingNote}
        onUpdateEditingNote={setEditingNote}
      />
    </section>
  );
}
