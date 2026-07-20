"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

const TOAST_DURATION_MS = 1800;

/** Pílula flutuante acima da tab bar; some sozinha em ~1,8s. */
export function Toaster() {
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="toast-enter fixed bottom-24 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper px-5 py-2.5 text-sm font-bold text-leather shadow-lg shadow-black/40"
    >
      {toast.message}
    </div>
  );
}
