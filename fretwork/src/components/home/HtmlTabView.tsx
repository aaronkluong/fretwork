import { TabSegment } from "@/types/tab";
import { FretboardDiagram } from "./FretboardDiagram";

interface HtmlTabViewProps {
  segments: TabSegment[];
  audioUrl: string | null;
  currentPlaybackTime: number;
  detectedKey?: string;
  onSeek: (seconds: number) => void;
  onNoteClick: (segmentIdx: number, stringKey: string, fretVal: number | null) => void;
}

export function HtmlTabView({
  segments,
  audioUrl,
  currentPlaybackTime,
  onSeek,
  onNoteClick,
}: HtmlTabViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {segments.map((segment, idx) => {
        const isActive =
          audioUrl != null &&
          currentPlaybackTime >= segment.time_start &&
          currentPlaybackTime < segment.time_end;
        return (
          <div
            key={idx}
            onClick={() => audioUrl && onSeek(segment.time_start)}
            className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-4 shadow-md transition-all hover:scale-[1.02] dark:bg-accent-secondary/70 ${
              audioUrl ? "cursor-pointer" : ""
            } ${
              isActive
                ? "scale-[1.02] border-primary bg-primary/10 shadow-lg ring-2 ring-primary/40 dark:bg-primary/20"
                : "border-surface/30 bg-white/70 hover:border-primary/30"
            }`}
          >
            <div
              className={`absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-primary to-secondary ${isActive ? "h-1" : ""}`}
            />

            <div className="flex items-center justify-between">
              <span className="text-lg font-bold tracking-tight text-secondary dark:text-text-custom">
                {segment.suggested_chord}
              </span>
              <span className="rounded-full border border-surface/40 bg-white/80 px-2 py-0.5 font-mono font-semibold text-caption dark:bg-black/40">
                {segment.time_start.toFixed(1)}s - {segment.time_end.toFixed(1)}s
              </span>
            </div>

            <div className="flex w-full items-center justify-center overflow-hidden rounded-xl border border-surface/40 bg-white/90 px-2 py-3 dark:bg-black/35">
              <FretboardDiagram 
                positions={segment.positions} 
                pinnedPositions={segment.pinned_positions}
                onNoteClick={(stringKey, fretVal) => onNoteClick(idx, stringKey, fretVal)}
              />
            </div>

            <div className="flex flex-col gap-1 border-t border-surface/20 pt-3 text-caption font-semibold">
              <div className="flex justify-between">
                <span className="font-semibold opacity-70">Strumming Pattern:</span>
                <span className="font-mono font-semibold text-primary">
                  {segment.strumming_pattern}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold opacity-70">Voicing Code:</span>
                <span className="max-w-[100px] truncate font-mono text-caption font-semibold opacity-90">
                  {segment.suggested_voicing}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
