"use client";

import * as React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import useMediaQuery from "@mui/material/useMediaQuery";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";

export type ColorMode = "light" | "dark" | "system";

interface ColorModeContextValue {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
}

export const ColorModeContext = React.createContext<ColorModeContextValue>({
  mode: "system",
  setMode: () => {},
});

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] = React.useState<ColorMode>("system");
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");

  // Load persisted preference on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("colorMode") as ColorMode | null;
    if (saved && ["light", "dark", "system"].includes(saved)) {
      setModeState(saved);
    }
  }, []);

  const setMode = React.useCallback((newMode: ColorMode) => {
    setModeState(newMode);
    localStorage.setItem("colorMode", newMode);
  }, []);

  const resolvedMode =
    mode === "system" ? (prefersDark ? "dark" : "light") : mode;

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: resolvedMode,
          primary: {
            main: "#1a237e",
          },
          secondary: {
            main: "#ff6f00",
          },
          background: {
            default: resolvedMode === "dark" ? "#121212" : "#f5f5f5",
            paper: resolvedMode === "dark" ? "#1e1e1e" : "#ffffff",
          },
          text: {
            primary: resolvedMode === "dark" ? "#f0f0f0" : "#0d0d0d",
            secondary: resolvedMode === "dark" ? "#b0b0b0" : "#444444",
          },
        },
        typography: {
          fontFamily: "var(--font-geist-sans), Arial, sans-serif",
        },
      }),
    [resolvedMode],
  );

  return (
    <AppRouterCacheProvider options={{ key: "mui", enableCssLayer: true }}>
      <ColorModeContext.Provider value={{ mode, setMode }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
