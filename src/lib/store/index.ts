"use client";

import { create } from "zustand";
import { CLUBS } from "@/data/clubs";
import { FEED_REVIEWS } from "@/data/feed";
import type { Club, FeedReview, ShelfStatus, UserState } from "@/lib/types";

/**
 * Estado mocado em memória (protótipo v2). Todo acesso a dados passa por
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
  shelf: {
    "o-nome-do-vento": { status: "READING", currentPage: 408, lastPage: 374 },
    "torto-arado": { status: "READ" },
    duna: { status: "READ" },
    "1984": { status: "READ" },
    "ensaio-sobre-a-cegueira": { status: "READ" },
    "a-paciente-silenciosa": { status: "READ" },
    verity: { status: "READ" },
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
};

type Toast = { id: number; message: string };

type Store = {
  user: UserState;
  feed: FeedReview[];
  clubs: Club[];
  toast: Toast | null;

  showToast: (message: string) => void;
  clearToast: () => void;

  completeOnboarding: (name: string, username: string, bio: string, genres: string[]) => void;
  logout: () => void;

  /** status null remove o livro da estante. */
  setShelfStatus: (bookId: string, status: ShelfStatus | null) => void;
  /** rating 0 remove a nota. Avaliar marca como Lido automaticamente. */
  setRating: (bookId: string, rating: number) => { markedAsRead: boolean };
  saveReview: (bookId: string, text: string) => void;
  /** Salva a página atual; a anterior vira lastPage. Retorna o delta. */
  updateProgress: (bookId: string, page: number) => { delta: number };

  toggleLike: (reviewId: string) => void;
  addComment: (reviewId: string, text: string) => void;

  addTag: (bookId: string, tag: string) => void;
  removeTag: (bookId: string, tag: string) => void;
  addQuote: (bookId: string, text: string, page?: number) => void;

  toggleClub: (clubId: string) => { joined: boolean };
  postToClub: (clubId: string, text: string) => void;
};

export const useStore = create<Store>()((set, get) => ({
  user: INITIAL_USER,
  feed: FEED_REVIEWS,
  clubs: CLUBS,
  toast: null,

  showToast: (message) => set({ toast: { id: Date.now(), message } }),
  clearToast: () => set({ toast: null }),

  completeOnboarding: (name, username, bio, genres) =>
    set((s) => ({ user: { ...s.user, loggedIn: true, name, username, bio, genres } })),

  logout: () => set((s) => ({ user: { ...s.user, loggedIn: false } })),

  setShelfStatus: (bookId, status) =>
    set((s) => {
      const shelf = { ...s.user.shelf };
      if (status === null) {
        delete shelf[bookId];
      } else if (status === "READING") {
        shelf[bookId] = {
          status,
          currentPage: shelf[bookId]?.currentPage ?? 0,
          lastPage: shelf[bookId]?.lastPage ?? 0,
        };
      } else {
        shelf[bookId] = { status };
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
      if (shelf[bookId]?.status !== "READ") shelf[bookId] = { status: "READ" };
      return { user: { ...s.user, ratings, ratingOrder, shelf } };
    });
    return { markedAsRead };
  },

  saveReview: (bookId, text) =>
    set((s) => ({ user: { ...s.user, myReviews: { ...s.user.myReviews, [bookId]: text } } })),

  updateProgress: (bookId, page) => {
    const entry = get().user.shelf[bookId];
    const previous = entry?.currentPage ?? 0;
    set((s) => ({
      user: {
        ...s.user,
        shelf: {
          ...s.user.shelf,
          [bookId]: { ...s.user.shelf[bookId], status: "READING", currentPage: page, lastPage: previous },
        },
      },
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

  postToClub: (clubId, text) =>
    set((s) => ({
      clubs: s.clubs.map((c) =>
        c.id === clubId
          ? { ...c, feed: [...c.feed, { user: `@${s.user.username}`, text }] }
          : c
      ),
    })),
}));
