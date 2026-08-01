"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { Section } from "@/components/ui/Section";
import { Sheet } from "@/components/ui/Sheet";
import { DiscoverReaders } from "@/components/DiscoverReaders";
import { EmptyState } from "@/components/EmptyState";
import { FeedEventCard } from "@/components/FeedEventCard";
import { BookOpenIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { ReadingGoalCard } from "@/components/ReadingGoalCard";
import { SeguindoEmptyState } from "@/components/SeguindoEmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Spinner } from "@/components/Spinner";
import { AsideContent } from "@/lib/aside";
import { readingPercent } from "@/lib/format";
import { timeGreeting, weekdayName } from "@/lib/reading-pace";
import { handleTablistKeyDown } from "@/lib/tablist";
import { useStore } from "@/lib/store";
import { useFeed, useTrendingBooks } from "@/lib/store/hooks";
import { apiErrorMessage } from "@/lib/apiError";
import type { Book, ShelfEntry } from "@/lib/types";

type ReadingItem = { book: Book; entry: ShelfEntry };
type TodayData = {
  weeklyPages: number;
  stalled: { book: Book; updatedAt: string } | null;
  nextQueued: { book: Book } | null;
};

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

/** Sheet de atualização rápida de página — a ação mais frequente do app,
 * hoje só possível abrindo o livro. */
function UpdatePageSheet({
  book,
  currentPage,
  onClose,
  onSaved,
}: {
  book: Book;
  currentPage: number;
  onClose: () => void;
  onSaved: (page: number) => void;
}) {
  const showToast = useStore((s) => s.showToast);
  const [value, setValue] = useState(String(currentPage || ""));
  const [saving, setSaving] = useState(false);

  async function save() {
    const page = Number(value);
    if (!Number.isInteger(page) || page < 0 || page > book.pages) {
      showToast(`Página deve ser um número entre 0 e ${book.pages}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/books/${book.id}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, "Não foi possível atualizar a página"));
      onSaved(page);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Não foi possível atualizar a página");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet onClose={onClose} title={book.title}>
      <label htmlFor="home-update-page-input" className="text-xs font-bold text-paperMuted">
        Em que página você está? (de {book.pages})
      </label>
      <input
        id="home-update-page-input"
        type="number"
        inputMode="numeric"
        min={0}
        max={book.pages}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- sheet recém-aberto, único campo
        autoFocus
        className="mt-2 w-full rounded-xl border border-line bg-card2 px-4 py-2.5 text-base text-paper"
      />
      <Button variant="primary" full className="mt-3" onClick={save} disabled={saving}>
        {saving ? <Spinner size={16} className="text-leather" /> : "Salvar página"}
      </Button>
    </Sheet>
  );
}

/** Card de leitura atual — capa/título levam ao livro; as duas ações diretas
 * (atualizar página, anotar) ficam na própria Home, sem precisar abrir o
 * livro pro gesto mais frequente do app. */
function ReadingCard({
  item,
  priority = false,
  onPageUpdated,
}: {
  item: ReadingItem;
  priority?: boolean;
  onPageUpdated: (bookId: string, page: number) => void;
}) {
  const { book, entry } = item;
  const [updating, setUpdating] = useState(false);
  const currentPage = entry.currentPage ?? 0;
  const lastPage = entry.lastPage ?? currentPage;
  const delta = currentPage - lastPage;
  const percent = readingPercent(currentPage, book.pages);
  const remaining = Math.max(book.pages - currentPage, 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-card p-4">
      {/* Fita marcadora — assinatura visual do bookly */}
      <span
        aria-hidden="true"
        className="absolute right-6 top-0 h-16 w-6 bg-ribbon"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 10px), 0 100%)" }}
      />
      <Link href={`/book/${book.id}`} className="flex gap-4">
        <BookCover book={book} width={64} priority={priority} />
        <div className="min-w-0 flex-1 self-center pr-8">
          <h3 className="truncate font-display text-base font-bold">{book.title}</h3>
          <p className="truncate text-sm text-paperMuted">{book.authors}</p>
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
          <p className="mt-1.5 text-xs font-bold text-paper">
            {remaining > 0 ? `Faltam ${remaining} páginas` : "Concluído"}
          </p>
          <p className="text-xs text-paperMuted">
            {percent}% · pág. {currentPage} de {book.pages}
          </p>
          {delta > 0 && (
            <p className="mt-0.5 text-xs font-bold text-foil">
              +{delta} pág. desde a última leitura
            </p>
          )}
        </div>
      </Link>
      <div className="mt-3 flex gap-2">
        <Button variant="primary" onClick={() => setUpdating(true)}>
          Atualizar página
        </Button>
        <Button asChild>
          <Link href={`/book/${book.id}#citacoes`}>Anotar</Link>
        </Button>
      </div>
      {updating && (
        <UpdatePageSheet
          book={book}
          currentPage={currentPage}
          onClose={() => setUpdating(false)}
          onSaved={(page) => onPageUpdated(book.id, page)}
        />
      )}
    </div>
  );
}

function TrendingList({ trending }: { trending: Book[] }) {
  return (
    <div
      role="region"
      aria-label="Em alta esta semana"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- carrossel horizontal no mobile: tabIndex permite rolar com teclado (vira grid, não-rolável, a partir de md)
      tabIndex={0}
      className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-1"
    >
      {trending.map((book) => (
        <Link
          key={book.id}
          href={`/book/${book.id}`}
          className="flex shrink-0 items-center gap-3 rounded-md lg:w-full lg:rounded-xl lg:p-1.5 lg:hover:bg-card2"
        >
          <BookCover book={book} width={96} className="lg:w-14" />
          <div className="hidden min-w-0 lg:block">
            <p className="truncate font-display text-sm font-bold">{book.title}</p>
            <p className="truncate text-xs text-paperMuted">{book.authors}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** "Da sua estante" — cartões derivados de dados que já existem (nenhuma
 * tabela nova): livro parado, meta anual, próximo da fila. Some quando não
 * há nada a mostrar (não força as três posições). */
function FromYourShelf({ today }: { today: TodayData | null }) {
  if (today === null) return null;
  const hasStalled = today.stalled !== null;
  const hasQueued = today.nextQueued !== null;
  if (!hasStalled && !hasQueued) return <ReadingGoalCard />;

  return (
    <div className="flex flex-col gap-3">
      {today.stalled && <StalledBookCard stalled={today.stalled} />}
      <ReadingGoalCard />
      {today.nextQueued && (
        <Link
          href={`/book/${today.nextQueued.book.id}`}
          className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 transition-colors hover:bg-card2"
        >
          <BookCover book={today.nextQueued.book} width={44} />
          <div className="min-w-0 flex-1">
            <p className="text-meta uppercase text-paperMuted">Próximo da fila</p>
            <p className="truncate font-display text-sm font-bold">{today.nextQueued.book.title}</p>
          </div>
        </Link>
      )}
    </div>
  );
}

function StalledBookCard({ stalled }: { stalled: NonNullable<TodayData["stalled"]> }) {
  const showToast = useStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const [abandoned, setAbandoned] = useState(false);

  async function abandonar() {
    setBusy(true);
    try {
      const res = await fetch(`/api/books/${stalled.book.id}/shelf`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DNF" }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, "Não foi possível abandonar"));
      setAbandoned(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Não foi possível abandonar");
    } finally {
      setBusy(false);
    }
  }

  if (abandoned) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
      <BookCover book={stalled.book} width={44} />
      <div className="min-w-0 flex-1">
        <p className="text-meta uppercase text-paperMuted">Parado há um tempo</p>
        <p className="truncate font-display text-sm font-bold">{stalled.book.title}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button asChild>
          <Link href={`/book/${stalled.book.id}`}>Retomar</Link>
        </Button>
        <Button variant="ghost" onClick={abandonar} disabled={busy}>
          {busy ? <Spinner size={16} /> : "Abandonar"}
        </Button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const name = useStore((s) => s.user.name);
  const [reading, setReading] = useState<ReadingItem[]>([]);
  const [today, setToday] = useState<TodayData | null>(null);
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
    fetch("/api/home/today")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setToday(data));
  }, []);

  function handlePageUpdated(bookId: string, page: number) {
    setReading((current) =>
      current.map((item) =>
        item.book.id === bookId
          ? { ...item, entry: { ...item.entry, lastPage: item.entry.currentPage ?? 0, currentPage: page } }
          : item
      )
    );
  }

  return (
    <div className="pt-5">
      <header className="flex items-center justify-between lg:hidden">
        <Logo />
        <NotificationBell className="-mr-2" />
      </header>

      <Link
        href="/search"
        className="mt-5 hidden min-h-tap items-center gap-2.5 rounded-xl border border-line bg-card px-4 text-paperMuted transition-colors hover:bg-card2 md:flex lg:mt-0"
      >
        <SearchIcon />
        Buscar livros ou autores…
      </Link>

      <p className="mt-4 text-title font-bold text-paper">
        {timeGreeting()}, {name || "leitor"} · {weekdayName()}
        {today && today.weeklyPages > 0 ? ` · ${today.weeklyPages} páginas nesta semana` : ""}
      </p>

      {reading.length > 0 && (
        <Section title={reading.length === 1 ? "Leitura atual" : "Leituras atuais"} aria-label="Leituras atuais">
          <div className="grid gap-3 md:grid-cols-2">
            {reading.map((item, i) => (
              <ReadingCard key={item.book.id} item={item} priority={i === 0} onPageUpdated={handlePageUpdated} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Da sua estante" className="lg:hidden">
        <FromYourShelf today={today} />
      </Section>
      <AsideContent>
        <Section title="Da sua estante" className="mt-0 first:mt-0">
          <FromYourShelf today={today} />
        </Section>
      </AsideContent>

      {trending.length > 0 && (
        <>
          <Section title="Em alta esta semana" className="lg:hidden">
            <TrendingList trending={trending} />
          </Section>
          <AsideContent>
            <Section title="Em alta esta semana">
              <TrendingList trending={trending} />
            </Section>
          </AsideContent>
        </>
      )}

      <Section
        title="Enquanto isso"
        stickyHeader
        action={
          // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- onKeyDown aqui só delega a navegação por setas pros [role=tab] filhos (já focáveis); o tablist em si não recebe foco no padrão ARIA
          <div
            role="tablist"
            aria-label="Filtro do feed"
            className="flex gap-2"
            onKeyDown={handleTablistKeyDown}
          >
            {(
              [
                { key: "all", label: "Comunidade" },
                { key: "following", label: "Seguindo" },
              ] as const
            ).map(({ key, label }) => (
              <Chip
                key={key}
                role="tab"
                id={`tab-${key}`}
                aria-controls="feed-panel"
                aria-selected={feedFilter === key}
                active={feedFilter === key}
                onClick={() => setFeedFilter(key)}
              >
                {label}
              </Chip>
            ))}
          </div>
        }
      >
        <div id="feed-panel" role="tabpanel" aria-labelledby={`tab-${feedFilter}`} tabIndex={0}>
          {feedError ? (
            <ErrorRetry message="Não foi possível carregar o feed. Tente de novo." onRetry={retryFeed} />
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
                  className="mt-2 text-sm font-bold text-paperMuted underline decoration-dotted hover:text-paper"
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
              className="mt-2 flex min-h-tap w-full items-center justify-center rounded-xl border border-line bg-card px-4 text-sm font-bold text-paperMuted transition-colors hover:text-paper disabled:opacity-50"
            >
              {loadingMore ? <Spinner size={16} className="text-paperMuted" /> : "Carregar mais"}
            </button>
          )}
        </div>
      </Section>

      <div className="lg:hidden">
        <DiscoverReaders />
      </div>
      <AsideContent>
        <DiscoverReaders anchorId="discover-readers-aside" />
      </AsideContent>
    </div>
  );
}
