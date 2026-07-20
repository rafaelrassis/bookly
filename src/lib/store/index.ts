"use client";

import { create } from "zustand";
import { getBook } from "@/data/books";
import { CLUBS } from "@/data/clubs";
import { FEED_REVIEWS } from "@/data/feed";
import { nowTime, readingPercent, todayISO } from "@/lib/format";
import type {
  Club,
  FeedReview,
  ProgressUnit,
  ShelfEntry,
  ShelfStatus,
  UserState,
  Visibility,
} from "@/lib/types";

/**
 * Estado mocado em memória (protótipo v3). Todo acesso a dados passa por
 * este store e pelos hooks em ./hooks — na fase futura a troca por
 * NextAuth + Postgres + Google Books API fica localizada aqui.
 */
const INITIAL_USER: UserState = {
  loggedIn: false,
  name: "Marina Souza",
  username: "mari.leituras",
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
  likedReviews: { fr1: true, fr3: true },
  bookTags: {
    "torto-arado": ["favoritos do ano", "brasil"],
    verity: ["emprestado"],
  },
  quotes: {
    "1984": [{ text: "Guerra é paz. Liberdade é escravidão. Ignorância é força.", page: 29 }],
  },
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

  showToast: (message: string) => void;
  clearToast: () => void;
  setTheme: (theme: Theme) => void;

  completeOnboarding: (name: string, username: string, bio: string, genres: string[]) => void;
  logout: () => void;
  updateProfile: (username: string, avatar: number, bio: string, top4: string[]) => void;

  /** status null remove o livro da estante. Datas: startedAt na primeira vez
   * em Lendo (ou Lido direto); finishedAt ao marcar Lido. */
  setShelfStatus: (bookId: string, status: ShelfStatus | null) => void;
  /** rating 0 remove a nota. Avaliar marca como Lido automaticamente. */
  setRating: (bookId: string, rating: number) => { markedAsRead: boolean };
  saveReview: (bookId: string, text: string) => void;
  setProgressUnit: (unit: ProgressUnit) => void;
  /** Salva a página atual (sempre em páginas); a anterior vira lastPage.
   * Publica mensagem de sistema nos clubes do livro. Retorna o delta. */
  updateProgress: (bookId: string, page: number) => { delta: number };

  toggleLike: (reviewId: string) => void;
  addComment: (reviewId: string, text: string) => void;

  addTag: (bookId: string, tag: string) => void;
  removeTag: (bookId: string, tag: string) => void;
  addQuote: (bookId: string, text: string, page?: number) => void;

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

  createList: (name: string, visibility: Visibility) => string;
  toggleListVisibility: (listId: string) => void;
  addBooksToList: (listId: string, bookIds: string[]) => void;
  removeBookFromList: (listId: string, bookId: string) => void;
};

