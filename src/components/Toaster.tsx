"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

const TOAST_DURATION_MS = 1800;

/** Pílula flutuante acima da tab bar; some sozinha em ~1,8s. */
export function Toaster() {
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);
  const deadlineRef = useRef<number | null>(null);

  useEffect(() => {
    if (!toast) {
      deadlineRef.current = null;
      return;
    }
    deadlineRef.current = Date.now() + TOAST_DURATION_MS;
    const timer = setTimeout(clearToast, TOAST_DURATION_MS);

    // setTimeout fica pausado com a aba em segundo plano (tela bloqueada,
    // troca de app); ao voltar o foco, força o fechamento se o prazo já
    // passou, em vez de esperar o timer "acordar" sozinho.
    function onVisible() {
      if (document.visibilityState === "visible" && deadlineRef.current != null) {
        if (Date.now() >= deadlineRef.current) clearToast();
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="toast-enter fixed bottom-24 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper px-5 py-2.5 text-sm font-bold text-leather shadow-lg shadow-black/40 md:bottom-8"
    >
      {toast.message}
    </div>
  );
}
