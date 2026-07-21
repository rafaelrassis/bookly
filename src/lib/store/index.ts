"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CLUBS } from "@/data/clubs";
import { FEED_REVIEWS } from "@/data/feed";
import { SEED_NOTIFICATIONS } from "@/data/notifications";
import { FOLLOWED_USERS } from "@/data/users";
import { withAt } from "@/lib/handle";
import { nowTime } from "@/lib/format";
import type { Club, FeedReview, Notification, UserState, Visibility } from "@/lib/types";

/**
 * Estado local (Zustand + localStorage) pro que ainda não é servidor: feed
 * social, clubes e listas (Spec 3b/4). Identidade/perfil (Spec 2) e
 * estante/notas/reviews da página do livro (Spec 3a) já vêm da API —
 * ver AuthSync e src/app/(app)/book, /shelf.
 */
const INITIAL_USER: UserState = {
  loggedIn: false,
  name: "Marina Souza",
  username: "mari.leituras",
  email: "mari.leituras@gmail.com",
  bio: "Um capítulo por noite antes de dormir. Fantasia, thrillers e o que a estante mandar 💛",
  genres: ["Fantasia", "Romance", "Thriller"],
  followers: 128,
  following: 87,
  top4: ["torto-arado", "duna", "1984", "ensaio-sobre-a-cegueira"],
  avatar: 0,
  progressUnit: "pages",
  shelf: {
    "o-nome-do-vento": {
      status: "READING",
      currentPage: 408,
      lastPage: 374,
      startedAt: "2026-07-12",
    },
    verity: { status: "READING", currentPage: 120, lastPage: 96, startedAt: "2026-07-15" },
    "torto-arado": { status: "READ", startedAt: "2026-05-02", finishedAt: "2026-05-19" },
    duna: { status: "READ", startedAt: "2026-03-01", finishedAt: "2026-04-06" },
    "1984": { status: "READ", startedAt: "2026-06-04", finishedAt: "2026-06-18" },
    "ensaio-sobre-a-cegueira": {
      status: "READ",
      startedAt: "2026-02-10",
      finishedAt: "2026-02-27",
    },
    "a-paciente-silenciosa": {
      status: "READ",
      startedAt: "2026-01-05",
      finishedAt: "2026-01-11",
    },
  },
  ratings: {
    "torto-arado": 5,
    "1984": 4.5,
    duna: 4.5,
    "ensaio-sobre-a-cegueira": 4,
    "a-paciente-silenciosa": 3.5,
    verity: 3.5,
  },
  ratingOrder: [
    "verity",
    "a-paciente-silenciosa",
    "1984",
    "duna",
    "ensaio-sobre-a-cegueira",
    "torto-arado",
  ],
  myReviews: {
    "torto-arado":
      "Terminei de madrugada com o coração apertado. A força das irmãs carrega o livro inteiro — e a última parte muda tudo o que você leu antes.",
    "1984": "Sufocante no melhor sentido. Cada releitura fica mais atual, e isso é o que assusta.",
  },
  myReviewTitles: {},
  likedReviews: { fr1: true, fr3: true },
  lists: [
    {
      id: "fantasia-que-me-formou",
      name: "Fantasia que me formou",
      visibility: "public",
      bookIds: ["o-nome-do-vento", "duna", "1984"],
    },
    {
      id: "presentes-em-potencial",
      name: "Presentes em potencial",
      visibility: "private",
      bookIds: ["torto-arado", "verity"],
    },
  ],
};

type Toast = { id: number; message: string };
type Theme = "dark" | "light";

function randomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "item"
  );
}

