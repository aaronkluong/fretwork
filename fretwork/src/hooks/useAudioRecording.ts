import { useState, useRef, useEffect, useCallback } from "react";

interface UseAudioRecordingProps {
  onFileReady: (file: File) => void;
  showToast: (text: string, tone?: "info" | "error" | "success") => void;
}

export function useAudioRecording({ onFileReady, showToast }: UseAudioRecordingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordedChunksRef.current = [];

      const preferredTypes = ["audio/webm", "audio/ogg", "audio/mp4"];
      const mimeType = preferredTypes.find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
        recordingStreamRef.current = null;

        const blobType = mediaRecorderRef.current?.mimeType || "audio/webm";
        const blob = new Blob(recordedChunksRef.current, { type: blobType });
        const ext = blobType.includes("ogg")
          ? "ogg"
          : blobType.includes("mp4")
            ? "m4a"
            : "webm";
        const fileName = `recording-${Date.now()}.${ext}`;
        const file = new File([blob], fileName, { type: blobType });

        onFileReady(file);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      showToast(
        "Microphone access denied. Check browser permissions.",
        "error",
      );
    }
  }, [onFileReady, showToast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const formatRecordingTime = useCallback((totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    isRecording,
    recordingSeconds,
    startRecording,
    stopRecording,
    formatRecordingTime,
  };
}
