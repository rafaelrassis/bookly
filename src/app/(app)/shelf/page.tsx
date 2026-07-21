"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getBook } from "@/data/books";
import { BookCover } from "@/components/BookCover";
import { LockIcon } from "@/components/icons";
import { SectionTitle } from "@/components/SectionTitle";
import { Stars } from "@/components/Stars";
import { useShelf } from "@/lib/store/hooks";
import { useStore } from "@/lib/store";
import type { ApiList, ShelfStatus, Visibility } from "@/lib/types";

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

/** Seção "Minhas listas": cards das listas + criação inline (API real). */
function MyLists() {
  const showToast = useStore((s) => s.showToast);
  const [lists, setLists] = useState<ApiList[]>([]);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/lists")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setLists(data ?? []));
  }, []);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, visibility }),
      });
      if (!res.ok) {
        showToast("Não foi possível criar a lista");
        return;
      }
      const list: ApiList = await res.json();
      setLists((current) => [list, ...current]);
      setName("");
      setVisibility("public");
      setCreating(false);
      showToast("Lista criada ✦");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5">
      <div className="flex items-center justify-between">
        <SectionTitle>Minhas listas</SectionTitle>
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          aria-expanded={creating}
          className="text-xs font-bold text-foil hover:opacity-80"
        >
          + Criar lista
        </button>
      </div>

      {creating && (
        <div className="mt-3 rounded-2xl border border-line bg-card p-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
            autoFocus
            placeholder="Nome da lista…"
            aria-label="Nome da nova lista"
            className="w-full rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
          />
          <div className="mt-2 flex items-center gap-2">
            {(
              [
                { key: "public", label: "Pública" },
                { key: "private", label: "Privada" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={visibility === key}
                onClick={() => setVisibility(key)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  visibility === key
                    ? "bg-foil text-leather"
                    : "border border-line bg-card2 text-paperDim hover:text-paper"
                }`}
              >
                {key === "private" && <LockIcon size={10} />}
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={create}
              disabled={!name.trim() || saving}
              className="ml-auto rounded-xl bg-foil px-4 py-1.5 text-xs font-bold text-leather disabled:opacity-40"
            >
              Criar
            </button>
          </div>
        </div>
      )}

      {lists.length > 0 && (
        <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5">
          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/lists/${list.id}`}
              className="w-44 shrink-0 rounded-2xl border border-line bg-card p-3.5 transition-colors hover:bg-card2"
            >
              <div className="flex gap-1.5">
                {list.bookIds.slice(0, 3).map((id) => {
                  const book = getBook(id);
                  return book ? <BookCover key={id} book={book} width={28} /> : null;
                })}
                {list.bookIds.length === 0 && (
                  <span className="text-xs text-paperDim">Lista vazia</span>
                )}
              </div>
              <p className="mt-2.5 line-clamp-1 text-sm font-bold">{list.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-paperDim">
                {list.visibility === "private" && <LockIcon size={9} />}
                {list.visibility === "private" ? "Privada" : "Pública"} ·{" "}
                {list.bookIds.length} {list.bookIds.length === 1 ? "livro" : "livros"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

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
    <div className="pt-5">
      <h1 className="text-2xl font-extrabold">Estante</h1>

      <MyLists />

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
