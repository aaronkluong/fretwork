import { useState } from "react";
import { CustomDropdown } from "@/components/ui/CustomDropdown";

interface UploadPanelProps {
  difficulty: string;
  onDifficultyChange: (val: string) => void;
  tuning: string;
  onTuningChange: (val: string) => void;
  capo: number;
  onCapoChange: (val: number) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isRecording: boolean;
  recordingSeconds: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  formatRecordingTime: (s: number) => string;
  uploadedFile: { name: string; size: string; type: string } | null;
  isAnalyzing: boolean;
  analysisSeconds: number;
  showDemo: boolean;
  onReset: () => void;
}

const TUNING_OPTIONS = [
  { value: "standard", label: "Standard Tuning (E A D G B E)" },
  { value: "drop_d", label: "Drop D (D A D G B E)" },
  { value: "drop_c", label: "Drop C (C G C F A D)" },
  { value: "dadgad", label: "DADGAD (D A D G A D)" },
  { value: "eb_standard", label: "Eb Standard (Eb Ab Db Gb Bb Eb)" },
  { value: "open_g", label: "Open G (D G D G B D)" },
];

const CAPO_OPTIONS = Array.from({ length: 13 }, (_, i) => ({
  value: i,
  label: i === 0 ? "No Capo (Fret 0)" : `Fret ${i}`,
}));

