import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { TabSegment, ToastTone } from "@/types/tab";
import { NoteEvent, segmentsToQuarterNoteEvents } from "@/lib/alphaTex";
import { processJamsWithDifficulty, recalculateTabFromNotes } from "@/lib/cagedAssignment";
import { useTabVersions, TabVersion } from "./useTabVersions";
import { useTheoryAnalysis, inferChordFromMidi } from "./useTheoryAnalysis";
import {
  segmentsToRawNotes,
  segmentsToChords,
  extractChordProgression,
  buildWorkingBaseline,
  pinsToNumeric,
  labelForNotes,
  clearPinnedPositions,
  type RawNote,
  type RawChord,
} from "@/lib/workingTabState";

export type { TabVersion };

interface UseAnalysisProps {
  showToast: (text: string, tone?: ToastTone) => void;
  demoTabSegments: TabSegment[];
  onRestoreInputs?: (params: { difficulty?: string; tuning?: string; capo?: number; keySignature?: string }) => void;
}

const DEMO_TEMPO_BPM = 129;
const RECOMMENDED_LABEL = "Recommended";

export interface TabVariant {
  label: string;
  tab_segments: TabSegment[];
  notes: NoteEvent[];
}

export interface VariantOption {
  value: string;
  displayText: string;
}

function normalizeSegments(
  rawSegments: TabSegment[],
  notes: { start?: number; duration?: number; midi: number }[] = []
): TabSegment[] {
  return rawSegments.map((seg: TabSegment) => {
    let chord = seg.suggested_chord;
    if (!chord) {
      const segMidi = notes
        .filter(n => (n.start ?? 0) >= seg.time_start - 0.05 && (n.start ?? 0) < seg.time_end + 0.05)
        .map(n => n.midi);
      chord = inferChordFromMidi(segMidi);
    }
    return {
      ...seg,
      suggested_chord: chord,
      suggested_voicing: seg.suggested_voicing || "",
      strumming_pattern: seg.strumming_pattern || "D-D-U-D-U",
      fingering: seg.fingering || {},
    };
  });
}

