"use client";

import Link from "next/link";
import { useState } from "react";
import { BookCover } from "@/components/BookCover";
import { DiscoverReaders } from "@/components/DiscoverReaders";
import { FeedPost } from "@/components/FeedPost";
import { Logo } from "@/components/Logo";
import { SectionTitle } from "@/components/SectionTitle";
import { readingPercent } from "@/lib/format";
import { useShelf, trendingBooks } from "@/lib/store/hooks";
import { useStore } from "@/lib/store";
import type { ShelfBook } from "@/lib/store/hooks";

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
function ReadingCard({ item }: { item: ShelfBook }) {
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
      <BookCover book={book} width={64} />
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
  const reading = useShelf("READING");
  const feed = useStore((s) => s.feed);
  const followedUsers = useStore((s) => s.followedUsers);
  const [feedFilter, setFeedFilter] = useState<"all" | "following">("all");

  const visibleFeed =
    feedFilter === "following" ? feed.filter((r) => followedUsers.includes(r.user)) : feed;

  return (
    <div className="pt-5">
      <header>
        <Logo />
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
            {reading.map((item) => (
              <ReadingCard key={item.book.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-7">
        <SectionTitle>Em alta esta semana</SectionTitle>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5">
          {trendingBooks(5).map((book) => (
            <Link key={book.id} href={`/book/${book.id}`} aria-label={book.title} className="rounded-md">
              <BookCover book={book} width={96} />
            </Link>
          ))}
        </div>
      </section>

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
          {visibleFeed.map((review) => (
            <FeedPost key={review.id} review={review} />
          ))}
        </div>
      </section>

      <DiscoverReaders />
    </div>
  );
}
