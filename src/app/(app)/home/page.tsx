"use client";

import Link from "next/link";
import { BOOKS } from "@/data/books";
import { BookCover } from "@/components/BookCover";
import { Logo } from "@/components/Logo";
import { Stars } from "@/components/Stars";
import { readingPercent } from "@/lib/format";
import { useShelf, useUser } from "@/lib/store";
import { trendingBooks } from "@/lib/store/hooks";

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

export default function HomePage() {
  const { user } = useUser();
  const reading = useShelf("READING");
  const current = reading[0];

  const recentReviews = BOOKS.filter((b) => b.reviews.length > 0)
    .slice(0, 5)
    .map((book) => ({ book, review: book.reviews[0] }));

  return (
    <div className="px-5 pt-5">
      <header className="flex items-center justify-between">
        <Logo />
        <Link
          href="/profile"
          aria-label="Abrir perfil"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card2 font-display font-bold text-foil"
        >
          {user.name.charAt(0).toUpperCase()}
        </Link>
      </header>

      <Link
        href="/search"
        className="mt-5 flex items-center gap-2.5 rounded-xl border border-line bg-card px-4 py-3 text-paperDim transition-colors hover:bg-card2"
      >
        <SearchIcon />
        Buscar livros ou autores…
      </Link>

      {current && (
        <section className="mt-6" aria-label="Leitura atual">
          <h2 className="font-display text-lg font-bold">Continuar lendo</h2>
          <Link
            href={`/book/${current.book.id}`}
            className="relative mt-3 flex gap-4 overflow-hidden rounded-2xl border border-line bg-card p-4 transition-colors hover:bg-card2"
          >
            {/* Fita marcadora — assinatura visual do bookly */}
            <span
              aria-hidden="true"
              className="absolute right-6 top-0 h-16 w-6 bg-ribbon"
              style={{
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 10px), 0 100%)",
              }}
            />
            <BookCover book={current.book} width={64} />
            <div className="min-w-0 flex-1 self-center pr-8">
              <h3 className="truncate font-display text-base font-bold">
                {current.book.title}
              </h3>
              <p className="truncate text-sm text-paperDim">{current.book.authors}</p>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-card2"
                role="progressbar"
                aria-valuenow={readingPercent(current.entry.currentPage ?? 0, current.book.pages)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso de leitura"
              >
                <div
                  className="h-full rounded-full bg-ribbon"
                  style={{
                    width: `${readingPercent(current.entry.currentPage ?? 0, current.book.pages)}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-paperDim">
                {readingPercent(current.entry.currentPage ?? 0, current.book.pages)}% · pág.{" "}
                {current.entry.currentPage ?? 0} de {current.book.pages}
              </p>
            </div>
          </Link>
        </section>
      )}

      <section className="mt-7">
        <h2 className="font-display text-lg font-bold">Em alta esta semana</h2>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5">
          {trendingBooks(5).map((book) => (
            <Link
              key={book.id}
              href={`/book/${book.id}`}
              aria-label={book.title}
              className="rounded-md"
            >
              <BookCover book={book} width={96} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-lg font-bold">Reviews recentes</h2>
        <div className="mt-3 flex flex-col gap-3">
          {recentReviews.map(({ book, review }) => (
            <article
              key={book.id}
              className="flex gap-3.5 rounded-2xl border border-line bg-card p-3.5"
            >
              <Link
                href={`/book/${book.id}`}
                aria-label={book.title}
                className="self-start rounded-md"
              >
                <BookCover book={book} width={48} />
              </Link>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold">{book.title}</h3>
                <p className="text-xs text-paperDim">
                  {review.user} · <Stars rating={review.rating} className="text-xs" />
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm text-paperDim">{review.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
