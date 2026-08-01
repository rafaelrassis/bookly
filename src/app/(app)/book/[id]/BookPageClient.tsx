"use client";

import { notFound } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BackHeader } from "@/components/BackHeader";
import { TagEditor } from "@/components/TagEditor";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { Section } from "@/components/ui/Section";
import { BookHeader } from "./sections/BookHeader";
import { CommunityReviewsSection, type CommunityReview } from "./sections/CommunityReviewsSection";
import { DonationSection } from "./sections/DonationSection";
import { ProgressSection } from "./sections/ProgressSection";
import { QuotesSection } from "./sections/QuotesSection";
import { RatingReviewSection } from "./sections/RatingReviewSection";
import { RecommendationsSection } from "./sections/RecommendationsSection";
import { StatusSection } from "./sections/StatusSection";
import BookLoading from "./loading";
import { formatDecimal } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Book, ShelfEntry, ShelfStatus } from "@/lib/types";
import { apiErrorMessage } from "@/lib/apiError";

type BookQuote = { id: string; text: string; page?: number };

type BookPayload = {
  book: Book;
  entry: ShelfEntry | null;
  rating: number | null;
  myReviewTitle: string | null;
  myReview: string | null;
  tags: string[];
  quotes: BookQuote[];
  readingHistory: string[];
};

const STATUS_TOAST: Record<ShelfStatus, string> = {
  WANT_TO_READ: "Adicionado a Quero ler",
  READING: "Marcado como Lendo 📖",
  READ: "Marcado como Lido 🎉",
  DNF: "Marcado como Abandonei",
};

