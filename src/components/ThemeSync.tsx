"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Reidrata o estado persistido (uma vez, no cliente) e aplica o tema no
 * <html data-theme="…"> — o efeito de tema roda de novo após a reidratação
 * atualizar `theme`, evitando flash ou divergência servidor/cliente. */
export function ThemeSync() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => {
      useStore.setState({ hasHydrated: true });
    });
    useStore.persist.rehydrate();
    return unsub;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
