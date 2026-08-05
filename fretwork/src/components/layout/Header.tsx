import Link from "next/link";
import { ThemeMode } from "@/types/tab";

interface HeaderProps {
  onLoadDemo: () => void;
  themeMode: ThemeMode;
  onCycleTheme: () => void;
}

export function Header({ onLoadDemo, themeMode, onCycleTheme }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-surface/20 bg-surface/80 px-3 sm:px-6 py-4 backdrop-blur-md dark:bg-surface/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-secondary text-lg font-bold text-white shadow-lg">
            F
          </div>
          <div>
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg sm:text-xl font-bold tracking-tight text-transparent">
              FRETWORK
            </span>
            <span className="ml-2 hidden text-[10px] sm:text-caption font-semibold tracking-widest text-text-custom uppercase md:inline dark:text-text-custom">
              Music Intelligence
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-4">
          <button
            onClick={onLoadDemo}
            className="cursor-pointer rounded-lg border border-surface bg-white/50 px-2.5 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-semibold transition-all hover:bg-surface dark:border-accent-secondary dark:bg-surface dark:hover:bg-accent-secondary/80"
          >
            Load Demo
          </button>

          <button
            onClick={onCycleTheme}
            className="flex cursor-pointer items-center justify-center rounded-lg border border-surface bg-white/50 p-1.5 sm:p-2 transition-all hover:bg-surface dark:border-accent-secondary dark:bg-surface dark:hover:bg-accent-secondary/80"
            aria-label={`Switch theme (currently ${themeMode})`}
            title={`Theme: ${themeMode}`}
          >
            {themeMode === "system" && (
              <svg
                className="h-5 w-5 text-text-custom dark:text-text-custom"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            )}
            {themeMode === "light" && (
              <svg
                className="h-5 w-5 text-amber-600 dark:text-warning"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
            {themeMode === "dark" && (
              <svg
                className="h-5 w-5 text-text-custom dark:text-star1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
