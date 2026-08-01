"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { BookOpenIcon, GiftIcon, LockIcon } from "@/components/icons";
import { NotificationBell } from "@/components/NotificationBell";
import { ReadingGoalCard } from "@/components/ReadingGoalCard";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/Spinner";
import { Stars } from "@/components/Stars";
import { TagEditor } from "@/components/TagEditor";
import { useStore } from "@/lib/store";
import type { ApiList, Book, ShelfEntry, ShelfStatus, Visibility } from "@/lib/types";
import { apiErrorMessage } from "@/lib/apiError";

type ShelfItem = { book: Book; entry: ShelfEntry; tags: string[]; rating: number | null };
type ViewMode = "list" | "grid";

const STATUS_FILTERS: { key: ShelfStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Todos" },
  { key: "READING", label: "Lendo" },
  { key: "WANT_TO_READ", label: "Quero ler" },
  { key: "READ", label: "Lido" },
];

/** Só aparece como chip quando o usuário tem pelo menos 1 livro em DNF —
 * ver `hasDnf` em ShelfPage. */
const DNF_FILTER: { key: ShelfStatus | "ALL"; label: string } = { key: "DNF", label: "Abandonei" };

const STATUS_BADGE: Record<ShelfStatus, { label: string; className: string }> = {
  READING: { label: "Lendo", className: "bg-ribbon/20 text-ribbonText" },
  WANT_TO_READ: { label: "Quero ler", className: "bg-card2 text-paperMuted" },
  READ: { label: "Lido", className: "bg-foil/15 text-foil" },
  DNF: { label: "Abandonei", className: "bg-card2 text-paperMuted" },
};

