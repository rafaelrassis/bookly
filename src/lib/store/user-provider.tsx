"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ShelfStatus, UserState } from "@/lib/types";

/**
 * Estado mocado em memória (Fase A). Na Fase B este provider será trocado
 * por chamadas à API (NextAuth + Postgres) mantendo a mesma interface.
 */
const INITIAL_USER: UserState = {
  loggedIn: false,
  name: "Marina Souza",
  username: "mari.leituras",
  genres: ["Fantasia", "Romance", "Thriller"],
  shelf: {
    "o-nome-do-vento": { status: "READING", currentPage: 408 },
    "torto-arado": { status: "READ" },
    duna: { status: "READ" },
    "1984": { status: "READ" },
    "a-paciente-silenciosa": { status: "READ" },
  },
  ratings: {
    "torto-arado": 5,
    duna: 4,
    "1984": 4.5,
    "a-paciente-silenciosa": 3.5,
  },
  myReviews: {},
};

type UserActions = {
  completeOnboarding: (name: string, username: string, genres: string[]) => void;
  logout: () => void;
  /** status null remove o livro da estante. */
  setShelfStatus: (bookId: string, status: ShelfStatus | null) => void;
  /** rating 0 remove a avaliação. Avaliar marca como Lido automaticamente. */
  setRating: (bookId: string, rating: number) => { markedAsRead: boolean };
  saveReview: (bookId: string, text: string) => void;
};

type UserContextValue = { user: UserState } & UserActions;

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserState>(INITIAL_USER);
  // Espelho síncrono do estado: os updaters do React não rodam na hora,
  // então retornos derivados (ex.: markedAsRead) leem daqui.
  const userRef = useRef(user);
  userRef.current = user;

  const completeOnboarding = useCallback(
    (name: string, username: string, genres: string[]) => {
      setUser((u) => ({ ...u, loggedIn: true, name, username, genres }));
    },
    []
  );

  const logout = useCallback(() => {
    setUser((u) => ({ ...u, loggedIn: false }));
  }, []);

  const setShelfStatus = useCallback(
    (bookId: string, status: ShelfStatus | null) => {
      setUser((u) => {
        const shelf = { ...u.shelf };
        if (status === null) {
          delete shelf[bookId];
        } else {
          const currentPage = shelf[bookId]?.currentPage;
          shelf[bookId] =
            status === "READING" ? { status, currentPage: currentPage ?? 0 } : { status };
        }
        return { ...u, shelf };
      });
    },
    []
  );

  const setRating = useCallback((bookId: string, rating: number) => {
    const markedAsRead =
      rating > 0 && userRef.current.shelf[bookId]?.status !== "READ";
    setUser((u) => {
      const ratings = { ...u.ratings };
      if (rating <= 0) {
        delete ratings[bookId];
        return { ...u, ratings };
      }
      ratings[bookId] = rating;
      const shelf = { ...u.shelf };
      if (shelf[bookId]?.status !== "READ") {
        shelf[bookId] = { status: "READ" };
      }
      return { ...u, ratings, shelf };
    });
    return { markedAsRead };
  }, []);

  const saveReview = useCallback((bookId: string, text: string) => {
    setUser((u) => ({ ...u, myReviews: { ...u.myReviews, [bookId]: text } }));
  }, []);

  const value = useMemo(
    () => ({ user, completeOnboarding, logout, setShelfStatus, setRating, saveReview }),
    [user, completeOnboarding, logout, setShelfStatus, setRating, saveReview]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser deve ser usado dentro de <UserProvider>");
  return ctx;
}
