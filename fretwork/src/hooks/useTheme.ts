import { useState, useEffect, useCallback } from "react";
import { ThemeMode } from "@/types/tab";

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      const isDark =
        themeMode === "dark" || (themeMode === "system" && prefersDark);
      
      root.classList.toggle("dark", isDark);
      root.classList.toggle("light", themeMode === "light");
    };
    
    applyTheme();

    if (themeMode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }
  }, [themeMode]);

  const cycleTheme = useCallback(() => {
    setThemeMode((prev) => {
      if (prev === "system") return "light";
      if (prev === "light") return "dark";
      return "system";
    });
  }, []);

  return { themeMode, setThemeMode, cycleTheme };
}
