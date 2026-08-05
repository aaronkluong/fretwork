import { useEffect } from "react";
import { createPortal } from "react-dom";
import { TabSegment } from "@/types/tab";
import { TUNINGS as TUNINGS_MIDI, MIDI_NOTE_NAMES } from "@/lib/theoryConfig";

export interface EditingNoteState {
  segmentIdx: number;
  originalStringKey: string;
  originalFret: number | null;
  stringKey: string;
  fret: number | null;
  suggestedChord: string;
  isPinned: boolean;
}

interface NoteEditModalProps {
  editingNote: EditingNoteState | null;
  segments: TabSegment[];
  tuning: string;
  capo: number;
  mounted: boolean;
  onClose: () => void;
  onSave: (editingNote: EditingNoteState) => void;
  onUpdateEditingNote: (updated: EditingNoteState) => void;
}

function getNoteName(stringKey: string, fretVal: number | null, tuningName = "standard", capo = 0): string {
  if (fretVal === null || fretVal === undefined) return "Muted";
  const stringIndexMap: { [key: string]: number } = {
    string_6: 0, string_5: 1, string_4: 2, string_3: 3, string_2: 4, string_1: 5
  };
  const tuningBase = TUNINGS_MIDI[tuningName] || TUNINGS_MIDI.standard;
  const stringIdx = stringIndexMap[stringKey];
  if (stringIdx === undefined) return "Unknown";
  const midiBase = tuningBase[stringIdx] + capo;
  const noteMidi = midiBase + fretVal;
  const note = MIDI_NOTE_NAMES[noteMidi % 12];
  const octave = Math.floor(noteMidi / 12) - 1;
  return `${note}${octave}`;
}

export function NoteEditModal({
  editingNote,
  segments,
  tuning,
  capo,
  mounted,
  onClose,
  onSave,
  onUpdateEditingNote,
}: NoteEditModalProps) {
  useEffect(() => {
    if (!editingNote) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingNote, onClose]);

  if (!editingNote || !mounted) return null;

  const updateEditingString = (newStringKey: string) => {
    const hasChanged = newStringKey !== editingNote.originalStringKey || editingNote.fret !== editingNote.originalFret;
    onUpdateEditingNote({
      ...editingNote,
      stringKey: newStringKey,
      isPinned: hasChanged ? true : editingNote.isPinned,
    });
  };

  const updateEditingFret = (newFret: number | null) => {
    const hasChanged = editingNote.stringKey !== editingNote.originalStringKey || newFret !== editingNote.originalFret;
    onUpdateEditingNote({
      ...editingNote,
      fret: newFret,
      isPinned: hasChanged ? true : editingNote.isPinned,
    });
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-border-custom w-full max-w-md scale-100 rounded-3xl border bg-white/80 p-6 shadow-2xl transition-transform dark:bg-surface/80 backdrop-blur-xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Fretboard Note
          </h3>
          <button
            type="button"
            onClick={() => onUpdateEditingNote({ ...editingNote, isPinned: !editingNote.isPinned })}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              editingNote.isPinned
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-sm"
                : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200/60 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10"
            }`}
            title={editingNote.isPinned ? "Click to unpin this note" : "Click to pin this note position for tab recalculation"}
          >
            <span className={editingNote.isPinned ? "opacity-100 scale-110" : "opacity-50 grayscale"}>📌</span>
            <span>{editingNote.isPinned ? "Pinned" : "Pin Note"}</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Modifying beat segment at <span className="font-semibold text-primary">{(segments[editingNote.segmentIdx]?.time_start).toFixed(1)}s</span>. Tuning: <span className="font-semibold">{tuning}</span> • Capo: <span className="font-semibold">{capo}</span>
        </p>

        {/* String Selector */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Target String
          </label>
          <div className="grid grid-cols-6 gap-1.5 bg-slate-100 dark:bg-black/25 p-1.5 rounded-2xl">
            {["string_6", "string_5", "string_4", "string_3", "string_2", "string_1"].map((sKey) => {
              const labelsMap: Record<string, string> = {
                string_6: "E", string_5: "A", string_4: "D", string_3: "G", string_2: "B", string_1: "e"
              };
              const isActive = editingNote.stringKey === sKey;
              return (
                <button
                  key={sKey}
                  type="button"
                  onClick={() => updateEditingString(sKey)}
                  className={`rounded-xl py-1.5 text-xs font-bold transition-all duration-200 ease-out active:scale-95 ${
                    isActive ? "bg-primary text-white shadow-md scale-105" : "text-slate-600 hover:bg-slate-200/50 dark:text-slate-300 dark:hover:bg-white/5"
                  }`}
                >
                  {labelsMap[sKey]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fret Grid Selection */}
        <div className="mb-4">
          <div className="mb-1 flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Fret Number
            </label>
            <span className="rounded-full bg-primary/10 dark:bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
              {editingNote.fret !== null ? `Fret ${editingNote.fret} (${getNoteName(editingNote.stringKey, editingNote.fret, tuning, capo)})` : "Delete / Mute Note (X)"}
            </span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 max-h-[50vh] sm:max-h-none overflow-y-auto p-1.5 bg-slate-100 dark:bg-black/25 rounded-2xl border border-slate-200 dark:border-white/5">
            {/* Muted/Delete Button */}
            <button
              type="button"
              onClick={() => updateEditingFret(null)}
              className={`col-span-5 sm:col-span-6 rounded-xl py-1.5 text-xs font-bold transition-all duration-200 ease-out border active:scale-95 ${
                editingNote.fret === null 
                  ? "bg-red-500 text-white border-red-500 shadow-md" 
                  : "bg-white text-red-500 border-red-100 hover:bg-red-50 dark:bg-surface dark:border-white/5 dark:hover:bg-red-950/20"
              }`}
            >
              Delete / Mute Note (X)
            </button>
            {Array.from({ length: 25 }, (_, i) => {
              const isActive = editingNote.fret === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => updateEditingFret(i)}
                  className={`rounded-xl py-1.5 text-xs font-bold transition-all duration-200 ease-out active:scale-95 ${
                    isActive 
                      ? "bg-primary text-white shadow-md scale-105" 
                      : "bg-white text-slate-700 hover:bg-slate-200 dark:bg-surface dark:text-slate-200 dark:hover:bg-white/5"
                  }`}
                >
                  {i}
                </button>
              );
            })}
          </div>
        </div>

        {/* Suggested Chord Field */}
        <div className="mb-6">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Chord Label (Optional)
          </label>
          <input
            type="text"
            value={editingNote.suggestedChord}
            onChange={(e) => onUpdateEditingNote({ ...editingNote, suggestedChord: e.target.value })}
            placeholder="e.g. Ebm7"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-white/10 dark:bg-surface dark:text-slate-200"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-white/15 px-4 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 dark:text-slate-300 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(editingNote)}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
