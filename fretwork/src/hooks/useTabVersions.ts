import { useState, useCallback } from "react";
import { TabSegment } from "@/types/tab";
import { NoteEvent } from "@/lib/alphaTex";

export interface TabVersion {
  id: string;
  label: string;
  timestamp: string;
  segments: TabSegment[];
  notes: NoteEvent[];
  pinnedCount: number;
  /** Params that produced this snapshot (for sync / display). */
  difficulty?: string;
  tuning?: string;
  capo?: number;
  keySignature?: string;
}

interface UseTabVersionsProps {
  showToast: (text: string, tone?: "info" | "error" | "success") => void;
  setSegments: (segments: TabSegment[]) => void;
  setNotes: (notes: NoteEvent[]) => void;
  onRestoreVersionInputs?: (version: TabVersion) => void;
}

export function useTabVersions({ showToast, setSegments, setNotes, onRestoreVersionInputs }: UseTabVersionsProps) {
  const [tabVersions, setTabVersions] = useState<TabVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string>("v0");
  const [highlightedPins, setHighlightedPins] = useState<Record<number, Record<string, boolean>>>({});

  const selectVersion = useCallback((versionId: string) => {
    const target = tabVersions.find((v) => v.id === versionId);
    if (target) {
      setActiveVersionId(versionId);
      setSegments(target.segments);
      setNotes(target.notes);
      if (onRestoreVersionInputs) {
        onRestoreVersionInputs(target);
      }
      showToast(`Switched to ${target.label}`, "info");
    }
  }, [tabVersions, setSegments, setNotes, showToast, onRestoreVersionInputs]);

  /** Patch the active version's frets/notes/params in place (param-change sync). */
  const patchActiveVersion = useCallback((
    partial: Partial<Pick<TabVersion, "segments" | "notes" | "pinnedCount" | "difficulty" | "tuning" | "capo" | "keySignature" | "label">>
  ) => {
    setTabVersions((prev) =>
      prev.map((v) =>
        v.id === activeVersionId
          ? { ...v, ...partial }
          : v
      )
    );
  }, [activeVersionId]);

  const resetVersions = useCallback(() => {
    setTabVersions([]);
    setActiveVersionId("v0");
    setHighlightedPins({});
  }, []);

  return {
    tabVersions,
    setTabVersions,
    activeVersionId,
    setActiveVersionId,
    highlightedPins,
    setHighlightedPins,
    selectVersion,
    patchActiveVersion,
    resetVersions,
  };
}
