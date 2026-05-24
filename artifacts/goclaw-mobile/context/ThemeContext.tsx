import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform, useColorScheme } from "react-native";

export type ThemeMode = "dark" | "light" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedScheme: "dark" | "light";
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "dark",
  resolvedScheme: "dark",
  setMode: () => {},
});

const STORAGE_KEY = "goclaw_theme_mode";

function readStoredMode(): ThemeMode {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "dark" || v === "light" || v === "system") return v;
    }
  } catch {}
  return "dark";
}

function saveMode(mode: ThemeMode) {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() ?? "dark";
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  const resolvedScheme: "dark" | "light" =
    mode === "system" ? systemScheme : mode;

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    saveMode(newMode);
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.classList.toggle("light-theme", newMode === "light" || (newMode === "system" && systemScheme === "light"));
    }
  }, [systemScheme]);

  useEffect(() => {
    if (mode === "system" && Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.classList.toggle("light-theme", systemScheme === "light");
    }
  }, [systemScheme, mode]);

  return (
    <ThemeContext.Provider value={{ mode, resolvedScheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
