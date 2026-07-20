"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Aplica o tema do store no <html data-theme="…">. */
export function ThemeSync() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}
