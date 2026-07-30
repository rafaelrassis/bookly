"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Notification, UserState } from "@/lib/types";

/**
 * Estado local (Zustand + localStorage) pro que ainda não é servidor:
 * notificações (sem model no Prisma, ficam só no store) e efêmero de UI
 * (toast/tema). Identidade/perfil (Spec 2), estante/notas/reviews (Spec 3a),
 * feed social/likes/comentários/listas (Spec 3b) e clubes/chat (Spec 4) já
 * vêm da API — ver AuthSync e src/app/(app)/book, /shelf, /home, /clubs.
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

  notifications: Notification[];
  clearedAt: string | null;
  readAt: string | null;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      user: EMPTY_USER,
      toast: null,
      theme: "dark",
      notifications: [],
      clearedAt: null,
      readAt: null,
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
          user: { ...EMPTY_USER, loggedIn: false },
          notifications: [],
          clearedAt: null,
          readAt: null,
        }),

      markNotificationsRead: () => set({ readAt: new Date().toISOString() }),

      clearNotifications: () => set({ clearedAt: new Date().toISOString() }),
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
        clearedAt: s.clearedAt,
        readAt: s.readAt,
      }),
      skipHydration: true,
    }
  )
);

/** Deriva a lista visível e o `read` de cada notificação a partir dos marcos
 * `clearedAt`/`readAt`, em vez de mutar o array bruto. Fonte única da verdade
 * pra badge do sino e pra página de notificações. */
export function useNotifications() {
  const notifications = useStore((s) => s.notifications);
  const clearedAt = useStore((s) => s.clearedAt);
  const readAt = useStore((s) => s.readAt);

  return useMemo(() => {
    const base = clearedAt
      ? notifications.filter((n) => n.time > clearedAt)
      : notifications;
    return base.map((n) => ({
      ...n,
      read: readAt ? n.time <= readAt : false,
    }));
  }, [notifications, clearedAt, readAt]);
}