export function useAnalysis({ showToast, demoTabSegments, onRestoreInputs }: UseAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSeconds, setAnalysisSeconds] = useState(0);
  const [showDemo, setShowDemo] = useState(false);

  const {
    autoDetectedKey,
    setAutoDetectedKey,
    userKeyOverride,
    setUserKeyOverride,
    detectedKey,
    isKeyOverridden,
    detectedTempo,
    setDetectedTempo,
    detectedTempoBpm,
    setDetectedTempoBpm,
    chordProgression,
    setChordProgression,
  } = useTheoryAnalysis();

  const [segments, setSegments] = useState<TabSegment[]>(demoTabSegments);
  const [notes, setNotes] = useState<NoteEvent[]>(() => segmentsToQuarterNoteEvents(demoTabSegments));
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isModified, setIsModified] = useState(false);

  const handleRestoreVersionInputs = useCallback((target: TabVersion) => {
    if (target.difficulty) currentDifficultyRef.current = target.difficulty;
    if (target.tuning) currentTuningRef.current = target.tuning;
    if (target.capo !== undefined) currentCapoRef.current = target.capo;
    if (target.keySignature) setUserKeyOverride(target.keySignature);

    primaryResultRef.current = { segments: target.segments, notes: target.notes };

    if (onRestoreInputs) {
      onRestoreInputs({
        difficulty: target.difficulty,
        tuning: target.tuning,
        capo: target.capo,
        keySignature: target.keySignature,
      });
    }
  }, [onRestoreInputs, setUserKeyOverride]);

  const {
    tabVersions,
    setTabVersions,
    activeVersionId,
    setActiveVersionId,
    highlightedPins,
    setHighlightedPins,
    selectVersion,
    patchActiveVersion,
  } = useTabVersions({ showToast, setSegments, setNotes, onRestoreVersionInputs: handleRestoreVersionInputs });

  const [variants, setVariants] = useState<TabVariant[]>([]);
  const [activeVariantLabel, setActiveVariantLabel] = useState<string>(RECOMMENDED_LABEL);
  const [recommendedLabel, setRecommendedLabel] = useState<string>("");

  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const lastJamsDataRef = useRef<unknown>(null);
  const lastAudioDataRef = useRef<{
    notes: RawNote[];
    chords: RawChord[];
    key_signature: string;
    tempo_bpm: number;
  } | null>(null);
  const primaryResultRef = useRef<{ segments: TabSegment[]; notes: NoteEvent[] } | null>(null);
  const originalSegmentsRef = useRef<TabSegment[] | null>(demoTabSegments);
  const currentTuningRef = useRef<string>("standard");
  const currentCapoRef = useRef<number>(0);
  const currentDifficultyRef = useRef<string>("expert");
  /** Monotonic token so stale async param-change responses are ignored. */
  const applyGenerationRef = useRef(0);

  const segmentsRef = useRef<TabSegment[]>(demoTabSegments);
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  const selectVariant = useCallback((label: string) => {
    setActiveVariantLabel(label);
    if (label === RECOMMENDED_LABEL) {
      if (primaryResultRef.current) {
        setSegments(primaryResultRef.current.segments);
        setNotes(primaryResultRef.current.notes);
      }
      return;
    }
    const variant = variants.find((v) => v.label === label);
    if (variant) {
      setSegments(variant.tab_segments);
      setNotes(variant.notes);
    }
  }, [variants]);

  const startAnalysisTimer = useCallback(() => {
    setAnalysisSeconds(0);
    if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    analysisTimerRef.current = setInterval(() => {
      setAnalysisSeconds((s) => s + 1);
    }, 1000);
  }, []);

  const stopAnalysisTimer = useCallback(() => {
    if (analysisTimerRef.current) {
      clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
  }, []);

  /** Seed param refs on every successful ingest so later re-fingers use the right open strings. */
  const seedParamRefs = useCallback((tuning: string, capo: number, difficulty: string) => {
    currentTuningRef.current = tuning;
    currentCapoRef.current = capo;
    currentDifficultyRef.current = difficulty;
  }, []);

  /**
   * Single commit path for live tab + theory + baseline + version head.
   * All recalculation results flow through here so surfaces stay in sync.
   */
  const commitWorkingState = useCallback((opts: {
    newSegments: TabSegment[];
    newNotes: NoteEvent[];
    tuning: string;
    capo: number;
    difficulty: string;
    keySignature: string;
    tempoBpm?: number | null;
    baselineNotes?: RawNote[];
    baselineChords?: RawChord[];
    createVersion?: boolean;
    versionPinnedCount?: number;
    clearPins?: boolean;
    clearVariants?: boolean;
    clearModified?: boolean;
    updateAutoKey?: boolean;
  }) => {
    let segs = opts.newSegments;
    if (opts.clearPins) {
      segs = clearPinnedPositions(segs);
    }

    const finalNotes =
      opts.newNotes && opts.newNotes.length > 0
        ? opts.newNotes
        : segmentsToQuarterNoteEvents(segs);

    setSegments(segs);
    setNotes(finalNotes);
    primaryResultRef.current = { segments: segs, notes: finalNotes };

    currentTuningRef.current = opts.tuning;
    currentCapoRef.current = opts.capo;
    currentDifficultyRef.current = opts.difficulty;

    const pitchBaseline =
      opts.baselineNotes && opts.baselineNotes.length > 0
        ? opts.baselineNotes
        : segmentsToRawNotes(segs, opts.tuning, opts.capo);
    const chordBaseline =
      opts.baselineChords && opts.baselineChords.length > 0
        ? opts.baselineChords
        : segmentsToChords(segs);

    lastAudioDataRef.current = {
      notes: pitchBaseline,
      chords: chordBaseline,
      key_signature: opts.keySignature,
      tempo_bpm: opts.tempoBpm ?? detectedTempoBpm ?? 120,
    };

    if (opts.updateAutoKey) {
      setAutoDetectedKey(opts.keySignature);
    }

    if (opts.tempoBpm != null) {
      setDetectedTempo(`${Math.round(opts.tempoBpm)} BPM`);
      setDetectedTempoBpm(opts.tempoBpm);
    }

    const chords = extractChordProgression(segs);
    if (chords.length) setChordProgression(chords);

    setRecommendedLabel(labelForNotes(finalNotes));

    if (opts.clearVariants) {
      setVariants([]);
      setActiveVariantLabel(RECOMMENDED_LABEL);
    }

    if (opts.clearModified) {
      setIsModified(false);
      setHighlightedPins({});
    }

    if (opts.createVersion) {
      setTabVersions((prev) => {
        const nextVerIndex = prev.length;
        const verId = `v${nextVerIndex}`;
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const pinN = opts.versionPinnedCount ?? 0;
        const versionItem: TabVersion = {
          id: verId,
          label: `Recalc v${nextVerIndex}${pinN > 0 ? ` (${pinN} ${pinN === 1 ? "pin" : "pins"})` : " (0 pins)"}`,
          timestamp: timeStr,
          segments: segs,
          notes: finalNotes,
          pinnedCount: pinN,
          difficulty: opts.difficulty,
          tuning: opts.tuning,
          capo: opts.capo,
          keySignature: opts.keySignature,
        };
        setActiveVersionId(verId);
        return [...prev, versionItem];
      });
    } else {
      // Patch active version head so revert doesn't resurrect pre-param frets
      patchActiveVersion({
        segments: segs,
        notes: finalNotes,
        difficulty: opts.difficulty,
        tuning: opts.tuning,
        capo: opts.capo,
        keySignature: opts.keySignature,
      });
    }
  }, [
    detectedTempoBpm,
    setAutoDetectedKey,
    setDetectedTempo,
    setDetectedTempoBpm,
    setChordProgression,
    setHighlightedPins,
    setTabVersions,
    setActiveVersionId,
    patchActiveVersion,
  ]);

  const processAudioFile = useCallback((file: File, tuning: string = "standard", capo: number = 0, difficulty: string = "expert") => {
    setIsAnalyzing(true);
    startAnalysisTimer();
    setShowDemo(false);
    setIsModified(false);
    lastJamsDataRef.current = null;
    setVariants([]);
    setActiveVariantLabel(RECOMMENDED_LABEL);
    primaryResultRef.current = null;
    seedParamRefs(tuning, capo, difficulty);

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    audioUrlRef.current = objectUrl;
    setAudioUrl(objectUrl);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("tuning", tuning);
      formData.append("capo", String(capo));
      formData.append("difficulty", difficulty);
      fetch(`/api/transcribe`, { method: "POST", body: formData })
        .then(async (res) => {
          if (!res.ok) {
            let detail = "";
            try {
              const errJson = await res.json();
              detail = errJson?.detail || "";
            } catch {}
            const backendError = new Error(detail || `Backend returned an error (HTTP ${res.status}).`) as Error & { isBackendError: boolean };
            backendError.isBackendError = true;
            throw backendError;
          }
          return res.json();
        })
        .then((result) => {
          setIsAnalyzing(false);
          stopAnalysisTimer();
          const keySig = result.key_signature || "Unknown Key";
          setAutoDetectedKey(keySig);
          setUserKeyOverride(null);
          setDetectedTempo(result.tempo_bpm ? `${Math.round(result.tempo_bpm)} BPM` : "—");
          setDetectedTempoBpm(result.tempo_bpm || null);
          const chords: string[] = [];
          (result.chords || []).forEach((c: { chord: string }) => {
            if (c.chord && !chords.includes(c.chord)) chords.push(c.chord);
          });
          setChordProgression(chords.length ? chords : ["—"]);
          const resultNotes: { start: number; duration: number; midi: number }[] = Array.isArray(result.notes) ? result.notes : [];
          const newSegments = normalizeSegments(result.tab_segments, resultNotes);
          const newNotes: NoteEvent[] =
            Array.isArray(result.notes) && result.notes.length > 0
              ? result.notes
              : segmentsToQuarterNoteEvents(newSegments);
          setSegments(newSegments);
          setNotes(newNotes);
          primaryResultRef.current = { segments: newSegments, notes: newNotes };
          setRecommendedLabel(labelForNotes(newNotes));
          seedParamRefs(tuning, capo, difficulty);

          const initVer: TabVersion = {
            id: "v0",
            label: "Original",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            segments: newSegments,
            notes: newNotes,
            pinnedCount: 0,
            difficulty,
            tuning,
            capo,
            keySignature: keySig,
          };
          setTabVersions([initVer]);
          setActiveVersionId("v0");
          setHighlightedPins({});

          const rawVariants: { label: string; tab_segments: TabSegment[]; notes: NoteEvent[] }[] =
            Array.isArray(result.variants) ? result.variants : [];
          setVariants(
            rawVariants.map((v) => ({
              label: v.label,
              tab_segments: normalizeSegments(v.tab_segments),
              notes: Array.isArray(v.notes) && v.notes.length > 0
                ? v.notes
                : segmentsToQuarterNoteEvents(normalizeSegments(v.tab_segments)),
            })),
          );
          setActiveVariantLabel(RECOMMENDED_LABEL);

          lastAudioDataRef.current = {
            notes: (result.notes || []).map((n: { start: number; duration: number; midi: number }) => ({
              start: n.start,
              duration: n.duration,
              midi: n.midi
            })),
            chords: (result.chords || []).map((c: { start: number; end: number; chord: string }) => ({
              start: c.start,
              end: c.end,
              chord: c.chord
            })),
            key_signature: result.key_signature || "Unknown Key",
            tempo_bpm: result.tempo_bpm || 120
          };
          setShowDemo(true);
        })
        .catch((err: unknown) => {
          setIsAnalyzing(false);
          stopAnalysisTimer();
          if (err instanceof Error && (err as Error & { isBackendError?: boolean }).isBackendError) {
            showToast(err.message?.trim() || "Transcription failed.", "error");
          } else {
            showToast("Backend offline. Try again shortly.", "error");
          }
        });
    } else {
      setTimeout(() => {
        setIsAnalyzing(false);
        stopAnalysisTimer();
        setAutoDetectedKey("Eb minor");
        setUserKeyOverride(null);
        setDetectedTempo("129 BPM");
        setDetectedTempoBpm(DEMO_TEMPO_BPM);

        const rawNotes = segmentsToRawNotes(demoTabSegments, "standard", 0);
        const rawChords = segmentsToChords(demoTabSegments);
        const processed = recalculateTabFromNotes(
          rawNotes,
          rawChords,
          "Eb minor",
          DEMO_TEMPO_BPM,
          difficulty,
          tuning,
          capo
        );

        setChordProgression(["Ebm7", "Ab7", "Dbmaj7", "Gbmaj7"]);
        setSegments(processed.tab_segments);
        setNotes(processed.notes);
        setRecommendedLabel(labelForNotes(processed.notes));
        seedParamRefs(tuning, capo, difficulty);
        lastAudioDataRef.current = {
          notes: rawNotes,
          chords: rawChords,
          key_signature: "Eb minor",
          tempo_bpm: DEMO_TEMPO_BPM
        };
        setShowDemo(true);
      }, 2000);
    }
  }, [demoTabSegments, showToast, startAnalysisTimer, stopAnalysisTimer, setAutoDetectedKey, setUserKeyOverride, setDetectedTempo, setDetectedTempoBpm, setChordProgression, setTabVersions, setActiveVersionId, setHighlightedPins, seedParamRefs]);

  const processJamsFile = useCallback((file: File, tuning: string = "standard", capo: number = 0, difficulty: string = "expert") => {
    setIsAnalyzing(true);
    startAnalysisTimer();
    setShowDemo(false);
    lastAudioDataRef.current = null;
    setVariants([]);
    setActiveVariantLabel(RECOMMENDED_LABEL);
    primaryResultRef.current = null;
    seedParamRefs(tuning, capo, difficulty);

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.tab_segments && Array.isArray(data.tab_segments)) {
          setTimeout(() => {
            setIsAnalyzing(false);
            stopAnalysisTimer();
            const keySig = data.key_signature || "Unknown Key";
            const tempoVal = data.tempo_bpm || 120;

            const rawNotes = segmentsToRawNotes(data.tab_segments, tuning, capo);
            const rawChords = segmentsToChords(data.tab_segments);
            const processed = recalculateTabFromNotes(
              rawNotes,
              rawChords,
              keySig,
              tempoVal,
              difficulty,
              tuning,
              capo
            );

            setAutoDetectedKey(processed.key_signature);
            setUserKeyOverride(null);
            setDetectedTempo(processed.tempo_bpm ? `${processed.tempo_bpm} BPM` : "120 BPM");
            setDetectedTempoBpm(processed.tempo_bpm || null);
            setChordProgression(extractChordProgression(processed.tab_segments));
            setSegments(processed.tab_segments);
            setNotes(processed.notes);
            setRecommendedLabel(labelForNotes(processed.notes));
            seedParamRefs(tuning, capo, difficulty);

            const initVer: TabVersion = {
              id: "v0",
              label: "Original",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              segments: processed.tab_segments,
              notes: processed.notes,
              pinnedCount: 0,
              difficulty,
              tuning,
              capo,
              keySignature: processed.key_signature,
            };
            setTabVersions([initVer]);
            setActiveVersionId("v0");
            setHighlightedPins({});

            lastAudioDataRef.current = {
              notes: rawNotes,
              chords: rawChords,
              key_signature: processed.key_signature,
              tempo_bpm: processed.tempo_bpm || 120
            };
            setShowDemo(true);
          }, 1500);
        } else if (data.annotations && Array.isArray(data.annotations)) {
          lastJamsDataRef.current = data;
          const processed = processJamsWithDifficulty(data, difficulty, tuning, capo);
          setTimeout(() => {
            setIsAnalyzing(false);
            stopAnalysisTimer();
            setAutoDetectedKey(processed.key_signature);
            setUserKeyOverride(null);
            setDetectedTempo(`${processed.tempo_bpm} BPM`);
            setDetectedTempoBpm(processed.tempo_bpm || null);
            setChordProgression(extractChordProgression(processed.tab_segments));
            const jamsNotes = processed.notes || segmentsToQuarterNoteEvents(processed.tab_segments);
            setSegments(processed.tab_segments);
            setNotes(jamsNotes);
            setRecommendedLabel(labelForNotes(jamsNotes));
            seedParamRefs(tuning, capo, difficulty);

            const initVer: TabVersion = {
              id: "v0",
              label: "Original",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              segments: processed.tab_segments,
              notes: jamsNotes,
              pinnedCount: 0,
              difficulty,
              tuning,
              capo,
              keySignature: processed.key_signature,
            };
            setTabVersions([initVer]);
            setActiveVersionId("v0");
            setHighlightedPins({});
            setShowDemo(true);
          }, 1000);
        } else {
          throw new Error("Invalid format");
        }
      } catch {
        setTimeout(() => {
          setIsAnalyzing(false);
          stopAnalysisTimer();
          showToast("Invalid file format. Use JAMS or JSON.", "error");
        }, 1000);
      }
    };
    reader.readAsText(file);
  }, [showToast, startAnalysisTimer, stopAnalysisTimer, setAutoDetectedKey, setUserKeyOverride, setDetectedTempo, setDetectedTempoBpm, setChordProgression, seedParamRefs, setTabVersions, setActiveVersionId, setHighlightedPins]);

  /**
   * Local pitch-preserving re-finger under new params.
   * Always builds baseline from current working segments + current param refs.
   */
  const recalculateLocalTab = useCallback((tuning: string, capo: number, difficulty: string, keyOverride?: string | null) => {
    const activeKey = keyOverride !== undefined ? keyOverride : userKeyOverride;
    const currentSegs = segmentsRef.current;

    if (lastJamsDataRef.current || lastAudioDataRef.current) {
      setVariants([]);
      setActiveVariantLabel(RECOMMENDED_LABEL);
      primaryResultRef.current = null;
    }

    const baseline = (currentSegs && currentSegs.length > 0)
      ? buildWorkingBaseline(
          currentSegs,
          currentTuningRef.current,
          currentCapoRef.current,
          tuning,
          capo
        )
      : {
          notes: lastAudioDataRef.current?.notes || [],
          chords: lastAudioDataRef.current?.chords || [],
          pins: {} as Record<string, [number, number]>,
          pinCount: 0,
        };

    const keyToUse = activeKey || autoDetectedKey || lastAudioDataRef.current?.key_signature || "C major";
    const tempo_bpm = detectedTempoBpm || lastAudioDataRef.current?.tempo_bpm || 120;

    if (baseline.notes.length === 0) return;

    const processed = recalculateTabFromNotes(
      baseline.notes,
      baseline.chords,
      keyToUse,
      tempo_bpm,
      difficulty,
      tuning,
      capo,
      baseline.pinCount > 0 ? pinsToNumeric(baseline.pins) : undefined
    );

    commitWorkingState({
      newSegments: processed.tab_segments,
      newNotes: processed.notes,
      tuning,
      capo,
      difficulty,
      keySignature: activeKey ? keyToUse : processed.key_signature,
      tempoBpm: processed.tempo_bpm || tempo_bpm,
      baselineNotes: baseline.notes,
      baselineChords: baseline.chords,
      createVersion: false,
      clearVariants: true,
      clearModified: true,
      clearPins: baseline.pinCount > 0,
      updateAutoKey: !activeKey,
    });
  }, [userKeyOverride, autoDetectedKey, detectedTempoBpm, commitWorkingState]);

  /**
   * Backend pinned re-decode. Returns:
   *  - true  → handled successfully (state committed)
   *  - false → not applicable or failed; caller should fall back to local
   */
  const recalculatePinned = useCallback(async (tuning: string, capo: number, difficulty: string): Promise<boolean> => {
    const currentSegs = segmentsRef.current;
    if (!currentSegs || currentSegs.length === 0) {
      return false;
    }
    if (activeVariantLabel !== RECOMMENDED_LABEL) {
      return false;
    }

    const generation = ++applyGenerationRef.current;

    const baseline = buildWorkingBaseline(
      currentSegs,
      currentTuningRef.current,
      currentCapoRef.current,
      tuning,
      capo
    );
    if (baseline.notes.length === 0) {
      return false;
    }

    const key_signature = userKeyOverride || autoDetectedKey || "C major";
    const hadPendingEdits = baseline.pinCount > 0;

    try {
      const res = await fetch("/api/pinned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: baseline.notes,
          pins: baseline.pins,
          delete: [] as number[],
          tuning,
          capo,
          difficulty,
          key_signature,
          chords: baseline.chords,
        }),
      });

      if (generation !== applyGenerationRef.current) {
        // Stale response — a newer param change is in flight
        return true;
      }

      if (!res.ok) {
        let detail = "";
        try {
          const errJson = await res.json();
          detail = errJson?.detail || "";
        } catch {}
        showToast(detail || "Recalculate failed — using offline solver.", "info");
        return false;
      }

      const result = await res.json();
      if (generation !== applyGenerationRef.current) {
        return true;
      }

      const newSegments: TabSegment[] = Array.isArray(result.tab_segments) ? result.tab_segments : [];
      const newNotes: NoteEvent[] = Array.isArray(result.notes) ? result.notes : [];
      if (newSegments.length === 0) {
        return false;
      }

      commitWorkingState({
        newSegments,
        newNotes,
        tuning,
        capo,
        difficulty,
        keySignature: key_signature,
        tempoBpm: detectedTempoBpm,
        baselineNotes: baseline.notes,
        baselineChords: baseline.chords,
        createVersion: false,
        clearVariants: true,
        clearModified: true,
        clearPins: hadPendingEdits,
      });

      if (hadPendingEdits) {
        showToast("Recalculated tab around edits.", "success");
      }
      return true;
    } catch {
      if (generation !== applyGenerationRef.current) {
        return true;
      }
      showToast("Backend offline — using offline solver.", "info");
      return false;
    }
  }, [activeVariantLabel, userKeyOverride, autoDetectedKey, detectedTempoBpm, showToast, commitWorkingState]);

  const recalculateFromCurrentSegments = useCallback(async (tuning = "standard", capo = 0, difficulty = "expert") => {
    const activeKey = userKeyOverride || autoDetectedKey || "C major";
    const bpm = detectedTempoBpm || 120;
    const currentSegs = segmentsRef.current;
    if (!currentSegs || currentSegs.length === 0) return;

    const generation = ++applyGenerationRef.current;

    const baseline = buildWorkingBaseline(
      currentSegs,
      currentTuningRef.current,
      currentCapoRef.current,
      tuning,
      capo
    );

    const hasBackendBaseline = !lastJamsDataRef.current && (!showDemo || lastAudioDataRef.current !== null);

    let newSegments: TabSegment[] = [];
    let newNotes: NoteEvent[] = [];

    if (hasBackendBaseline) {
      try {
        const res = await fetch("/api/pinned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: baseline.notes,
            pins: baseline.pins,
            delete: [] as number[],
            tuning,
            capo,
            difficulty,
            key_signature: activeKey,
            chords: baseline.chords,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tab_segments) && data.tab_segments.length > 0) {
            newSegments = normalizeSegments(data.tab_segments);
            newNotes = data.notes || [];
          } else {
            throw new Error("Invalid response from pinned API");
          }
        } else {
          throw new Error(`Pinned re-decoding API returned status ${res.status}`);
        }
      } catch (err) {
        console.warn("[useAnalysis] Backend /api/pinned re-decoding unavailable, falling back to local solver:", err);
        showToast("Re-calculated using offline solver.", "info");
      }
    }

    if (generation !== applyGenerationRef.current) return;

    if (newSegments.length === 0) {
      const processed = recalculateTabFromNotes(
        baseline.notes,
        baseline.chords,
        activeKey,
        bpm,
        difficulty,
        tuning,
        capo,
        baseline.pinCount > 0 ? pinsToNumeric(baseline.pins) : undefined,
        []
      );
      newSegments = processed.tab_segments;
      newNotes = processed.notes;
    }

    commitWorkingState({
      newSegments,
      newNotes,
      tuning,
      capo,
      difficulty,
      keySignature: activeKey,
      tempoBpm: bpm,
      baselineNotes: baseline.notes,
      baselineChords: baseline.chords,
      createVersion: true,
      versionPinnedCount: baseline.pinCount,
      clearVariants: true,
      clearModified: true,
      clearPins: true,
    });

    const successMsg = baseline.pinCount > 0
      ? `Tab re-optimized for ${baseline.pinCount} pinned note${baseline.pinCount > 1 ? "s" : ""}.`
      : "Tab recalculated.";
    showToast(successMsg, "success");
  }, [userKeyOverride, autoDetectedKey, detectedTempoBpm, showToast, showDemo, commitWorkingState]);

  const setKeyOverride = useCallback((newKey: string | null, tuning = "standard", capo = 0, difficulty = "expert") => {
    setUserKeyOverride(newKey);
    recalculateLocalTab(tuning, capo, difficulty, newKey);
  }, [setUserKeyOverride, recalculateLocalTab]);

  const loadDemo = useCallback(async (tuning: string = "standard", capo: number = 0, difficulty: string = "expert") => {
    setIsAnalyzing(true);
    startAnalysisTimer();
    setShowDemo(false);
    lastJamsDataRef.current = null;
    lastAudioDataRef.current = null;
    setVariants([]);
    setActiveVariantLabel(RECOMMENDED_LABEL);
    primaryResultRef.current = null;
    seedParamRefs(tuning, capo, difficulty);

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl("/demo.mp3");

    const generation = ++applyGenerationRef.current;

    // 1. Try audio transcription with 20s timeout
    try {
      const audioResp = await fetch("/demo.mp3");
      if (audioResp.ok) {
        const blob = await audioResp.blob();
        const formData = new FormData();
        formData.append("audio", blob, "demo.mp3");
        formData.append("tuning", tuning);
        formData.append("capo", String(capo));
        formData.append("difficulty", difficulty);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        try {
          const apiRes = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (apiRes.ok) {
            const data = await apiRes.json();
            if (generation !== applyGenerationRef.current) return;

            setIsAnalyzing(false);
            stopAnalysisTimer();

            const detectedKey = data.key_signature || "D major";
            const tempoBpm = data.tempo_bpm || 130;
            setAutoDetectedKey(detectedKey);
            setUserKeyOverride(null);
            setDetectedTempo(`${Math.round(tempoBpm)} BPM`);
            setDetectedTempoBpm(tempoBpm);

            lastAudioDataRef.current = {
              notes: data.notes || [],
              chords: data.chords || [],
              key_signature: detectedKey,
              tempo_bpm: tempoBpm,
            };

            const normSegments = normalizeSegments(data.tab_segments || []);
            const normVariants: TabVariant[] = Array.isArray(data.variants)
              ? data.variants.map((v: { label: string; tab_segments: TabSegment[]; notes: NoteEvent[] }) => ({
                  label: v.label,
                  tab_segments: normalizeSegments(v.tab_segments || []),
                  notes: v.notes || [],
                }))
              : [];

            setVariants(normVariants);

            commitWorkingState({
              newSegments: normSegments,
              newNotes: data.notes || [],
              tuning,
              capo,
              difficulty,
              keySignature: detectedKey,
              tempoBpm,
              baselineNotes: data.notes || [],
              baselineChords: data.chords || [],
              createVersion: false,
              clearVariants: false,
              clearModified: true,
              clearPins: true,
            });

            const initVer: TabVersion = {
              id: "v0",
              label: "Original",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              segments: normSegments,
              notes: data.notes || [],
              pinnedCount: 0,
              difficulty,
              tuning,
              capo,
              keySignature: detectedKey,
            };
            setTabVersions([initVer]);
            setActiveVersionId("v0");
            setHighlightedPins({});
            setShowDemo(true);
            showToast("Loaded demo audio.", "success");
            return;
          }
        } catch (fetchErr: unknown) {
          clearTimeout(timeoutId);
          const err = fetchErr as Error;
          if (err?.name === "AbortError") {
            console.warn("[useAnalysis] Audio transcription timed out after 20s — falling back to JAMS annotations.");
            showToast("Transcription timed out. Loading JAMS backup...", "info");
          } else {
            throw fetchErr;
          }
        }
      }
    } catch (err) {
      console.warn("[useAnalysis] Audio transcription for Demo failed, falling back to JAMS:", err);
    }

    // 2. JAMS Backend Fallback if audio transcription takes >20s or fails
    try {
      const jamsResp = await fetch("/demo.jams");
      if (jamsResp.ok) {
        const jamsBlob = await jamsResp.blob();
        const jamsData = new FormData();
        jamsData.append("jams_file", jamsBlob, "demo.jams");
        jamsData.append("tuning", tuning);
        jamsData.append("capo", String(capo));
        jamsData.append("difficulty", difficulty);

        const jamsApiRes = await fetch("/api/process-jams", {
          method: "POST",
          body: jamsData,
        });

        if (jamsApiRes.ok) {
          const data = await jamsApiRes.json();
          if (generation !== applyGenerationRef.current) return;

          setIsAnalyzing(false);
          stopAnalysisTimer();

          const detectedKey = data.key_signature || "D major";
          const tempoBpm = data.tempo_bpm || 130;
          setAutoDetectedKey(detectedKey);
          setUserKeyOverride(null);
          setDetectedTempo(`${Math.round(tempoBpm)} BPM`);
          setDetectedTempoBpm(tempoBpm);

          lastJamsDataRef.current = data;

          const normSegments = normalizeSegments(data.tab_segments || []);
          const normVariants: TabVariant[] = Array.isArray(data.variants)
            ? data.variants.map((v: { label: string; tab_segments: TabSegment[]; notes: NoteEvent[] }) => ({
                label: v.label,
                tab_segments: normalizeSegments(v.tab_segments || []),
                notes: v.notes || [],
              }))
            : [];

          setVariants(normVariants);

          commitWorkingState({
            newSegments: normSegments,
            newNotes: data.notes || [],
            tuning,
            capo,
            difficulty,
            keySignature: detectedKey,
            tempoBpm,
            baselineNotes: data.notes || [],
            baselineChords: data.chords || [],
            createVersion: false,
            clearVariants: false,
            clearModified: true,
            clearPins: true,
          });

          const initVer: TabVersion = {
            id: "v0",
            label: "Original",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            segments: normSegments,
            notes: data.notes || [],
            pinnedCount: 0,
            difficulty,
            tuning,
            capo,
            keySignature: detectedKey,
          };
          setTabVersions([initVer]);
          setActiveVersionId("v0");
          setHighlightedPins({});
          setShowDemo(true);
          showToast("Loaded demo JAMS.", "success");
          return;
        }
      }
    } catch (jamsErr) {
      console.warn("[useAnalysis] JAMS backend fallback failed, using offline solver:", jamsErr);
    }

    if (generation !== applyGenerationRef.current) return;

    // Offline fallback if backend endpoint is unavailable
    setTimeout(() => {
      if (generation !== applyGenerationRef.current) return;
      setIsAnalyzing(false);
      stopAnalysisTimer();
      setAutoDetectedKey("Eb minor");
      setUserKeyOverride(null);
      setDetectedTempo("129 BPM");
      setDetectedTempoBpm(DEMO_TEMPO_BPM);

      const rawNotes = segmentsToRawNotes(demoTabSegments, "standard", 0);
      const rawChords = segmentsToChords(demoTabSegments);
      const processed = recalculateTabFromNotes(
        rawNotes,
        rawChords,
        "Eb minor",
        DEMO_TEMPO_BPM,
        difficulty,
        tuning,
        capo
      );

      const lowFretTab = recalculateTabFromNotes(rawNotes, rawChords, "Eb minor", DEMO_TEMPO_BPM, "beginner", tuning, capo);
      const highFretTab = recalculateTabFromNotes(rawNotes, rawChords, "Eb minor", DEMO_TEMPO_BPM, "intermediate", tuning, capo);

      const demoVariants: TabVariant[] = [
        {
          label: "Low-Position Voicings",
          tab_segments: lowFretTab.tab_segments,
          notes: lowFretTab.notes,
        },
        {
          label: "Upper-Fret Voicings",
          tab_segments: highFretTab.tab_segments,
          notes: highFretTab.notes,
        },
      ];

      setVariants(demoVariants);

      setChordProgression(extractChordProgression(processed.tab_segments).length
        ? extractChordProgression(processed.tab_segments)
        : ["—"]);
      setSegments(processed.tab_segments);
      setNotes(processed.notes);
      setRecommendedLabel(labelForNotes(processed.notes));
      originalSegmentsRef.current = processed.tab_segments;
      seedParamRefs(tuning, capo, difficulty);

      const initVer: TabVersion = {
        id: "v0",
        label: "Original",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        segments: processed.tab_segments,
        notes: processed.notes,
        pinnedCount: 0,
        difficulty,
        tuning,
        capo,
        keySignature: "Eb minor",
      };
      setTabVersions([initVer]);
      setActiveVersionId("v0");
      setHighlightedPins({});

      lastAudioDataRef.current = {
        notes: rawNotes,
        chords: rawChords,
        key_signature: "Eb minor",
        tempo_bpm: DEMO_TEMPO_BPM
      };
      setShowDemo(true);
    }, 400);
  }, [demoTabSegments, startAnalysisTimer, stopAnalysisTimer, setAutoDetectedKey, setUserKeyOverride, setDetectedTempo, setDetectedTempoBpm, setChordProgression, setTabVersions, setActiveVersionId, setHighlightedPins, seedParamRefs, commitWorkingState, showToast]);

  const reset = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    lastJamsDataRef.current = null;
    lastAudioDataRef.current = null;
    primaryResultRef.current = null;
    setVariants([]);
    setActiveVariantLabel(RECOMMENDED_LABEL);
    setAudioUrl(null);
    setShowDemo(false);
    setIsModified(false);
    seedParamRefs("standard", 0, "expert");
  }, [seedParamRefs]);

  const resetToAuto = useCallback(() => {
    if (originalSegmentsRef.current && originalSegmentsRef.current.length > 0) {
      const restored = JSON.parse(JSON.stringify(originalSegmentsRef.current));
      setSegments(restored);
      const restoredNotes = segmentsToQuarterNoteEvents(restored);
      setNotes(restoredNotes);
      setIsModified(false);
      showToast("Restored original positions.", "info");
    }
  }, [showToast]);

  const updateSegment = useCallback((
    index: number,
    updatedPositions: { [key: string]: number | null },
    updatedChord?: string,
    updatedPinned?: { [key: string]: boolean }
  ) => {
    setSegments((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = {
          ...copy[index],
          positions: updatedPositions,
          ...(updatedChord !== undefined ? { suggested_chord: updatedChord } : {}),
          ...(updatedPinned !== undefined ? { pinned_positions: updatedPinned } : {}),
        };
      }
      const updatedNotes = segmentsToQuarterNoteEvents(copy);
      setNotes(updatedNotes);

      if (activeVariantLabel === RECOMMENDED_LABEL) {
        if (primaryResultRef.current) {
          primaryResultRef.current = {
            ...primaryResultRef.current,
            segments: copy,
            notes: updatedNotes,
          };
        }
      } else {
        setVariants((prevVars) =>
          prevVars.map((v) =>
            v.label === activeVariantLabel
              ? { ...v, tab_segments: copy, notes: updatedNotes }
              : v
          )
        );
      }
      setIsModified(true);
      return copy;
    });

    if (updatedPinned) {
      setHighlightedPins((prev) => ({
        ...prev,
        [index]: { ...(prev[index] || {}), ...updatedPinned },
      }));
    }
  }, [activeVariantLabel, setHighlightedPins]);

  useEffect(() => {
    return () => {
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  const variantOptions: VariantOption[] = useMemo(() => {
    const raw: VariantOption[] = [
      {
        value: RECOMMENDED_LABEL,
        displayText: recommendedLabel ? `Recommended: ${recommendedLabel}` : "Recommended",
      },
      ...variants.map((v) => ({ value: v.label, displayText: `Alternate: ${v.label}` })),
    ];
    const seen = new Set<string>();
    return raw.filter((opt) => {
      if (seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  }, [recommendedLabel, variants]);

  return {
    isAnalyzing,
    analysisSeconds,
    showDemo,
    detectedKey,
    autoDetectedKey,
    isKeyOverridden,
    setKeyOverride,
    detectedTempo,
    detectedTempoBpm,
    chordProgression,
    segments,
    notes,
    audioUrl,
    variants,
    variantOptions,
    activeVariantLabel,
    recommendedLabel,
    isModified,
    tabVersions,
    activeVersionId,
    highlightedPins,
    selectVersion,
    selectVariant,
    processAudioFile,
    processJamsFile,
    recalculateLocalTab,
    recalculateFromCurrentSegments,
    recalculatePinned,
    resetToAuto,
    loadDemo,
    reset,
    updateSegment,
  };
}
