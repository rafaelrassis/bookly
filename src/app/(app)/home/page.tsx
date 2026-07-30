"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { DiscoverReaders } from "@/components/DiscoverReaders";
import { EmptyState } from "@/components/EmptyState";
import { FeedEventCard } from "@/components/FeedEventCard";
import { BookOpenIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { SectionTitle } from "@/components/SectionTitle";
import { SeguindoEmptyState } from "@/components/SeguindoEmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Spinner } from "@/components/Spinner";
import { readingPercent } from "@/lib/format";
import { useFeed, useTrendingBooks } from "@/lib/store/hooks";
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
  const [feedFilter, setFeedFilter] = useState<"all" | "following">("all");
  const {
    items: feed,
    loading: feedLoading,
    hasMore,
    loadingMore,
    loadMore,
    emptyReason,
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
        <NotificationBell className="-mr-2" />
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
          <SectionTitle>Atividade</SectionTitle>
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
            feed.length === 0 &&
            (feedFilter === "following" && emptyReason === "no_follows" ? (
              <SeguindoEmptyState onGoGeneral={() => setFeedFilter("all")} />
            ) : (
              <EmptyState
                icon={<BookOpenIcon />}
                title="Nenhuma atividade por aqui ainda"
                description={
                  feedFilter === "following"
                    ? "Ninguém que você segue teve atividade ainda."
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
            ))
          )}
          {feed.map((event) => (
            <FeedEventCard key={event.id} event={event} />
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
