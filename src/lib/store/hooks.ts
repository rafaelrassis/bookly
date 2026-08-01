"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiFeedEvent, ApiReview, ApiUserReview, Book } from "@/lib/types";
import { useStore } from "./index";

export type FeedScope = "all" | "following";

/** Pagina uma URL do feed (/api/feed) por cursor — usado por useFeed
 * (eventos) e useLikedReviews (reviews curtidas), que só diferem no scope e
 * no tipo do item. */
function usePaginatedFeed<T>(url: string) {
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [emptyReason, setEmptyReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (cancelled) return;
        setItems(data.items ?? []);
        setNextCursor(data.nextCursor ?? null);
        setEmptyReason(data.emptyReason ?? null);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, retryCount]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`${url}&cursor=${nextCursor}`);
      if (res.ok) {
        const data = await res.json();
        setItems((current) => [...current, ...(data.items ?? [])]);
        setNextCursor(data.nextCursor ?? null);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  function retry() {
    setRetryCount((n) => n + 1);
  }

  return { items, loading, loadingMore, hasMore: nextCursor !== null, loadMore, emptyReason, error, retry };
}

/** Feed unificado (stream), paginado por cursor. "following" retorna lista
 * vazia (com emptyReason: "no_follows") quando o usuário não segue ninguém —
 * sem cair pro "all". */
export function useFeed(scope: FeedScope) {
  return usePaginatedFeed<ApiFeedEvent>(`/api/feed?scope=${scope}`);
}

/** Reviews curtidas pelo usuário (aba "Curtidas" do perfil) — continua lendo
 * direto de Review, fora do feed unificado (curtida é por review). */
export function useLikedReviews() {
  return usePaginatedFeed<ApiReview>("/api/feed?scope=liked");
}

type HistogramBar = { value: number; count: number };
type RatedBook = { book: Book; rating: number };
type ReviewEntry = { book: Book; title?: string; text: string };

/** Estatísticas do perfil (Spec 3b): agregados de `/api/users/me` (real,
 * via ShelfEntry/Review) + a lista de reviews próprias pra popular as abas
 * "Últimas avaliações"/"Reviews" da página de perfil. */
export function useMyStats() {
  const username = useStore((s) => s.user.username);
  const [readCount, setReadCount] = useState(0);
  const [pagesRead, setPagesRead] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [donatedCount, setDonatedCount] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [histogram, setHistogram] = useState<HistogramBar[]>([]);
  const [ratedBooks, setRatedBooks] = useState<RatedBook[]>([]);
  const [reviewEntries, setReviewEntries] = useState<ReviewEntry[]>([]);

  useEffect(() => {
    if (!username) return;
    fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((profile) => {
        if (!profile?.stats) return;
        const s = profile.stats as {
          readCount: number;
          pagesRead: number;
          reviewCount: number;
          avgRating: number;
          histogram: Record<string, number>;
          donatedCount: number;
          confirmedCount: number;
          receivedCount: number;
        };
        setReadCount(s.readCount);
        setPagesRead(s.pagesRead);
        setReviewCount(s.reviewCount);
        setDonatedCount(s.donatedCount);
        setConfirmedCount(s.confirmedCount);
        setReceivedCount(s.receivedCount);
        setAvgRating(s.reviewCount > 0 || Object.values(s.histogram).some((c) => c > 0) ? s.avgRating : null);
        setHistogram(
          Object.entries(s.histogram)
            .map(([value, count]) => ({ value: Number(value), count }))
            .sort((a, b) => a.value - b.value)
        );
      });
    fetch(`/api/users/${username}/reviews`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: ApiUserReview[] }) => {
        const items = data.items ?? [];
        setRatedBooks(items.map((r) => ({ book: r.book, rating: r.rating })));
        setReviewEntries(
          items
            .filter((r) => r.text !== "")
            .map((r) => ({ book: r.book, title: r.title, text: r.text }))
        );
      });
  }, [username]);

  const maxCount = Math.max(0, ...histogram.map((h) => h.count));

  return {
    readCount,
    pagesRead,
    reviewCount,
    donatedCount,
    confirmedCount,
    receivedCount,
    avgRating,
    histogram,
    maxCount,
    ratedBooks,
    reviewEntries,
  };
}

/** Recomendações: livros dos gêneros do usuário fora da estante (fallback: primeiros N do catálogo). */
export function useRecommendations(limit = 4): Book[] {
  const genres = useStore((s) => s.user.genres);
  const [shelfIds, setShelfIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Book[]>([]);

  useEffect(() => {
    fetch("/api/shelf")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setShelfIds(data.items.map((i: { book: { id: string } }) => i.book.id)));
  }, []);

  useEffect(() => {
    fetch("/api/books?limit=50")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setCatalog(data.items));
  }, []);

  return useMemo(() => {
    const picks = catalog.filter((b) => genres.includes(b.genre) && !shelfIds.includes(b.id));
    const result = picks.length > 0 ? picks : catalog.filter((b) => !shelfIds.includes(b.id));
    return (result.length > 0 ? result : catalog).slice(0, limit);
  }, [catalog, genres, shelfIds, limit]);
}

/** Busca livros por id em lote (favoritos/top4), preservando a ordem pedida. */
export function useBooksByIds(ids: string[]): Book[] {
  const [books, setBooks] = useState<Book[]>([]);
  const key = ids.join(",");

  useEffect(() => {
    if (!key) {
      setBooks([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/books?ids=${encodeURIComponent(key)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setBooks(data.items);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return books;
}

/** Livros "em alta": os mais avaliados (contagem real de reviews, vinda do banco). */
export function useTrendingBooks(limit = 5): Book[] {
  return useBooksBySort("trending", limit);
}

/** Melhores avaliados — "Top livros do mês" da landing (avg real, vindo do banco). */
export function useTopBooks(limit = 4): Book[] {
  return useBooksBySort("top", limit);
}

function useBooksBySort(sort: "trending" | "top", limit: number): Book[] {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/books?sort=${sort}&limit=${limit}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setBooks(data.items);
      });
    return () => {
      cancelled = true;
    };
  }, [sort, limit]);

  return books;
}
