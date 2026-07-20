"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { Stars } from "@/components/Stars";
import { useShelf } from "@/lib/store/hooks";
import { useStore } from "@/lib/store";
import type { ShelfStatus } from "@/lib/types";

/** Busca case-insensitive; acentos também são ignorados. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const STATUS_FILTERS: { key: ShelfStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Todos" },
  { key: "READING", label: "Lendo" },
  { key: "WANT_TO_READ", label: "Quero ler" },
  { key: "READ", label: "Lido" },
];

const STATUS_BADGE: Record<ShelfStatus, { label: string; className: string }> = {
  READING: { label: "Lendo", className: "bg-ribbon/20 text-ribbon" },
  WANT_TO_READ: { label: "Quero ler", className: "bg-card2 text-paperDim" },
  READ: { label: "Lido", className: "bg-foil/15 text-foil" },
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
        active ? "bg-foil text-leather" : "border border-line bg-card text-paperDim hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}

export default function ShelfPage() {
  const shelf = useShelf();
  const ratings = useStore((s) => s.user.ratings);
  const bookTags = useStore((s) => s.user.bookTags);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ShelfStatus | "ALL">("ALL");
  const [genre, setGenre] = useState<string>("ALL");
  const [tag, setTag] = useState<string>("ALL");

  const genres = useMemo(
    () => Array.from(new Set(shelf.map(({ book }) => book.genre))).sort(),
    [shelf]
  );
  const allTags = useMemo(
    () => Array.from(new Set(Object.values(bookTags).flat())).sort(),
    [bookTags]
  );

  const q = normalize(query.trim());
  const filtered = shelf.filter(({ book, entry }) => {
    if (q && !normalize(book.title).includes(q) && !normalize(book.authors).includes(q))
      return false;
    if (status !== "ALL" && entry.status !== status) return false;
    if (genre !== "ALL" && book.genre !== genre) return false;
    if (tag !== "ALL" && !(bookTags[book.id] ?? []).includes(tag)) return false;
    return true;
  });

  return (
    <div className="px-5 pt-5">
      <h1 className="text-2xl font-extrabold">Estante</h1>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar na estante…"
        aria-label="Buscar na estante por título ou autor"
        className="mt-4 w-full rounded-xl border border-line bg-card px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
      />

      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5" aria-label="Filtrar por status">
        {STATUS_FILTERS.map(({ key, label }) => (
          <Chip key={key} active={status === key} onClick={() => setStatus(key)}>
            {label}
          </Chip>
        ))}
      </div>

      <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5" aria-label="Filtrar por gênero">
        <Chip active={genre === "ALL"} onClick={() => setGenre("ALL")}>
          Todos
        </Chip>
        {genres.map((g) => (
          <Chip key={g} active={genre === g} onClick={() => setGenre(g)}>
            {g}
          </Chip>
        ))}
      </div>

      {allTags.length > 0 && (
        <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5" aria-label="Filtrar por tag">
          <Chip active={tag === "ALL"} onClick={() => setTag("ALL")}>
            Todas
          </Chip>
          {allTags.map((t) => (
            <Chip key={t} active={tag === t} onClick={() => setTag(t)}>
              {t}
            </Chip>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-paperDim">
        {filtered.length} {filtered.length === 1 ? "livro" : "livros"}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <p className="font-bold">Nada por aqui</p>
          <p className="mt-2 max-w-64 text-sm text-paperDim">
            {shelf.length === 0
              ? "Sua estante está vazia. Busque um livro e marque como Quero ler, Lendo ou Lido."
              : "Nenhum livro combina com esses filtros."}
          </p>
          {shelf.length === 0 && (
            <Link
              href="/search"
              className="mt-6 rounded-xl bg-foil px-5 py-3 font-bold text-leather transition-opacity hover:opacity-90"
            >
              Buscar livros
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-2 flex flex-col">
          {filtered.map(({ book, entry }) => {
            const badge = STATUS_BADGE[entry.status];
            const tags = bookTags[book.id] ?? [];
            const rating = ratings[book.id];
            return (
              <li key={book.id}>
                <Link
                  href={`/book/${book.id}`}
                  className="flex items-center gap-3.5 rounded-2xl px-2 py-3 transition-colors hover:bg-card"
                >
                  <BookCover book={book} width={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-bold">{book.title}</p>
                    <p className="truncate text-xs text-paperDim">
                      {book.authors} · {book.genre}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-card2 px-2 py-0.5 text-[10px] text-paperDim"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  {rating !== undefined && (
                    <Stars rating={rating} className="shrink-0 text-xs" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
