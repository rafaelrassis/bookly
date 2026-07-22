"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SEED_NOTIFICATIONS } from "@/data/notifications";
import type { Notification, UserState } from "@/lib/types";

/**
 * Estado local (Zustand + localStorage) pro que ainda não é servidor:
 * notificações (mock) e efêmero de UI (toast/tema). Identidade/perfil
 * (Spec 2), estante/notas/reviews (Spec 3a), feed social/likes/comentários/
 * listas (Spec 3b) e clubes/chat (Spec 4) já vêm da API — ver AuthSync e
 * src/app/(app)/book, /shelf, /home, /clubs.
 */
const INITIAL_USER: UserState = {
  loggedIn: false,
  name: "Marina Souza",
  username: "mari.leituras",
  email: "mari.leituras@gmail.com",
  bio: "Um capítulo por noite antes de dormir. Fantasia, thrillers e o que a estante mandar 💛",
  genres: ["Fantasia", "Romance", "Thriller"],
  followers: 0,
  following: 0,
  top4: [],
  avatar: 0,
  progressUnit: "pages",
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
  /** Aplica dados reais de perfil vindos da API (/api/users/me), por cima do
   * mock local. Ponto único de escrita pro que já é servidor: identidade,
   * bio, gêneros, avatar, top4, contagem de seguidores. */
  applyProfile: (patch: Partial<UserState>) => void;
  logout: () => void;
  updatePhone: (phone: string) => void;

  notifications: Notification[];
  markNotificationsRead: () => void;
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      user: INITIAL_USER,
      toast: null,
      theme: "dark",
      notifications: [...SEED_NOTIFICATIONS],
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

      logout: () =>
        set({
          user: { ...INITIAL_USER, loggedIn: false },
          notifications: [...SEED_NOTIFICATIONS],
        }),

      updatePhone: (phone) => set((s) => ({ user: { ...s.user, phone } })),

      markNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    }),
    {
      name: "bookly-v5",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // não persistir estado efêmero
      partialize: (s) => ({
        user: s.user,
        notifications: s.notifications,
        theme: s.theme,
      }),
      skipHydration: true,
    }
  )
);
