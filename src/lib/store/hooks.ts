"use client";

import { useMemo } from "react";
import { BOOKS, getBook } from "@/data/books";
import type { Book, ShelfEntry, ShelfStatus } from "@/lib/types";
import { useUser } from "./user-provider";

export type ShelfBook = { book: Book; entry: ShelfEntry };

/** Livros da estante do usuário, opcionalmente filtrados por status. */
export function useShelf(status?: ShelfStatus): ShelfBook[] {
  const { user } = useUser();
  return useMemo(() => {
    const items: ShelfBook[] = [];
    for (const [bookId, entry] of Object.entries(user.shelf)) {
      if (status && entry.status !== status) continue;
      const book = getBook(bookId);
      if (book) items.push({ book, entry });
    }
    return items;
  }, [user.shelf, status]);
}

/** Dados do livro + estado do usuário sobre ele (estante, nota, review). */
export function useBook(bookId: string) {
  const { user } = useUser();
  return useMemo(
    () => ({
      book: getBook(bookId),
      entry: user.shelf[bookId] as ShelfEntry | undefined,
      rating: user.ratings[bookId] as number | undefined,
      myReview: user.myReviews[bookId] as string | undefined,
    }),
    [bookId, user.shelf, user.ratings, user.myReviews]
  );
}

/** Estatísticas do perfil calculadas do estado real. */
export function useMyStats() {
  const { user } = useUser();
  return useMemo(() => {
    const readCount = Object.values(user.shelf).filter((e) => e.status === "READ").length;
    const reviewCount = Object.keys(user.myReviews).length;
    const ratings = Object.values(user.ratings);
    const avgRating =
      ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null;
    const ratedBooks = Object.entries(user.ratings)
      .map(([bookId, rating]) => ({ book: getBook(bookId), rating }))
      .filter((item): item is { book: Book; rating: number } => item.book !== undefined);
    return { readCount, reviewCount, avgRating, ratedBooks };
  }, [user.shelf, user.ratings, user.myReviews]);
}

/** Livros "em alta": os mais avaliados pela comunidade mocada. */
export function trendingBooks(limit = 5): Book[] {
  return [...BOOKS].sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Melhores avaliados — usados na landing como "Top livros do mês". */
export function topBooks(limit = 4): Book[] {
  return [...BOOKS].sort((a, b) => b.avg - a.avg).slice(0, limit);
}