/** Seção "Minhas listas": cards das listas + criação inline. */
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
        showToast(await apiErrorMessage(res, "Não foi possível criar a lista"));
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
    <section className="mt-8">
      <div className="mb-3 flex min-h-tap items-center justify-between gap-3">
        <h2 className="text-meta uppercase text-paperMuted">Minhas listas</h2>
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          aria-expanded={creating}
          className="flex min-h-tap items-center text-xs font-bold text-foil hover:opacity-80"
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
            // eslint-disable-next-line jsx-a11y/no-autofocus -- campo recém-aberto (único alvo óbvio da ação do usuário); não muda o foco de página alguma sem essa ação
            autoFocus
            placeholder="Nome da lista…"
            aria-label="Nome da nova lista"
            className="w-full rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper"
          />
          <div className="mt-2 flex items-center gap-2">
            <div role="group" aria-label="Visibilidade da lista" className="flex items-center gap-2">
              {(
                [
                  { key: "public", label: "Pública" },
                  { key: "private", label: "Privada" },
                ] as const
              ).map(({ key, label }) => (
                <Chip key={key} active={visibility === key} onClick={() => setVisibility(key)}>
                  {key === "private" && <LockIcon size={10} />}
                  {label}
                </Chip>
              ))}
            </div>
            <Button variant="primary" className="ml-auto" onClick={create} disabled={!name.trim() || saving}>
              {saving ? <Spinner size={14} className="text-leather" /> : "Criar"}
            </Button>
          </div>
        </div>
      )}

      {lists.length > 0 && (
        <div
          role="region"
          aria-label="Minhas listas"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- carrossel horizontal no mobile: tabIndex permite rolar com teclado (vira grid, não-rolável, a partir de md)
          tabIndex={0}
          className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0"
        >
          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/lists/${list.id}`}
              className="w-44 shrink-0 rounded-2xl border border-line bg-card p-3.5 transition-colors hover:bg-card2 md:w-auto"
            >
              <div className="flex gap-1.5">
                {list.books.slice(0, 3).map((book) => (
                  <BookCover key={book.id} book={book} width={28} />
                ))}
                {list.bookIds.length === 0 && (
                  <span className="text-xs text-paperMuted">Lista vazia</span>
                )}
              </div>
              <p className="mt-2.5 line-clamp-1 text-sm font-bold">{list.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-meta uppercase text-paperMuted">
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

export default function ShelfPage() {
  const showToast = useStore((s) => s.showToast);
  const [items, setItems] = useState<ShelfItem[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ShelfStatus | "ALL">("ALL");
  const [genre, setGenre] = useState<string>("ALL");
  const [tag, setTag] = useState<string>("ALL");
  const [retryCount, setRetryCount] = useState(0);
  const [tagSheetItem, setTagSheetItem] = useState<ShelfItem | null>(null);
  const [hasDnf, setHasDnf] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("list");

  const reload = useCallback(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status !== "ALL") params.set("status", status);
    if (genre !== "ALL") params.set("genre", genre);
    if (tag !== "ALL") params.set("tag", tag);

    setError(false);
    return fetch(`/api/shelf?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setItems(data.items);
        setGenres(data.genres);
        setAllTags(data.tags);
        setLoaded(true);
        // Só a busca sem filtro de status reflete a estante inteira —
        // usada pra decidir se o chip "Abandonei" aparece.
        if (status === "ALL") {
          setHasDnf((data.items as ShelfItem[]).some((item) => item.entry.status === "DNF"));
        }
      })
      .catch(() => setError(true));
  }, [query, status, genre, tag]);

  useEffect(() => {
    const handle = setTimeout(reload, 200);
    return () => clearTimeout(handle);
  }, [reload, retryCount]);

  const isEmptyShelf = useMemo(
    () => loaded && items.length === 0 && query === "" && status === "ALL" && genre === "ALL" && tag === "ALL",
    [loaded, items.length, query, status, genre, tag]
  );

  const activeFilterCount = (status !== "ALL" ? 1 : 0) + (genre !== "ALL" ? 1 : 0) + (tag !== "ALL" ? 1 : 0);
  const statusOptions = hasDnf ? [...STATUS_FILTERS, DNF_FILTER] : STATUS_FILTERS;

  return (
    <div className="pt-5">
      <header className="flex items-center justify-between">
        <h1 className="text-h1 font-extrabold">Estante</h1>
        <NotificationBell className="-mr-2" />
      </header>

      <div className="sticky top-0 z-30 -mx-5 mt-4 flex items-center gap-2 border-b border-line bg-leather/95 px-5 py-3 backdrop-blur md:top-16 lg:top-0">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar na estante…"
          aria-label="Buscar na estante por título ou autor"
          className="min-h-tap min-w-0 flex-1 rounded-xl border border-line bg-card px-4 text-base text-paper"
        />

        <Button onClick={() => setFiltersOpen(true)} aria-expanded={filtersOpen}>
          Filtros
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-foil px-1.5 text-meta text-leather">{activeFilterCount}</span>
          )}
        </Button>

        <div
          className="hidden rounded-xl border border-line bg-card p-0.5 md:flex"
          role="group"
          aria-label="Visualização"
        >
          <IconButton label="Ver em lista" aria-pressed={view === "list"} onClick={() => setView("list")}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
              <path d="M8 6h13M8 12h13M8 18h13" />
              <path d="M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </IconButton>
          <IconButton label="Ver em grade" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </IconButton>
        </div>
      </div>

      <p className="mt-4 text-meta uppercase text-paperMuted" aria-live="polite">
        {items.length} {items.length === 1 ? "livro" : "livros"}
      </p>

      {error ? (
        <ErrorRetry
          className="mt-8"
          message="Não foi possível carregar sua estante. Tente de novo."
          onRetry={() => setRetryCount((n) => n + 1)}
        />
      ) : items.length === 0 ? (
        loaded &&
        (isEmptyShelf ? (
          <EmptyState
            icon={<BookOpenIcon />}
            title="Sua estante está vazia"
            description="Busque um livro e marque como Quero ler, Lendo ou Lido."
            action={{ label: "Buscar livros", href: "/search" }}
          />
        ) : (
          <EmptyState
            icon={<BookOpenIcon />}
            title="Nada por aqui"
            description="Nenhum livro combina com esses filtros."
            action={{
              label: "Limpar filtros",
              onClick: () => {
                setQuery("");
                setStatus("ALL");
                setGenre("ALL");
                setTag("ALL");
              },
            }}
          />
        ))
      ) : view === "grid" ? (
        <ul className="mt-2 grid grid-cols-3 gap-x-3 gap-y-5 xs:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
          {items.map(({ book, entry }) => (
            <li key={book.id} className="group relative">
              <Link href={`/book/${book.id}`} className="block">
                <BookCover
                  book={book}
                  fluid
                  sizes="(min-width: 1024px) 14vw, (min-width: 768px) 16vw, (min-width: 480px) 24vw, 32vw"
                  className={entry.status === "DNF" ? "grayscale-[0.6] opacity-80" : ""}
                />
                <p className="mt-2 line-clamp-2 text-caption font-bold group-hover:text-foil">{book.title}</p>
                <p className="text-meta font-normal normal-case tracking-normal text-paperMuted">
                  {book.authors}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-2 flex flex-col">
          {items.map(({ book, entry, tags, rating }) => {
            const badge = STATUS_BADGE[entry.status];
            return (
              <li key={book.id} className="group flex items-center rounded-2xl transition-colors hover:bg-card">
                <Link
                  href={`/book/${book.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3.5 px-2 py-3"
                >
                  <BookCover
                    book={book}
                    width={48}
                    className={entry.status === "DNF" ? "grayscale-[0.6] opacity-80" : ""}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-bold">{book.title}</p>
                    <p className="truncate text-xs text-paperMuted">
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
                          className="rounded-full bg-card2 px-2 py-0.5 text-[10px] text-paperMuted"
                        >
                          {t}
                        </span>
                      ))}
                      {book.hasDonation && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-foil/15 px-2 py-0.5 text-[10px] font-bold text-foil">
                          <GiftIcon size={10} />
                          Doação disponível
                        </span>
                      )}
                    </div>
                  </div>
                  {rating !== null && <Stars rating={rating} className="shrink-0 text-xs" />}
                </Link>
                <IconButton
                  label={`Editar tags de ${book.title}`}
                  onClick={() => setTagSheetItem({ book, entry, tags, rating })}
                  className="mr-1.5 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:focus-visible:opacity-100"
                >
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="19" cy="12" r="1.8" />
                  </svg>
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}

      <ReadingGoalCard />
      <MyLists />

      {filtersOpen && (
        <Sheet onClose={() => setFiltersOpen(false)} title="Filtros">
          <div className="flex flex-col gap-4">
            <div>
              <h3 id="filter-status-label" className="mb-2 text-meta uppercase text-paperMuted">
                Status
              </h3>
              <div role="group" aria-labelledby="filter-status-label" className="flex flex-wrap gap-2">
                {statusOptions.map(({ key, label }) => (
                  <Chip key={key} active={status === key} onClick={() => setStatus(key)}>
                    {label}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <h3 id="filter-genre-label" className="mb-2 text-meta uppercase text-paperMuted">
                Gênero
              </h3>
              <div role="group" aria-labelledby="filter-genre-label" className="flex flex-wrap gap-2">
                <Chip active={genre === "ALL"} onClick={() => setGenre("ALL")}>
                  Todos
                </Chip>
                {genres.map((g) => (
                  <Chip key={g} active={genre === g} onClick={() => setGenre(g)}>
                    {g}
                  </Chip>
                ))}
              </div>
            </div>

            {allTags.length > 0 && (
              <div>
                <h3 id="filter-tag-label" className="mb-2 text-meta uppercase text-paperMuted">
                  Tag
                </h3>
                <div role="group" aria-labelledby="filter-tag-label" className="flex flex-wrap gap-2">
                  <Chip active={tag === "ALL"} onClick={() => setTag("ALL")}>
                    Todas
                  </Chip>
                  {allTags.map((t) => (
                    <Chip key={t} active={tag === t} onClick={() => setTag(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <Button variant="primary" full onClick={() => setFiltersOpen(false)}>
              Ver {items.length} {items.length === 1 ? "livro" : "livros"}
            </Button>
          </div>
        </Sheet>
      )}

      {tagSheetItem && (
        <Sheet onClose={() => setTagSheetItem(null)} title={`Tags · ${tagSheetItem.book.title}`}>
          <TagEditor
            bookId={tagSheetItem.book.id}
            tags={tagSheetItem.tags}
            onChanged={() => reload()}
            onToast={showToast}
          />
        </Sheet>
      )}
    </div>
  );
}
