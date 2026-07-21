"use client";

import { notFound } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { ExpandableText } from "@/components/ExpandableText";
import { RatingInput } from "@/components/RatingInput";
import { SectionTitle } from "@/components/SectionTitle";
import { Stars } from "@/components/Stars";
import { formatCount, formatDecimal, readingDates, readingPercent } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Book, ShelfEntry, ShelfStatus } from "@/lib/types";

type BookQuote = { id: string; text: string; page?: number };

type CommunityReview = {
  id: string;
  user: { username: string; name: string; avatar: number };
  rating: number;
  text: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type BookPayload = {
  book: Book;
  entry: ShelfEntry | null;
  rating: number | null;
  myReview: string | null;
  tags: string[];
  quotes: BookQuote[];
};

const STATUS_OPTIONS: { status: ShelfStatus; label: string }[] = [
  { status: "WANT_TO_READ", label: "Quero ler" },
  { status: "READING", label: "Lendo" },
  { status: "READ", label: "Lido" },
];

const STATUS_TOAST: Record<ShelfStatus, string> = {
  WANT_TO_READ: "Adicionado a Quero ler",
  READING: "Marcado como Lendo 📖",
  READ: "Marcado como Lido 🎉",
};

/** Atualização de progresso com unidade Páginas | % (preferência no perfil). */
function ProgressSection({
  book,
  entry,
  onProgress,
}: {
  book: Book;
  entry: ShelfEntry;
  onProgress: (page: number) => Promise<{ delta: number } | null>;
}) {
  const unit = useStore((s) => s.user.progressUnit);
  const applyProfile = useStore((s) => s.applyProfile);
  const showToast = useStore((s) => s.showToast);
  const [value, setValue] = useState("");

  const currentPage = entry.currentPage ?? 0;
  const percent = readingPercent(currentPage, book.pages);

  async function changeUnit(next: "pages" | "percent") {
    applyProfile({ progressUnit: next });
    fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progressUnit: next }),
    }).catch(() => {});
  }

  async function save() {
    const n = Number(value);
    if (
      unit === "percent"
        ? !Number.isFinite(n) || n < 0 || n > 100
        : !Number.isInteger(n) || n < 0 || n > book.pages
    ) {
      showToast(unit === "percent" ? "Digite um valor entre 0 e 100" : `Digite uma página entre 0 e ${book.pages}`);
      return;
    }
    const page = unit === "percent" ? Math.round((n / 100) * book.pages) : n;
    const result = await onProgress(page);
    if (!result) {
      showToast("Não foi possível salvar o progresso");
      return;
    }
    setValue("");
    showToast(result.delta > 0 ? `+${result.delta} páginas! 📖` : "Progresso atualizado 📖");
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <SectionTitle>Seu progresso</SectionTitle>
        <div
          className="flex rounded-full border border-line bg-card2 p-0.5 text-xs font-bold"
          role="group"
          aria-label="Unidade do progresso"
        >
          {(
            [
              { key: "pages", label: "Páginas" },
              { key: "percent", label: "%" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={unit === key}
              onClick={() => changeUnit(key)}
              className={`rounded-full px-3 py-1 transition-colors ${
                unit === key ? "bg-foil text-leather" : "text-paperDim hover:text-paper"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

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

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={unit === "percent" ? 100 : book.pages}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder={unit === "percent" ? "% lida (0–100)" : `pág. atual (0–${book.pages})`}
          aria-label={unit === "percent" ? "Percentual lido" : "Página atual"}
          className="min-w-0 flex-1 rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
        />
        <button
          type="button"
          onClick={save}
          disabled={!value.trim()}
          className="rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather disabled:opacity-40"
        >
          Salvar
        </button>
      </div>
    </section>
  );
}

export default function BookPage({ params }: { params: { id: string } }) {
  const username = useStore((s) => s.user.username);
  const showToast = useStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [book, setBook] = useState<Book | null>(null);
  const [entry, setEntry] = useState<ShelfEntry | null>(null);
  const [rating, setRatingState] = useState<number | null>(null);
  const [myReview, setMyReview] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<BookQuote[]>([]);

  const [communityReviews, setCommunityReviews] = useState<CommunityReview[]>([]);
  const [reviewsCursor, setReviewsCursor] = useState<string | null>(null);

  const [editingReview, setEditingReview] = useState(false);
  const [reviewDraft, setReviewDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState("");
  const [quotePage, setQuotePage] = useState("");

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
    fetch(`/api/books/${bookId}`).then(async (res) => {
      if (cancelled) return;
      if (res.status === 404) {
        setNotFoundFlag(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data: BookPayload = await res.json();
      setBook(data.book);
      setEntry(data.entry);
      setRatingState(data.rating);
      setMyReview(data.myReview);
      setTags(data.tags);
      setQuotes(data.quotes);
      setLoading(false);
    });
    loadReviews();
    return () => {
      cancelled = true;
    };
  }, [bookId, loadReviews]);

  if (notFoundFlag) notFound();
  if (loading || !book) return null;

  async function handleStatusTap(status: ShelfStatus) {
    const next = entry?.status === status ? null : status;
    const res = await fetch(`/api/books/${bookId}/shelf`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      showToast("Não foi possível atualizar a estante");
      return;
    }
    const data = await res.json();
    setEntry(data.entry);
    showToast(next === null ? "Removido da estante" : STATUS_TOAST[next]);
  }

  async function handleProgress(page: number) {
    const res = await fetch(`/api/books/${bookId}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setEntry((prev) => ({
      status: "READING",
      currentPage: page,
      lastPage: prev?.currentPage ?? 0,
      startedAt: prev?.startedAt ?? new Date().toISOString(),
      finishedAt: null,
    }));
    return { delta: data.delta as number };
  }

  async function handleRating(value: number) {
    const res = await fetch(`/api/books/${bookId}/review`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: value, text: myReview ?? "" }),
    });
    if (!res.ok) {
      showToast("Não foi possível salvar a avaliação");
      return;
    }
    const data = await res.json();
    const markedAsRead = value > 0 && entry?.status !== "READ";
    setRatingState(data.rating);
    setMyReview(data.myReview);
    setEntry(data.entry);
    if (value === 0) showToast("Avaliação removida");
    else if (markedAsRead) showToast("Marcado como Lido 🎉");
    else showToast(`Avaliação salva: ${formatDecimal(value)} ★`);
  }

  async function publishReview() {
    const text = reviewDraft.trim();
    if (!text) return;
    if (!rating || rating <= 0) {
      showToast("Dê uma nota antes de publicar a review");
      return;
    }
    const res = await fetch(`/api/books/${bookId}/review`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, text }),
    });
    if (!res.ok) {
      showToast("Não foi possível publicar a review");
      return;
    }
    const data = await res.json();
    setMyReview(data.myReview);
    setEntry(data.entry);
    setEditingReview(false);
    showToast("Review publicada!");
  }

  async function handleAddTag() {
    const tag = tagDraft.trim().toLowerCase();
    if (!tag) return;
    const res = await fetch(`/api/books/${bookId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });
    setTagDraft("");
    if (!res.ok) {
      showToast("Não foi possível adicionar a tag");
      return;
    }
    const data = await res.json();
    setTags(data.tags);
    showToast("Tag adicionada");
  }

  async function handleRemoveTag(tag: string) {
    const res = await fetch(`/api/books/${bookId}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setTags(data.tags);
    showToast("Tag removida");
  }

  async function saveQuote() {
    const text = quoteDraft.trim();
    if (!text) return;
    const page = Number(quotePage);
    const res = await fetch(`/api/books/${bookId}/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, page: Number.isInteger(page) && page > 0 ? page : undefined }),
    });
    if (!res.ok) {
      showToast("Não foi possível salvar a citação");
      return;
    }
    const quote = await res.json();
    setQuotes((prev) => [...prev, quote]);
    setQuoteDraft("");
    setQuotePage("");
    setQuoteOpen(false);
    showToast("Citação salva ✦");
  }

  async function removeQuote(id: string) {
    const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    showToast("Citação removida");
  }

  return (
    <div className="pt-4">
      <BackHeader />

      <section className="mt-2 flex gap-5">
        <BookCover book={book} width={108} />
        <div className="min-w-0 self-center">
          <h1 className="font-display text-xl font-bold leading-snug">{book.title}</h1>
          <p className="mt-1 text-sm text-paperDim">
            {book.authors} · {book.year} · {book.pages} pág. · {book.genre}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="font-display text-4xl font-black text-foil">
              {formatDecimal(book.avg)}
            </span>
            <Stars rating={book.avg} className="text-sm" />
          </div>
          <p className="mt-1 text-xs text-paperDim">
            média · {formatCount(book.count)} avaliações
          </p>
        </div>
      </section>

      <section className="mt-6" aria-label="Status de leitura">
        <div className="flex gap-2">
          {STATUS_OPTIONS.map(({ status, label }) => {
            const active = entry?.status === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusTap(status)}
                aria-pressed={active}
                className={`flex-1 rounded-full px-3 py-2.5 text-sm font-bold transition-colors ${
                  active
                    ? "bg-foil text-leather"
                    : "border border-line bg-card text-paperDim hover:text-paper"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {entry?.status === "READING" && (
        <ProgressSection book={book} entry={entry} onProgress={handleProgress} />
      )}

      <section className="mt-6 rounded-2xl border border-line bg-card p-4">
        <SectionTitle>Sua avaliação</SectionTitle>
        <div className="mt-2">
          <RatingInput rating={rating ?? 0} onChange={handleRating} />
        </div>

        <div className="mt-4 border-t border-line pt-4">
          {editingReview ? (
            <div>
              <textarea
                value={reviewDraft}
                onChange={(e) => setReviewDraft(e.target.value)}
                rows={4}
                autoFocus
                placeholder="O que você achou deste livro?"
                aria-label="Texto da sua review"
                className="w-full rounded-xl border border-line bg-card2 px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingReview(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-paperDim hover:text-paper"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={publishReview}
                  disabled={!reviewDraft.trim()}
                  className="rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Publicar
                </button>
              </div>
            </div>
          ) : (
            <>
              {myReview && (
                <p className="mb-3 text-sm text-paperDim">{myReview}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setReviewDraft(myReview ?? "");
                  setEditingReview(true);
                }}
                className="w-full rounded-xl border border-line bg-card2 px-4 py-3 text-sm font-bold text-paper transition-colors hover:border-foil/50"
              >
                {myReview ? "Editar minha review" : "Escrever review"}
              </button>
            </>
          )}
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle>Suas tags</SectionTitle>
        {tags.length === 0 && (
          <p className="mt-2 text-xs text-paperDim">
            Tags são suas: use para organizar e filtrar a estante (ex.: &quot;favoritos do
            ano&quot;).
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1.5 rounded-full bg-card2 py-1.5 pl-3.5 pr-2 text-xs font-medium text-paper"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remover tag ${tag}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-paperDim hover:text-ribbon"
              >
                ✕
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTag();
            }}
            onBlur={() => tagDraft.trim() && handleAddTag()}
            placeholder="+ Adicionar"
            aria-label="Adicionar tag"
            className="w-28 rounded-full border border-dashed border-line bg-transparent px-3.5 py-1.5 text-xs text-paper placeholder:text-paperDim/70"
          />
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle>Citações</SectionTitle>
        <div className="mt-2.5 flex flex-col gap-3">
          {quotes.map((quote) => (
            <blockquote
              key={quote.id}
              className="relative rounded-2xl border border-foil/40 bg-card p-4 font-display italic leading-relaxed text-paper"
            >
              <button
                type="button"
                onClick={() => removeQuote(quote.id)}
                aria-label="Remover citação"
                className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full font-sans text-xs not-italic text-paperDim hover:text-ribbon"
              >
                ✕
              </button>
              <span className="pr-5">“{quote.text}”</span>
              {quote.page !== undefined && (
                <footer className="mt-2 text-right font-sans text-xs not-italic text-paperDim">
                  — pág. {quote.page}
                </footer>
              )}
            </blockquote>
          ))}

          {quoteOpen ? (
            <div className="rounded-2xl border border-line bg-card p-4">
              <textarea
                value={quoteDraft}
                onChange={(e) => setQuoteDraft(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Copie aqui o trecho que te marcou…"
                aria-label="Texto da citação"
                className="w-full rounded-xl border border-line bg-card2 px-4 py-3 text-sm text-paper placeholder:text-paperDim/60"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={quotePage}
                  onChange={(e) => setQuotePage(e.target.value)}
                  placeholder="pág. (opcional)"
                  aria-label="Página da citação"
                  className="w-32 rounded-xl border border-line bg-card2 px-3.5 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
                />
                <div className="flex flex-1 justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setQuoteOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-bold text-paperDim hover:text-paper"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveQuote}
                    disabled={!quoteDraft.trim()}
                    className="rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather disabled:opacity-40"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setQuoteOpen(true)}
              className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm font-bold text-paper transition-colors hover:border-foil/50"
            >
              Destacar citação
            </button>
          )}
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle>Sinopse</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-paperDim">{book.synopsis}</p>
      </section>

      <section className="mt-6">
        <SectionTitle>Reviews da comunidade</SectionTitle>
        <div className="mt-3 flex flex-col gap-3">
          {myReview && (
            <article className="rounded-2xl border border-foil/40 bg-card p-4">
              <p className="text-sm font-bold">
                @{username} <span className="font-medium text-foil">(você)</span>
              </p>
              {rating !== null && <Stars rating={rating} className="text-xs" />}
              {readingDates(entry?.startedAt ?? undefined, entry?.finishedAt ?? undefined) && (
                <p className="mt-1 text-xs text-paperDim">
                  {readingDates(entry?.startedAt ?? undefined, entry?.finishedAt ?? undefined)}
                </p>
              )}
              <ExpandableText text={myReview} className="mt-1.5 text-sm text-paperDim" />
            </article>
          )}
          {communityReviews.length === 0 && !myReview && (
            <p className="text-sm text-paperDim">
              Ainda não há reviews por aqui. Seja a primeira pessoa a avaliar!
            </p>
          )}
          {communityReviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center gap-2.5">
                <Avatar user={`@${review.user.username}`} avatarIndex={review.user.avatar} size={28} />
                <div>
                  <p className="text-sm font-bold">{review.user.name}</p>
                  <Stars rating={review.rating} className="text-xs" />
                </div>
              </div>
              {readingDates(review.startedAt ?? undefined, review.finishedAt ?? undefined) && (
                <p className="mt-1 text-xs text-paperDim">
                  {readingDates(review.startedAt ?? undefined, review.finishedAt ?? undefined)}
                </p>
              )}
              <ExpandableText text={review.text} className="mt-1.5 text-sm text-paperDim" />
            </article>
          ))}
          {reviewsCursor && (
            <button
              type="button"
              onClick={() => loadReviews(reviewsCursor)}
              className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-bold text-paperDim hover:text-paper"
            >
              Carregar mais
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
