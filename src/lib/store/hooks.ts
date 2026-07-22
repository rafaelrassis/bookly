"use client";

import { useEffect, useMemo, useState } from "react";
import { BOOKS } from "@/data/books";
import type { ApiReview, ApiUserReview, Book } from "@/lib/types";
import { useStore } from "./index";

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
        };
        setReadCount(s.readCount);
        setPagesRead(s.pagesRead);
        setReviewCount(s.reviewCount);
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

  return { readCount, pagesRead, reviewCount, avgRating, histogram, maxCount, ratedBooks, reviewEntries };
}

/** Recomendações: livros dos gêneros do usuário fora da estante (fallback: primeiros 4). */
export function useRecommendations(limit = 4): Book[] {
  const genres = useStore((s) => s.user.genres);
  const [shelfIds, setShelfIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/shelf")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setShelfIds(data.items.map((i: { book: { id: string } }) => i.book.id)));
  }, []);

  return useMemo(() => {
    const picks = BOOKS.filter((b) => genres.includes(b.genre) && !shelfIds.includes(b.id));
    const result = picks.length > 0 ? picks : BOOKS.filter((b) => !shelfIds.includes(b.id));
    return (result.length > 0 ? result : BOOKS).slice(0, limit);
  }, [genres, shelfIds, limit]);
}

/** Livros "em alta": os mais avaliados pela comunidade mocada. */
export function trendingBooks(limit = 5): Book[] {
  return [...BOOKS].sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Melhores avaliados — "Top livros do mês" da landing. */
export function topBooks(limit = 4): Book[] {
  return [...BOOKS].sort((a, b) => b.avg - a.avg).slice(0, limit);
}
