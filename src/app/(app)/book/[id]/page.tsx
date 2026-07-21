"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { ExpandableText } from "@/components/ExpandableText";
import { RatingInput } from "@/components/RatingInput";
import { SectionTitle } from "@/components/SectionTitle";
import { Stars } from "@/components/Stars";
import { formatCount, formatDecimal, formatShortDate, readingPercent } from "@/lib/format";
import { useBook } from "@/lib/store/hooks";
import { useStore } from "@/lib/store";
import type { Book, ShelfEntry, ShelfStatus } from "@/lib/types";

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

/** "Leu de 12 jul a 20 jul" / "Terminou em 20 jul" / "Começou em 12 jul". */
function readingDates(entry: ShelfEntry | undefined): string | null {
  if (!entry) return null;
  const { startedAt, finishedAt } = entry;
  if (startedAt && finishedAt)
    return `Leu de ${formatShortDate(startedAt)} a ${formatShortDate(finishedAt)}`;
  if (finishedAt) return `Terminou em ${formatShortDate(finishedAt)}`;
  if (startedAt) return `Começou em ${formatShortDate(startedAt)}`;
  return null;
}

/** Atualização de progresso com unidade Páginas | % (preferência no estado). */
function ProgressSection({ book, entry }: { book: Book; entry: ShelfEntry }) {
  const unit = useStore((s) => s.user.progressUnit);
  const setProgressUnit = useStore((s) => s.setProgressUnit);
  const updateProgress = useStore((s) => s.updateProgress);
  const showToast = useStore((s) => s.showToast);
  const [value, setValue] = useState("");

  const currentPage = entry.currentPage ?? 0;
  const percent = readingPercent(currentPage, book.pages);

  function save() {
    const n = Number(value);
    if (unit === "percent" ? !Number.isFinite(n) || n < 0 || n > 100 : !Number.isInteger(n) || n < 0 || n > book.pages) {
      showToast(unit === "percent" ? "Digite um valor entre 0 e 100" : `Digite uma página entre 0 e ${book.pages}`);
      return;
    }
    const page = unit === "percent" ? Math.round((n / 100) * book.pages) : n;
    const { delta } = updateProgress(book.id, page);
    setValue("");
    showToast(delta > 0 ? `+${delta} páginas! 📖` : "Progresso atualizado 📖");
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
              onClick={() => setProgressUnit(key)}
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
  const { book, entry, rating, myReview, tags, bookQuotes } = useBook(params.id);
  const username = useStore((s) => s.user.username);
  const feed = useStore((s) => s.feed);
  const setShelfStatus = useStore((s) => s.setShelfStatus);
  const setRating = useStore((s) => s.setRating);
  const saveReview = useStore((s) => s.saveReview);
  const addTag = useStore((s) => s.addTag);
  const removeTag = useStore((s) => s.removeTag);
  const addQuote = useStore((s) => s.addQuote);
  const showToast = useStore((s) => s.showToast);

  const [editingReview, setEditingReview] = useState(false);
  const [reviewDraft, setReviewDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState("");
  const [quotePage, setQuotePage] = useState("");

  if (!book) notFound();

  const communityReviews = feed.filter((r) => r.bookId === book!.id);

  function handleStatusTap(status: ShelfStatus) {
    if (entry?.status === status) {
      setShelfStatus(book!.id, null);
      showToast("Removido da estante");
    } else {
      setShelfStatus(book!.id, status);
      showToast(STATUS_TOAST[status]);
    }
  }

  function handleRating(value: number) {
    const { markedAsRead } = setRating(book!.id, value);
    if (value === 0) showToast("Avaliação removida");
    else if (markedAsRead) showToast("Marcado como Lido 🎉");
    else showToast(`Avaliação salva: ${formatDecimal(value)} ★`);
  }

  function publishReview() {
    const text = reviewDraft.trim();
    if (!text) return;
    saveReview(book!.id, text);
    setEditingReview(false);
    showToast("Review publicada!");
  }

  function handleAddTag() {
    const tag = tagDraft.trim().toLowerCase();
    if (!tag) return;
    addTag(book!.id, tag);
    setTagDraft("");
    showToast("Tag adicionada");
  }

  function saveQuote() {
    const text = quoteDraft.trim();
    if (!text) return;
    const page = Number(quotePage);
    addQuote(book!.id, text, Number.isInteger(page) && page > 0 ? page : undefined);
    setQuoteDraft("");
    setQuotePage("");
    setQuoteOpen(false);
    showToast("Citação salva ✦");
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
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-4xl font-black text-foil">
              {formatDecimal(book.avg)}
            </span>
            <div>
              <Stars rating={book.avg} className="text-sm" />
              <p className="text-xs text-paperDim">média · {formatCount(book.count)} avaliações</p>
            </div>
          </div>
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

      {entry?.status === "READING" && <ProgressSection book={book} entry={entry} />}

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
                onClick={() => {
                  removeTag(book!.id, tag);
                  showToast("Tag removida");
                }}
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
          {bookQuotes.map((quote, i) => (
            <blockquote
              key={i}
              className="rounded-2xl border border-foil/40 bg-card p-4 font-display italic leading-relaxed text-paper"
            >
              “{quote.text}”
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
              {rating !== undefined && <Stars rating={rating} className="text-xs" />}
              {readingDates(entry) && (
                <p className="mt-1 text-xs text-paperDim">{readingDates(entry)}</p>
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
              <p className="text-sm font-bold">{review.user}</p>
              <Stars rating={review.rating} className="text-xs" />
              <ExpandableText text={review.text} className="mt-1.5 text-sm text-paperDim" />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