export function UploadPanel({
  difficulty,
  onDifficultyChange,
  tuning,
  onTuningChange,
  capo,
  onCapoChange,
  onFileUpload,
  isRecording,
  recordingSeconds,
  onStartRecording,
  onStopRecording,
  formatRecordingTime,
  uploadedFile,
  isAnalyzing,
  analysisSeconds,
  showDemo,
  onReset,
}: UploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const allowed = ["wav", "mp3", "m4a", "webm", "ogg", "flac", "aac", "aiff", "aif", "json", "jams"];
    if (!allowed.includes(ext)) return;

    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.createElement("input");
    input.type = "file";
    input.files = dt.files;
    const syntheticEvent = {
      target: input,
      currentTarget: input,
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onFileUpload(syntheticEvent);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  return (
    <section className="border-border-custom flex flex-col justify-between rounded-2xl border bg-white/40 p-6 shadow-xl backdrop-blur md:col-span-2 dark:bg-surface/40">
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
            <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Audio & Music Files
          </h2>
          <p className="text-body font-body opacity-75">
            Choose your input format and drop your files.
          </p>
        </div>
      </div>

      {/* Row of Controls: Difficulty, Tuning, Capo */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Difficulty Selector with tooltip */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <label className="text-caption font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
            Difficulty
            <div className="group relative inline-flex items-center justify-center cursor-help text-xs text-primary bg-primary/10 rounded-full h-4 w-4 flex-shrink-0">
              i
              <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-lg bg-black/90 p-2 text-[10px] font-medium leading-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-surface">
                <strong>Beginner</strong>: Open / low-neck shapes; avoid barres & big stretches.<br />
                <strong>Intermediate</strong>: Barres & mid-neck OK; soft bias away from upper neck.<br />
                <strong>Expert</strong>: As-is optimizer output (baseline accuracy).
              </span>
            </div>
          </label>
          <div className="flex h-9 rounded-xl bg-surface p-1 dark:bg-accent-secondary">
            {(["beginner", "intermediate", "expert"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onDifficultyChange(level)}
                className={`flex-1 min-w-0 px-1 cursor-pointer rounded-lg text-caption font-bold transition-all duration-200 capitalize truncate ${
                  difficulty === level
                    ? "bg-primary text-white shadow-sm"
                    : "opacity-60 hover:opacity-100 text-primary-text dark:text-accent-secondary-text"
                }`}
                title={level}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Tuning Dropdown */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <label className="text-caption font-bold uppercase tracking-wider opacity-60">Tuning</label>
          <CustomDropdown
            options={TUNING_OPTIONS}
            value={tuning}
            onChange={(val) => onTuningChange(val as string)}
            allowHoverExpand={false}
            buttonClassName="h-9"
          />
        </div>

        {/* Capo Fret Selector */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <label className="text-caption font-bold uppercase tracking-wider opacity-60">Capo Fret</label>
          <CustomDropdown
            options={CAPO_OPTIONS}
            value={capo}
            onChange={(val) => onCapoChange(Number(val))}
            allowHoverExpand={false}
            buttonClassName="h-9"
          />
        </div>
      </div>

      {/* Main Upload Drop Zone OR Active File 75/25 Split Layout */}
      {!uploadedFile ? (
        /* Default Main Drag & Drop Zone */
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-border-custom group relative block cursor-pointer rounded-xl border-2 border-dashed bg-white/20 p-4 sm:p-8 text-center transition-all duration-200 dark:bg-black/10 ${
            isDragging
              ? "border-primary bg-primary/10 dark:bg-primary/10"
              : "hover:border-primary dark:hover:border-primary"
          }`}
        >
          <input
            type="file"
            accept=".wav,.mp3,.m4a,.webm,.ogg,.flac,.aac,.aiff,.aif,.json,.jams"
            onChange={onFileUpload}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform ${
              isDragging ? "bg-primary/20 text-primary scale-110" : "bg-primary/10 text-primary group-hover:scale-110"
            }`}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold">
                {isDragging ? "Drop your audio file here..." : "Drag & drop files or click to browse"}
              </p>
              <p className="mt-1 text-caption opacity-60">
                Supports audio and music files
              </p>
            </div>
          </div>
        </label>
      ) : (
        /* Unified Single Block containing Split Layout with outer dashed border & hover transition */
        <div className={`group/block border-border-custom relative overflow-hidden rounded-xl border-2 border-dashed bg-white/30 shadow-sm transition-all duration-200 dark:bg-black/10 ${
          isDragging
            ? "border-primary bg-primary/5 dark:bg-primary/10"
            : "hover:border-primary"
        }`}>
          <div className="flex flex-col sm:flex-row items-stretch bg-white/40 dark:bg-accent-secondary/20 transition-colors duration-200">
            {/* Left Main Preview Section */}
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center min-w-0">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary dark:text-text-custom">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div className="min-w-0 max-w-full px-2">
                <p className="truncate text-sm font-bold">{uploadedFile.name}</p>
                <p className="mt-0.5 text-caption opacity-60">{uploadedFile.size} • {uploadedFile.type}</p>
              </div>

              {isAnalyzing ? (
                <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-primary">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent flex-shrink-0"></div>
                  Analyzing audio… {formatRecordingTime(analysisSeconds)}
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
                  <span className="rounded bg-success/15 px-2.5 py-1 text-caption font-bold uppercase tracking-wider text-success">
                    Processed
                  </span>
                  {showDemo && (
                    <button
                      onClick={onReset}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-custom bg-surface/80 px-3 py-1 text-caption font-bold text-text-custom shadow-sm transition-all hover:bg-surface hover:shadow-md dark:border-accent-secondary dark:bg-accent-secondary/60 dark:text-accent-secondary-text dark:hover:bg-accent-secondary"
                      title="Discard this take and start a new recording"
                    >
                      <svg className="h-3.5 w-3.5 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Clean Dashed Divider */}
            <div className="hidden sm:block my-3 w-[2px] self-stretch border-r-2 border-dashed border-border-custom/80 pointer-events-none" />
            <div className="block sm:hidden mx-6 h-[2px] border-b-2 border-dashed border-border-custom/80 pointer-events-none" />

            {/* Right Dedicated Upload Zone with balanced min/max width & flex padding */}
            <div className="sm:w-48 flex-shrink-0 p-1.5">
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="group relative flex h-full min-h-[110px] flex-col items-center justify-center p-4 text-center cursor-pointer rounded-lg transition-all duration-200 bg-transparent hover:bg-white/70 dark:hover:bg-accent-secondary/70 hover:shadow-sm"
              >
                <input
                  type="file"
                  accept=".wav,.mp3,.m4a,.webm,.ogg,.flac,.aac,.aiff,.aif,.json,.jams"
                  onChange={onFileUpload}
                  className="hidden"
                />
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110 mb-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-xs font-semibold leading-tight">
                  {isDragging ? "Drop file..." : "Upload New File"}
                </p>
                <p className="text-[10px] opacity-60 mt-1">Drag & drop or click</p>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border-custom opacity-40" />
        <span className="text-caption font-semibold uppercase tracking-wide opacity-50">or record live</span>
        <div className="h-px flex-1 bg-border-custom opacity-40" />
      </div>

      {/* Restored Original Live Recording Box */}
      <div className="border-border-custom mt-4 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-white/20 p-4 text-center sm:p-6 dark:bg-black/10">
        {!isRecording ? (
          <button
            onClick={onStartRecording}
            disabled={isAnalyzing}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
            </svg>
            Start Recording
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
              </span>
              <span className="text-sm font-bold tabular-nums">{formatRecordingTime(recordingSeconds)}</span>
              <span className="text-caption opacity-60">Recording from your microphone…</span>
            </div>
            <button
              onClick={onStopRecording}
              className="flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-transform hover:scale-105"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Stop & Transcribe
            </button>
          </>
        )}
        <p className="text-caption opacity-50">
          Plug in or position your guitar near the mic, then hit record to capture a take and send it straight to the algorithm.
        </p>
      </div>
    </section>
  );
}
