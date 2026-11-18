"use client";

import { useEffect } from "react";
import { useDhvani } from "@/lib/store";
import { THEME_BY_ID, themeVars } from "@/lib/themes";
import { hydrateStore } from "@/lib/store";

export function ThemeProvider() {
  const theme = useDhvani((s) => s.theme);

  // Persisted state is read after mount so the server and the first client
  // render agree. A flash of the default paper is a fair price for not
  // hydration-erroring the whole tree.
  useEffect(() => {
    hydrateStore();
  }, []);

  useEffect(() => {
    const t = THEME_BY_ID[theme];
    if (!t) return;
    const root = document.documentElement;
    for (const [k, v] of Object.entries(themeVars(t))) root.style.setProperty(k, v);
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = t.dark ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", t.colors.paper);
  }, [theme]);

  return null;
}
