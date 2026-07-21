"use client";

import { useEffect, useMemo, useState } from "react";
import { BOOKS, getBook } from "@/data/books";
import type { ApiReview, Book, FeedReview, ShelfEntry, ShelfStatus } from "@/lib/types";
import { useStore } from "./index";

/** Resolve uma review própria mocada ("me-<bookId>"), única fonte que ainda
 * vive no store local (a estante/notas/reviews próprias são Spec 3a, fora
 * do escopo desta fatia — feed e reviews da comunidade já são reais). */
export function useMyMockReview(id: string): FeedReview | undefined {
  return useStore((s) => (id.startsWith("me-") ? s.feed.find((r) => r.id === id) : undefined));
}

export type FeedScope = "all" | "following" | "liked";

/** Feed real (Spec 3b), paginado por cursor. "following" cai pro "all" no
 * servidor quando o usuário não segue ninguém (fellBackToAll avisa a UI). */
export function useFeed(scope: FeedScope) {
  const [items, setItems] = useState<ApiReview[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [fellBackToAll, setFellBackToAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/feed?scope=${scope}`)
      .then((res) => (res.ok ? res.json() : { items: [], nextCursor: null, fellBackToAll: false }))
      .then((data) => {
        if (cancelled) return;
        setItems(data.items ?? []);
        setNextCursor(data.nextCursor ?? null);
        setFellBackToAll(Boolean(data.fellBackToAll));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [scope]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/feed?scope=${scope}&cursor=${nextCursor}`);
      if (res.ok) {
        const data = await res.json();
        setItems((current) => [...current, ...(data.items ?? [])]);
        setNextCursor(data.nextCursor ?? null);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  return { items, loading, loadingMore, hasMore: nextCursor !== null, loadMore, fellBackToAll };
}

export type ShelfBook = { book: Book; entry: ShelfEntry };

/** Livros da estante, opcionalmente filtrados por status. */
export function useShelf(status?: ShelfStatus): ShelfBook[] {
  const shelf = useStore((s) => s.user.shelf);
  return useMemo(() => {
    const items: ShelfBook[] = [];
    for (const [bookId, entry] of Object.entries(shelf)) {
      if (status && entry.status !== status) continue;
      const book = getBook(bookId);
      if (book) items.push({ book, entry });
    }
    return items;
  }, [shelf, status]);
}

/** Dados do livro + estado do usuário sobre ele. */
export function useBook(bookId: string) {
  const shelf = useStore((s) => s.user.shelf);
  const ratings = useStore((s) => s.user.ratings);
  const myReviews = useStore((s) => s.user.myReviews);
  const bookTags = useStore((s) => s.user.bookTags);
  const quotes = useStore((s) => s.user.quotes);
  return useMemo(
    () => ({
      book: getBook(bookId),
      entry: shelf[bookId] as ShelfEntry | undefined,
      rating: ratings[bookId] as number | undefined,
      myReview: myReviews[bookId] as string | undefined,
      tags: bookTags[bookId] ?? [],
      bookQuotes: quotes[bookId] ?? [],
    }),
    [bookId, shelf, ratings, myReviews, bookTags, quotes]
  );
}

/** Estatísticas do perfil derivadas do estado real. */
export function useMyStats() {
  const shelf = useStore((s) => s.user.shelf);
  const ratings = useStore((s) => s.user.ratings);
  const ratingOrder = useStore((s) => s.user.ratingOrder);
  const myReviews = useStore((s) => s.user.myReviews);

  return useMemo(() => {
    const readIds = Object.entries(shelf)
      .filter(([, e]) => e.status === "READ")
      .map(([id]) => id);
    const readCount = readIds.length;

    // páginas: soma dos lidos + página atual das leituras em andamento
    let pagesRead = 0;
    for (const id of readIds) pagesRead += getBook(id)?.pages ?? 0;
    for (const entry of Object.values(shelf)) {
      if (entry.status === "READING") pagesRead += entry.currentPage ?? 0;
    }

    const reviewCount = Object.keys(myReviews).length;
    const values = Object.values(ratings);
    const avgRating = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

    // histograma: contagem por nota de 0,5 a 5
    const buckets = Array.from({ length: 10 }, (_, i) => (i + 1) / 2);
    const histogram = buckets.map((value) => ({
      value,
      count: values.filter((r) => r === value).length,
    }));
    const maxCount = Math.max(...histogram.map((h) => h.count));

    const ratedBooks = ratingOrder
      .map((id) => ({ book: getBook(id), rating: ratings[id] }))
      .filter(
        (item): item is { book: Book; rating: number } =>
          item.book !== undefined && item.rating !== undefined
      );

    return { readCount, pagesRead, reviewCount, avgRating, histogram, maxCount, ratedBooks };
  }, [shelf, ratings, ratingOrder, myReviews]);
}

/** Recomendações: livros dos gêneros do usuário fora da estante (fallback: primeiros 4). */
export function useRecommendations(limit = 4): Book[] {
  const genres = useStore((s) => s.user.genres);
  const shelf = useStore((s) => s.user.shelf);
  return useMemo(() => {
    const picks = BOOKS.filter((b) => genres.includes(b.genre) && !shelf[b.id]);
    const result = picks.length > 0 ? picks : BOOKS.filter((b) => !shelf[b.id]);
    return (result.length > 0 ? result : BOOKS).slice(0, limit);
  }, [genres, shelf, limit]);
}

/** Livros "em alta": os mais avaliados pela comunidade mocada. */
export function trendingBooks(limit = 5): Book[] {
  return [...BOOKS].sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Melhores avaliados — "Top livros do mês" da landing. */
export function topBooks(limit = 4): Book[] {
  return [...BOOKS].sort((a, b) => b.avg - a.avg).slice(0, limit);
}
