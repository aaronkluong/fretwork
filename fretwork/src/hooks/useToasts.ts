import { useState, useRef, useCallback } from "react";
import { ToastMessage, ToastTone } from "@/types/tab";

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((text: string, tone: ToastTone = "info") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, tone, text }]);
    // Auto-dismiss after 5 seconds
    setTimeout(() => dismissToast(id), 5000);
  }, [dismissToast]);

  return { toasts, showToast, dismissToast };
}
