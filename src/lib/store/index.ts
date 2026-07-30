"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { UserState } from "@/lib/types";

/**
 * Estado local (Zustand + localStorage) pro que ainda não é servidor:
 * efêmero de UI (toast/tema). Identidade/perfil (Spec 2), estante/notas/
 * reviews (Spec 3a), feed social/likes/comentários/listas (Spec 3b),
 * clubes/chat (Spec 4) e notificações (fluxo de doação) já vêm da API — ver
 * AuthSync e src/app/(app)/book, /shelf, /home, /clubs, /notifications.
 */
const EMPTY_USER: UserState = {
  loggedIn: false,
  name: "",
  username: "",
  email: "",
  bio: "",
  genres: [],
  followers: 0,
  following: 0,
  top4: [],
  top4Books: [],
  avatar: 0,
  progressUnit: "pages",
  city: null,
  state: null,
};

type Toast = { id: number; message: string };
type Theme = "dark" | "light";

type Store = {
  user: UserState;
  toast: Toast | null;
  theme: Theme;
  /** true depois que o estado persistido em localStorage é aplicado (client-only). */
  hasHydrated: boolean;

  showToast: (message: string) => void;
  clearToast: () => void;
  setTheme: (theme: Theme) => void;

  /** Sincroniza a identidade (nome/username/email) a partir da sessão NextAuth. */
  hydrateFromSession: (session: { name: string; username: string; email: string }) => void;
  /** Aplica dados reais de perfil vindos da API (/api/users/me). Ponto único
   * de escrita pro que já é servidor: identidade, bio, gêneros, avatar,
   * top4, contagem de seguidores. */
  applyProfile: (patch: Partial<UserState>) => void;
  logout: () => void;
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      user: EMPTY_USER,
      toast: null,
      theme: "dark",
      hasHydrated: false,

      showToast: (message) => set({ toast: { id: Date.now(), message } }),
      clearToast: () => set({ toast: null }),
      setTheme: (theme) => set({ theme }),

      hydrateFromSession: ({ name, username, email }) =>
        set((s) => ({
          user: {
            ...s.user,
            loggedIn: true,
            name: name || s.user.name,
            username: username || s.user.username,
            email: email || s.user.email,
          },
        })),

      applyProfile: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),

      logout: () => set({ user: { ...EMPTY_USER, loggedIn: false } }),
    }),
    {
      name: "bookly-v5",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // não persistir estado efêmero
      partialize: (s) => ({
        user: s.user,
        theme: s.theme,
      }),
      skipHydration: true,
    }
  )
);
