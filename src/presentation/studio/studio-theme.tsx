"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type StudioTheme = "dark" | "light";

export const STUDIO_THEME_STORAGE_KEY = "scro:studio-theme";
export const DEFAULT_STUDIO_THEME: StudioTheme = "dark";

export function isStudioTheme(value: unknown): value is StudioTheme {
  return value === "dark" || value === "light";
}

export function resolveStudioTheme(stored: string | null | undefined): StudioTheme {
  if (isStudioTheme(stored)) return stored;
  return DEFAULT_STUDIO_THEME;
}

export function readStoredStudioTheme(): StudioTheme {
  if (typeof window === "undefined") return DEFAULT_STUDIO_THEME;
  try {
    return resolveStudioTheme(window.localStorage.getItem(STUDIO_THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_STUDIO_THEME;
  }
}

export function writeStoredStudioTheme(theme: StudioTheme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STUDIO_THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage quota errors
  }
}

type StudioThemeContextValue = {
  theme: StudioTheme;
  setTheme: (theme: StudioTheme) => void;
  toggleTheme: () => void;
};

const StudioThemeContext = createContext<StudioThemeContextValue | null>(null);

export function StudioThemeProvider({
  children,
  initialTheme = DEFAULT_STUDIO_THEME,
}: {
  children: ReactNode;
  initialTheme?: StudioTheme;
}) {
  const [theme, setThemeState] = useState<StudioTheme>(initialTheme);

  useEffect(() => {
    const stored = readStoredStudioTheme();
    if (stored !== theme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState(stored);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-studio-theme", theme);
    }
  }, [theme]);

  const setTheme = useCallback((next: StudioTheme) => {
    setThemeState(next);
    writeStoredStudioTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: StudioTheme = current === "dark" ? "light" : "dark";
      writeStoredStudioTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <StudioThemeContext.Provider value={value}>
      {children}
    </StudioThemeContext.Provider>
  );
}

export function useStudioTheme() {
  const ctx = useContext(StudioThemeContext);
  if (!ctx) {
    return {
      theme: DEFAULT_STUDIO_THEME,
      setTheme: writeStoredStudioTheme,
      toggleTheme: () => {},
    };
  }
  return ctx;
}
