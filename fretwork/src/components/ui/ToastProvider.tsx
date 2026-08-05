import { ToastMessage } from "@/types/tab";

interface ToastProviderProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export function ToastProvider({ toasts, onDismiss }: ToastProviderProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`animate-in fade-in slide-in-from-bottom-2 pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur ${
            toast.tone === "error"
              ? "border-red-400/40 bg-red-50/95 text-red-700 dark:border-red-400/30 dark:bg-red-950/80 dark:text-red-200"
              : toast.tone === "success"
                ? "border-success/40 bg-success/10 text-success dark:bg-success/15"
                : "border-surface/50 bg-white/95 text-primary-text dark:border-accent-secondary/50 dark:bg-accent-secondary/90 dark:text-accent-secondary-text"
          }`}
        >
          <span className="flex-1">{toast.text}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="cursor-pointer rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
