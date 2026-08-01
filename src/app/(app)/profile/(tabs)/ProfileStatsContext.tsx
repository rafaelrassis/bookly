"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useMyStats } from "@/lib/store/hooks";

type Stats = ReturnType<typeof useMyStats>;

const StatsContext = createContext<Stats | null>(null);

/** Busca as estatísticas do perfil uma única vez e compartilha entre o
 * cabeçalho (selos) e a aba Estatísticas — evita refetch duplicado, já que
 * layout e página ficam montados ao mesmo tempo. */
export function ProfileStatsProvider({ children }: { children: ReactNode }) {
  const stats = useMyStats();
  return <StatsContext.Provider value={stats}>{children}</StatsContext.Provider>;
}

export function useProfileStats(): Stats {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error("useProfileStats precisa estar dentro de ProfileStatsProvider");
  return ctx;
}