export const useStore = create<Store>()((set, get) => ({
  user: INITIAL_USER,
  feed: FEED_REVIEWS,
  clubs: CLUBS,
  toast: null,
  theme: "dark",

  showToast: (message) => set({ toast: { id: Date.now(), message } }),
  clearToast: () => set({ toast: null }),
  setTheme: (theme) => set({ theme }),

  completeOnboarding: (name, username, bio, genres) =>
    set((s) => ({ user: { ...s.user, loggedIn: true, name, username, bio, genres } })),

  logout: () => set((s) => ({ user: { ...s.user, loggedIn: false } })),

  updateProfile: (username, avatar, bio, top4) =>
    set((s) => ({ user: { ...s.user, username, avatar, bio, top4 } })),

  setShelfStatus: (bookId, status) =>
    set((s) => {
      const shelf = { ...s.user.shelf };
      if (status === null) {
        delete shelf[bookId];
      } else {
        const prev = shelf[bookId];
        const today = todayISO();
        if (status === "READING") {
          shelf[bookId] = {
            status,
            currentPage: prev?.currentPage ?? 0,
            lastPage: prev?.lastPage ?? 0,
            startedAt: prev?.startedAt ?? today,
          };
        } else if (status === "READ") {
          shelf[bookId] = {
            status,
            startedAt: prev?.startedAt ?? today,
            finishedAt: today,
          };
        } else {
          shelf[bookId] = { status };
        }
      }
      return { user: { ...s.user, shelf } };
    }),

  setRating: (bookId, rating) => {
    const markedAsRead = rating > 0 && get().user.shelf[bookId]?.status !== "READ";
    set((s) => {
      const ratings = { ...s.user.ratings };
      const ratingOrder = s.user.ratingOrder.filter((id) => id !== bookId);
      if (rating <= 0) {
        delete ratings[bookId];
        return { user: { ...s.user, ratings, ratingOrder } };
      }
      ratings[bookId] = rating;
      ratingOrder.unshift(bookId);
      const shelf = { ...s.user.shelf };
      const prev = shelf[bookId];
      if (prev?.status !== "READ") {
        const today = todayISO();
        shelf[bookId] = {
          status: "READ",
          startedAt: prev?.startedAt ?? today,
          finishedAt: today,
        };
      }
      return { user: { ...s.user, ratings, ratingOrder, shelf } };
    });
    return { markedAsRead };
  },

  saveReview: (bookId, text) =>
    set((s) => ({ user: { ...s.user, myReviews: { ...s.user.myReviews, [bookId]: text } } })),

  setProgressUnit: (unit) => set((s) => ({ user: { ...s.user, progressUnit: unit } })),

  updateProgress: (bookId, page) => {
    const state = get();
    const entry: ShelfEntry | undefined = state.user.shelf[bookId];
    const previous = entry?.currentPage ?? 0;
    const book = getBook(bookId);
    const percent = book ? readingPercent(page, book.pages) : 0;
    const username = state.user.username;
    set((s) => ({
      user: {
        ...s.user,
        shelf: {
          ...s.user.shelf,
          [bookId]: {
            ...s.user.shelf[bookId],
            status: "READING",
            currentPage: page,
            lastPage: previous,
            startedAt: s.user.shelf[bookId]?.startedAt ?? todayISO(),
          },
        },
      },
      // notificação de leitura nos murais dos clubes que leem este livro
      clubs: s.clubs.map((c) =>
        c.joined && c.bookId === bookId && book
          ? {
              ...c,
              feed: [
                ...c.feed,
                {
                  id: `sys-${Date.now()}-${c.id}`,
                  user: `@${username}`,
                  text: `📖 @${username} avançou para ${percent}% de ${book.title}`,
                  time: nowTime(),
                  system: true,
                },
              ],
            }
          : c
      ),
    }));
    return { delta: page - previous };
  },

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
          ? { ...r, comments: [...r.comments, { user: `@${s.user.username}`, text }] }
          : r
      ),
    })),

  addTag: (bookId, tag) =>
    set((s) => {
      const current = s.user.bookTags[bookId] ?? [];
      if (current.includes(tag)) return s;
      return {
        user: { ...s.user, bookTags: { ...s.user.bookTags, [bookId]: [...current, tag] } },
      };
    }),

  removeTag: (bookId, tag) =>
    set((s) => {
      const remaining = (s.user.bookTags[bookId] ?? []).filter((t) => t !== tag);
      const bookTags = { ...s.user.bookTags };
      if (remaining.length > 0) bookTags[bookId] = remaining;
      else delete bookTags[bookId];
      return { user: { ...s.user, bookTags } };
    }),

  addQuote: (bookId, text, page) =>
    set((s) => ({
      user: {
        ...s.user,
        quotes: {
          ...s.user.quotes,
          [bookId]: [...(s.user.quotes[bookId] ?? []), { text, page }],
        },
      },
    })),

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
                  user: `@${s.user.username}`,
                  text,
                  time: nowTime(),
                  replyTo,
                },
              ],
            }
          : c
      ),
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
}));
