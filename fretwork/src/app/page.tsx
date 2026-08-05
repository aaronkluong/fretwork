"use client";

import { useState, useEffect, useRef } from "react";
import { useToasts } from "@/hooks/useToasts";
import { useTheme } from "@/hooks/useTheme";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useAnalysis } from "@/hooks/useAnalysis";
import { Header } from "@/components/layout/Header";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { UploadPanel } from "@/components/home/UploadPanel";
import { TheoryPanel } from "@/components/home/TheoryPanel";
import { TabOutput } from "@/components/home/TabOutput";
import { demoTabSegments } from "@/lib/asciiGenerator";

export default function Home() {
  const { toasts, showToast, dismissToast } = useToasts();
  const { themeMode, cycleTheme } = useTheme();
  
  const [difficulty, setDifficulty] = useState<string>("expert");
  const [tuning, setTuning] = useState<string>("standard");
  const [capo, setCapo] = useState<number>(0);

  const prevParamsRef = useRef<{ tuning: string; capo: number; difficulty: string } | null>(null);

  const {
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
  } = useAnalysis({
    showToast,
    demoTabSegments,
    onRestoreInputs: ({ difficulty: d, tuning: t, capo: c }) => {
      const nextDiff = d ?? difficulty;
      const nextTun = t ?? tuning;
      const nextCap = c ?? capo;
      if (d) setDifficulty(d);
      if (t) setTuning(t);
      if (c !== undefined) setCapo(c);
      prevParamsRef.current = { tuning: nextTun, capo: nextCap, difficulty: nextDiff };
    },
  });


  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    type: string;
  } | null>(null);

  const handleFileReady = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    setUploadedFile({
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
      type: ext.toUpperCase(),
    });
    processAudioFile(file, tuning, capo, difficulty);
  };

  const {
    isRecording,
    recordingSeconds,
    startRecording,
    stopRecording,
    formatRecordingTime,
  } = useAudioRecording({ onFileReady: handleFileReady, showToast });

  const handleStartRecording = () => {
    setUploadedFile(null);
    reset();
    startRecording();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      setUploadedFile({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        type: ext.toUpperCase(),
      });
      
      const isJams = ext === "jams" || ext === "json";
      if (isJams) {
        processJamsFile(file, tuning, capo, difficulty);
      } else {
        processAudioFile(file, tuning, capo, difficulty);
      }
    }
  };

  const handleLoadDemo = () => {
    setUploadedFile({
      name: "demo.mp3",
      size: "0.12 MB",
      type: "MP3",
    });
    loadDemo(tuning, capo, difficulty);
  };

  const handleReset = () => {
    setUploadedFile(null);
    reset();
    showToast("Reset complete.", "info");
  };

  useEffect(() => {
    const prev = prevParamsRef.current;
    if (prev && prev.tuning === tuning && prev.capo === capo && prev.difficulty === difficulty) {
      return;
    }
    prevParamsRef.current = { tuning, capo, difficulty };

    if (showDemo) {
      (async () => {
        const handledByBackend = await recalculatePinned(tuning, capo, difficulty);
        if (!handledByBackend) {
          recalculateLocalTab(tuning, capo, difficulty);
        }
      })();
    }
  }, [showDemo, tuning, capo, difficulty, recalculatePinned, recalculateLocalTab]);

  return (
    <div className="flex min-h-screen flex-col bg-background-custom font-sans text-primary-text transition-colors duration-300 dark:bg-background-custom dark:text-accent-secondary-text">
      <Header
        onLoadDemo={handleLoadDemo}
        themeMode={themeMode}
        onCycleTheme={cycleTheme}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="py-6 text-center sm:text-left">
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Playable tabs,{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              optimized by theory.
            </span>
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed opacity-80 sm:text-base">
            Fretwork is a platform that transcribes polyphonic guitar recordings
            and uses music theory to map notes to finger patterns that feel
            natural on the fretboard.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <UploadPanel
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            tuning={tuning}
            onTuningChange={setTuning}
            capo={capo}
            onCapoChange={setCapo}
            onFileUpload={handleFileUpload}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            onStartRecording={handleStartRecording}
            onStopRecording={stopRecording}
            formatRecordingTime={formatRecordingTime}
            uploadedFile={uploadedFile}
            isAnalyzing={isAnalyzing}
            analysisSeconds={analysisSeconds}
            showDemo={showDemo}
            onReset={handleReset}
          />

          <TheoryPanel
            showDemo={showDemo}
            detectedKey={detectedKey}
            autoDetectedKey={autoDetectedKey}
            isKeyOverridden={isKeyOverridden}
            onKeyChange={(newKey) => setKeyOverride(newKey, tuning, capo, difficulty)}
            detectedTempo={detectedTempo}
            chordProgression={chordProgression}
            variantOptions={variantOptions}
            activeVariantLabel={activeVariantLabel}
            onSelectVariant={selectVariant}
            segments={segments}
            difficulty={difficulty}
            tuning={tuning}
            capo={capo}
          />
        </div>

        <TabOutput
          showDemo={showDemo}
          segments={segments}
          notes={notes}
          audioUrl={audioUrl}
          detectedKey={detectedKey}
          detectedTempo={detectedTempo}
          detectedTempoBpm={detectedTempoBpm}
          chordProgression={chordProgression}
          showToast={showToast}
          variantLabels={variants.map((v) => v.label)}
          activeVariantLabel={activeVariantLabel}
          recommendedLabel={recommendedLabel}
          onSelectVariant={selectVariant}
          onUpdateSegment={updateSegment}
          onRecalculate={() => recalculateFromCurrentSegments(tuning, capo, difficulty)}
          onResetToAuto={resetToAuto}
          isModified={isModified}
          tuning={tuning}
          capo={capo}
          tabVersions={tabVersions}
          activeVersionId={activeVersionId}
          onSelectVersion={selectVersion}
        />
      </main>

      <footer className="mt-12 border-t border-surface/10 py-6 text-center text-caption opacity-55">
        <p>© 2026 Fretwork Project Team. Open-Source under MIT License.</p>
      </footer>

      <ToastProvider toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