export function BookPageClient({ params }: { params: { id: string } }) {
  const username = useStore((s) => s.user.username);
  const myState = useStore((s) => s.user.state);
  const myCity = useStore((s) => s.user.city);
  const showToast = useStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [errorFlag, setErrorFlag] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [book, setBook] = useState<Book | null>(null);
  const [entry, setEntry] = useState<ShelfEntry | null>(null);
  const [rating, setRatingState] = useState<number | null>(null);
  const [myReviewTitle, setMyReviewTitle] = useState<string | null>(null);
  const [myReview, setMyReview] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<BookQuote[]>([]);
  const [readingHistory, setReadingHistory] = useState<string[]>([]);
  const [rereading, setRereading] = useState(false);

  const [communityReviews, setCommunityReviews] = useState<CommunityReview[]>([]);
  const [reviewsCursor, setReviewsCursor] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Book[]>([]);

  const bookId = params.id;

  const loadReviews = useCallback(
    async (cursor?: string) => {
      const url = cursor
        ? `/api/books/${bookId}/reviews?cursor=${encodeURIComponent(cursor)}`
        : `/api/books/${bookId}/reviews`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setCommunityReviews((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setReviewsCursor(data.nextCursor);
    },
    [bookId]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorFlag(false);
    fetch(`/api/books/${bookId}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setNotFoundFlag(true);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setErrorFlag(true);
          setLoading(false);
          return;
        }
        const data: BookPayload = await res.json();
        setBook(data.book);
        setEntry(data.entry);
        setRatingState(data.rating);
        setMyReviewTitle(data.myReviewTitle);
        setMyReview(data.myReview);
        setTags(data.tags);
        setQuotes(data.quotes);
        setReadingHistory(data.readingHistory);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setErrorFlag(true);
        setLoading(false);
      });
    loadReviews();
    return () => {
      cancelled = true;
    };
  }, [bookId, loadReviews, retryCount]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/books/${bookId}/recommendations`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setRecommendations(data.recommendations);
      });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  if (notFoundFlag) notFound();

  if (errorFlag) {
    return (
      <div className="pt-4">
        <BackHeader />
        <ErrorRetry
          className="mt-10"
          message="Não foi possível carregar o livro. Tente de novo."
          onRetry={() => setRetryCount((n) => n + 1)}
        />
      </div>
    );
  }

  if (loading || !book) return <BookLoading />;

  async function handleStatusTap(status: ShelfStatus) {
    const next = entry?.status === status ? null : status;
    const wasRead = entry?.status === "READ";
    const res = await fetch(`/api/books/${bookId}/shelf`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      showToast(await apiErrorMessage(res, "Não foi possível atualizar a estante"));
      return;
    }
    const data = await res.json();
    setEntry(data.entry);
    if (next === "READ" && !wasRead && data.entry?.finishedAt) {
      setReadingHistory((prev) => [...prev, data.entry.finishedAt]);
    }
    showToast(next === null ? "Removido da estante" : STATUS_TOAST[next]);
  }

  async function handleProgress(page: number) {
    const wasRead = entry?.status === "READ";
    const res = await fetch(`/api/books/${bookId}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setEntry((prev) => ({
      status: data.status,
      currentPage: page,
      lastPage: prev?.currentPage ?? 0,
      startedAt: prev?.startedAt ?? new Date().toISOString(),
      finishedAt: data.finishedAt,
    }));
    if (data.status === "READ" && !wasRead && data.finishedAt) {
      setReadingHistory((prev) => [...prev, data.finishedAt]);
    }
    return { delta: data.delta as number, finished: data.status === "READ" };
  }

  async function handleReread() {
    if (rereading) return;
    setRereading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/reread`, { method: "POST" });
      if (!res.ok) {
        showToast(await apiErrorMessage(res, "Não foi possível iniciar a releitura"));
        return;
      }
      const data = await res.json();
      setEntry(data.entry);
      showToast("Releitura iniciada 📖");
    } finally {
      setRereading(false);
    }
  }

  async function handleRating(value: number) {
    const res = await fetch(`/api/books/${bookId}/review`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: value, title: myReviewTitle ?? undefined, text: myReview ?? "" }),
    });
    if (!res.ok) {
      showToast(await apiErrorMessage(res, "Não foi possível salvar a avaliação"));
      return;
    }
    const data = await res.json();
    const markedAsRead = value > 0 && entry?.status !== "READ";
    setRatingState(data.rating);
    setMyReviewTitle(data.myReviewTitle);
    setMyReview(data.myReview);
    setEntry(data.entry);
    if (markedAsRead && data.entry?.finishedAt) {
      setReadingHistory((prev) => [...prev, data.entry.finishedAt]);
    }
    if (value === 0) showToast("Avaliação removida");
    else if (markedAsRead) showToast("Marcado como Lido 🎉");
    else showToast(`Avaliação salva: ${formatDecimal(value)} ★`);
  }

  async function publishReview(title: string, text: string) {
    if (!text || !title) return false;
    if (!rating || rating <= 0) {
      showToast("Dê uma nota antes de publicar a review");
      return false;
    }
    const res = await fetch(`/api/books/${bookId}/review`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, title, text }),
    });
    if (!res.ok) {
      showToast(await apiErrorMessage(res, "Não foi possível publicar a review"));
      return false;
    }
    const data = await res.json();
    setMyReviewTitle(data.myReviewTitle);
    setMyReview(data.myReview);
    setEntry(data.entry);
    showToast("Review publicada!");
    return true;
  }

  async function saveQuote(text: string, page?: number) {
    const res = await fetch(`/api/books/${bookId}/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, page }),
    });
    if (!res.ok) {
      showToast(await apiErrorMessage(res, "Não foi possível salvar a citação"));
      return false;
    }
    const quote = await res.json();
    setQuotes((prev) => [...prev, quote]);
    showToast("Citação salva ✦");
    return true;
  }

  async function removeQuote(id: string) {
    const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    showToast("Citação removida");
  }

  return (
    <div className="pt-4">
      <BackHeader className="lg:hidden" />

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-10 lg:pt-6">
        <div className="lg:sticky lg:top-20">
          <BookHeader book={book} />
          <div className="hidden lg:block">
            <StatusSection
              entry={entry}
              readingHistory={readingHistory}
              rereading={rereading}
              onStatusTap={handleStatusTap}
              onReread={handleReread}
            />
          </div>
        </div>

        <div>
          <div className="lg:hidden">
            <StatusSection
              entry={entry}
              readingHistory={readingHistory}
              rereading={rereading}
              onStatusTap={handleStatusTap}
              onReread={handleReread}
            />
          </div>

          {entry?.status === "READING" && book.pages > 0 && (
            <ProgressSection book={book} entry={entry} onProgress={handleProgress} />
          )}

          <RatingReviewSection
            rating={rating}
            myReviewTitle={myReviewTitle}
            myReview={myReview}
            onRate={handleRating}
            onPublish={publishReview}
          />

          <Section title="Suas tags">
            <TagEditor bookId={bookId} tags={tags} onChanged={setTags} onToast={showToast} />
          </Section>

          <QuotesSection quotes={quotes} onAdd={saveQuote} onRemove={removeQuote} />

          <Section title="Sinopse">
            <p className="text-sm leading-relaxed text-paperMuted">{book.synopsis}</p>
          </Section>

          <DonationSection bookId={bookId} myState={myState} myCity={myCity} showToast={showToast} />

          <CommunityReviewsSection
            username={username}
            rating={rating}
            myReviewTitle={myReviewTitle}
            myReview={myReview}
            entry={entry}
            reviews={communityReviews}
            cursor={reviewsCursor}
            onLoadMore={loadReviews}
          />

          <RecommendationsSection recommendations={recommendations} />
        </div>
      </div>
    </div>
  );
}
