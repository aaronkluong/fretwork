export type ToastTone = "info" | "error" | "success";

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  text: string;
}

export interface TabSegment {
  time_start: number;
  time_end: number;
  suggested_chord?: string;
  suggested_voicing?: string;
  strumming_pattern?: string;
  positions: { [key: string]: number | null };
  pinned_positions?: { [key: string]: boolean };
  fingering?: { [key: string]: number | null };
}

export type UploadMode = "auto" | "jams" | "midi" | "audio";
export type ThemeMode = "system" | "light" | "dark";
