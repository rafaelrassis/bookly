"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { DiscoverReaders } from "@/components/DiscoverReaders";
import { EmptyState } from "@/components/EmptyState";
import { FeedPost } from "@/components/FeedPost";
import { BookOpenIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { SectionTitle } from "@/components/SectionTitle";
import { Skeleton } from "@/components/Skeleton";
import { Spinner } from "@/components/Spinner";
import { readingPercent } from "@/lib/format";
import { useFeed, useTrendingBooks } from "@/lib/store/hooks";
import { useStore } from "@/lib/store";
import type { Book, ShelfEntry } from "@/lib/types";

type ReadingItem = { book: Book; entry: ShelfEntry };

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 16v-5a6 6 0 1 0-12 0v5l-1.8 2.8A1 1 0 0 0 5 20.5h14a1 1 0 0 0 .8-1.7L18 16Z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

/** Card de leitura atual — link para o livro; progresso é atualizado lá. */
function ReadingCard({ item, priority = false }: { item: ReadingItem; priority?: boolean }) {
  const { book, entry } = item;
  const currentPage = entry.currentPage ?? 0;
  const lastPage = entry.lastPage ?? currentPage;
  const delta = currentPage - lastPage;
  const percent = readingPercent(currentPage, book.pages);

  return (
    <Link
      href={`/book/${book.id}`}
      className="relative flex gap-4 overflow-hidden rounded-2xl border border-line bg-card p-4 transition-colors hover:bg-card2"
    >
      {/* Fita marcadora — assinatura visual do bookly */}
      <span
        aria-hidden="true"
        className="absolute right-6 top-0 h-16 w-6 bg-ribbon"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 10px), 0 100%)" }}
      />
      <BookCover book={book} width={64} priority={priority} />
      <div className="min-w-0 flex-1 self-center pr-8">
        <h3 className="truncate font-display text-base font-bold">{book.title}</h3>
        <p className="truncate text-sm text-paperDim">{book.authors}</p>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-card2"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso de leitura"
        >
          <div className="h-full rounded-full bg-ribbon" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-paperDim">
          {percent}% · pág. {currentPage} de {book.pages}
        </p>
        {delta > 0 && (
          <p className="mt-0.5 text-xs font-bold text-foil">
            +{delta} pág. desde a última leitura
          </p>
        )}
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [reading, setReading] = useState<ReadingItem[]>([]);
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length);
  const [feedFilter, setFeedFilter] = useState<"all" | "following">("all");
  const {
    items: feed,
    loading: feedLoading,
    hasMore,
    loadingMore,
    loadMore,
    fellBackToAll,
    error: feedError,
    retry: retryFeed,
  } = useFeed(feedFilter);
  const trending = useTrendingBooks(5);

  useEffect(() => {
    fetch("/api/shelf?status=READING")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setReading(data.items);
      });
  }, []);

  return (
    <div className="pt-5">
      <header className="flex items-center justify-between">
        <Logo />
        <Link
          href="/notifications"
          aria-label={unread > 0 ? `Notificações, ${unread} não lidas` : "Notificações"}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-paperDim transition-colors hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foil focus-visible:ring-offset-2 focus-visible:ring-offset-leather"
        >
          <BellIcon />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ribbon px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Link>
      </header>

      <Link
        href="/search"
        className="mt-5 flex items-center gap-2.5 rounded-xl border border-line bg-card px-4 py-3 text-paperDim transition-colors hover:bg-card2"
      >
        <SearchIcon />
        Buscar livros ou autores…
      </Link>

      {reading.length > 0 && (
        <section className="mt-6" aria-label="Leituras atuais">
          <SectionTitle>
            {reading.length === 1 ? "Leitura atual" : "Leituras atuais"}
          </SectionTitle>
          <div className="mt-3 flex flex-col gap-3">
            {reading.map((item, i) => (
              <ReadingCard key={item.book.id} item={item} priority={i === 0} />
            ))}
          </div>
        </section>
      )}

      {trending.length > 0 && (
        <section className="mt-7">
          <SectionTitle>Em alta esta semana</SectionTitle>
          <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5">
            {trending.map((book) => (
              <Link key={book.id} href={`/book/${book.id}`} aria-label={book.title} className="rounded-md">
                <BookCover book={book} width={96} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <SectionTitle>Reviews</SectionTitle>
          <div
            className="flex rounded-full border border-line bg-card p-0.5 text-xs font-bold"
            role="tablist"
            aria-label="Filtro do feed"
          >
            {(
              [
                { key: "all", label: "Geral" },
                { key: "following", label: "Seguindo" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={feedFilter === key}
                onClick={() => setFeedFilter(key)}
                className={`rounded-full px-3.5 py-1.5 transition-colors ${
                  feedFilter === key ? "bg-foil text-leather" : "text-paperDim hover:text-paper"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-1">
          {feedFilter === "following" && fellBackToAll && (
            <p className="py-3 text-xs text-paperDim">
              Você ainda não segue ninguém — mostrando o feed geral.
            </p>
          )}
          {feedError ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-paperDim">Não foi possível carregar o feed. Tente de novo.</p>
              <button
                type="button"
                onClick={retryFeed}
                className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-bold text-paper hover:border-foil/50"
              >
                Tentar de novo
              </button>
            </div>
          ) : feedLoading ? (
            <div className="flex flex-col gap-4 py-4" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3 border-b border-line pb-4">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            feed.length === 0 && (
              <EmptyState
                icon={<BookOpenIcon />}
                title="Nenhuma review por aqui ainda"
                description={
                  feedFilter === "following"
                    ? "Siga outros leitores pra ver as reviews deles aqui."
                    : "Seja a primeira pessoa a avaliar um livro."
                }
                action={{ label: "Avaliar um livro", href: "/search" }}
              >
                <Link
                  href="#discover-readers"
                  className="mt-2 text-sm font-bold text-paperDim underline decoration-dotted hover:text-paper"
                >
                  Encontrar leitores
                </Link>
              </EmptyState>
            )
          )}
          {feed.map((review) => (
            <FeedPost key={review.id} review={review} />
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-2 flex w-full items-center justify-center rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-bold text-paperDim transition-colors hover:text-paper disabled:opacity-50"
            >
              {loadingMore ? <Spinner size={16} className="text-paperDim" /> : "Carregar mais"}
            </button>
          )}
        </div>
      </section>

      <DiscoverReaders />
    </div>
  );
}