type Store = {
  user: UserState;
  feed: FeedReview[];
  clubs: Club[];
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

  toggleLike: (reviewId: string) => void;
  addComment: (reviewId: string, text: string) => void;

  followedUsers: string[];
  toggleFollow: (user: string) => boolean;

  notifications: Notification[];
  markNotificationsRead: () => void;

  toggleClub: (clubId: string) => { joined: boolean };
  createClub: (
    name: string,
    bookId: string,
    desc: string,
    visibility: Visibility
  ) => { id: string; code?: string };
  /** Retorna o id do clube ao entrar; "already" se já participa; null se inválido. */
  joinClubByCode: (code: string) => string | "already" | null;
  postToClub: (clubId: string, text: string, replyTo?: { user: string; text: string }) => void;
  /** Só o criador do clube deve poder chamar (checagem fica na UI). */
  updateClub: (clubId: string, name: string, bookId: string, desc: string) => void;
  removeClubMember: (clubId: string, member: string) => void;

  createList: (name: string, visibility: Visibility) => string;
  toggleListVisibility: (listId: string) => void;
  addBooksToList: (listId: string, bookIds: string[]) => void;
  removeBookFromList: (listId: string, bookId: string) => void;
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
    user: INITIAL_USER,
    feed: FEED_REVIEWS,
    clubs: CLUBS,
    toast: null,
    theme: "dark",
    followedUsers: [...FOLLOWED_USERS],
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
        followedUsers: [...FOLLOWED_USERS],
        notifications: [...SEED_NOTIFICATIONS],
      }),

    updatePhone: (phone) => set((s) => ({ user: { ...s.user, phone } })),

    toggleLike: (reviewId) =>
      set((s) => {
        const liked = !s.user.likedReviews[reviewId];
        const likedReviews = { ...s.user.likedReviews };
        if (liked) likedReviews[reviewId] = true;
        else delete likedReviews[reviewId];
        return {
          user: { ...s.user, likedReviews },
          feed: s.feed.map((r) =>
            r.id === reviewId ? { ...r, likes: r.likes + (liked ? 1 : -1) } : r
          ),
        };
      }),

    addComment: (reviewId, text) =>
      set((s) => ({
        feed: s.feed.map((r) =>
          r.id === reviewId
            ? { ...r, comments: [...r.comments, { user: withAt(s.user.username), text }] }
            : r
        ),
      })),

    toggleFollow: (user) => {
      const following = !get().followedUsers.includes(user);
      set((s) => ({
        followedUsers: following
          ? [...s.followedUsers, user]
          : s.followedUsers.filter((u) => u !== user),
      }));
      return following;
    },

    markNotificationsRead: () =>
      set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

    toggleClub: (clubId) => {
      const joined = !get().clubs.find((c) => c.id === clubId)?.joined;
      set((s) => ({
        clubs: s.clubs.map((c) =>
          c.id === clubId ? { ...c, joined, members: c.members + (joined ? 1 : -1) } : c
        ),
      }));
      return { joined };
    },

    createClub: (name, bookId, desc, visibility) => {
      const id = `${slugify(name)}-${Date.now().toString(36)}`;
      const code = visibility === "private" ? randomCode() : undefined;
      const creator = withAt(get().user.username);
      const club: Club = {
        id,
        name,
        bookId,
        desc,
        visibility,
        code,
        members: 1,
        joined: true,
        feed: [],
        memberProgress: {},
        creator,
      };
      set((s) => ({ clubs: [...s.clubs, club] }));
      return { id, code };
    },

    joinClubByCode: (code) => {
      const normalized = code.trim().toUpperCase();
      const club = get().clubs.find((c) => c.code === normalized);
      if (!club) return null;
      if (club.joined) return "already";
      set((s) => ({
        clubs: s.clubs.map((c) =>
          c.id === club.id ? { ...c, joined: true, members: c.members + 1 } : c
        ),
      }));
      return club.id;
    },

    postToClub: (clubId, text, replyTo) =>
      set((s) => ({
        clubs: s.clubs.map((c) =>
          c.id === clubId
            ? {
                ...c,
                feed: [
                  ...c.feed,
                  {
                    id: `msg-${Date.now()}`,
                    user: withAt(s.user.username),
                    text,
                    time: nowTime(),
                    replyTo,
                  },
                ],
              }
            : c
        ),
      })),

    updateClub: (clubId, name, bookId, desc) =>
      set((s) => ({
        clubs: s.clubs.map((c) => (c.id === clubId ? { ...c, name, bookId, desc } : c)),
      })),

    removeClubMember: (clubId, member) =>
      set((s) => ({
        clubs: s.clubs.map((c) => {
          if (c.id !== clubId) return c;
          const memberProgress = { ...c.memberProgress };
          delete memberProgress[member];
          return { ...c, memberProgress, members: Math.max(0, c.members - 1) };
        }),
      })),

    createList: (name, visibility) => {
      const id = `${slugify(name)}-${Date.now().toString(36)}`;
      set((s) => ({
        user: { ...s.user, lists: [...s.user.lists, { id, name, visibility, bookIds: [] }] },
      }));
      return id;
    },

    toggleListVisibility: (listId) =>
      set((s) => ({
        user: {
          ...s.user,
          lists: s.user.lists.map((l) =>
            l.id === listId
              ? { ...l, visibility: l.visibility === "public" ? "private" : "public" }
              : l
          ),
        },
      })),

    addBooksToList: (listId, bookIds) =>
      set((s) => ({
        user: {
          ...s.user,
          lists: s.user.lists.map((l) =>
            l.id === listId
              ? { ...l, bookIds: [...l.bookIds, ...bookIds.filter((id) => !l.bookIds.includes(id))] }
              : l
          ),
        },
      })),

    removeBookFromList: (listId, bookId) =>
      set((s) => ({
        user: {
          ...s.user,
          lists: s.user.lists.map((l) =>
            l.id === listId ? { ...l, bookIds: l.bookIds.filter((id) => id !== bookId) } : l
          ),
        },
      })),
  }),
  {
    name: "bookly-v5",
    version: 1,
    storage: createJSONStorage(() => localStorage),
    // não persistir estado efêmero
    partialize: (s) => ({
      user: s.user,
      feed: s.feed,
      clubs: s.clubs,
      followedUsers: s.followedUsers,
      notifications: s.notifications,
      theme: s.theme,
    }),
    skipHydration: true,
  }
  )
);
