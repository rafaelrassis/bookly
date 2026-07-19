"use client";

import { notFound, useRouter } from "next/navigation";
import { useState } from "react";
import { BookCover } from "@/components/BookCover";
import { RatingInput } from "@/components/RatingInput";
import { Stars } from "@/components/Stars";
import { formatCount, formatDecimal } from "@/lib/format";
import { useBook, useToast, useUser } from "@/lib/store";
import type { ShelfStatus } from "@/lib/types";

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

export default function BookPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, setShelfStatus, setRating, saveReview } = useUser();
  const { book, entry, rating, myReview } = useBook(params.id);
  const { showToast } = useToast();

  const [editingReview, setEditingReview] = useState(false);
  const [reviewDraft, setReviewDraft] = useState("");

  if (!book) notFound();

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
    if (value === 0) {
      showToast("Avaliação removida");
    } else if (markedAsRead) {
      showToast("Marcado como Lido 🎉");
    } else {
      showToast(`Avaliação salva: ${formatDecimal(value)} ★`);
    }
  }

  function openReviewEditor() {
    setReviewDraft(myReview ?? "");
    setEditingReview(true);
  }

  function publishReview() {
    const text = reviewDraft.trim();
    if (!text) return;
    saveReview(book!.id, text);
    setEditingReview(false);
    showToast("Review publicada!");
  }

  return (
    <div className="px-5 pt-4">
      <header>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-2xl text-paperDim hover:text-paper"
        >
          ‹
        </button>
      </header>

      <section className="mt-2 flex gap-5">
        <BookCover book={book} width={108} />
        <div className="min-w-0 self-center">
          <h1 className="font-display text-xl font-bold leading-snug">{book.title}</h1>
          <p className="mt-1 text-sm text-paperDim">
            {book.authors} · {book.year} · {book.pages} pág.
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-4xl font-black text-foil">
              {formatDecimal(book.avg)}
            </span>
            <div>
              <Stars rating={book.avg} className="text-sm" />
              <p className="text-xs text-paperDim">
                média · {formatCount(book.count)} avaliações
              </p>
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
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
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

      <section className="mt-6 rounded-2xl border border-line bg-card p-4">
        <h2 className="font-display text-base font-bold">Sua avaliação</h2>
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
              onClick={openReviewEditor}
              className="w-full rounded-xl border border-line bg-card2 px-4 py-3 text-sm font-bold text-paper transition-colors hover:border-foil/50"
            >
              {myReview ? "Editar minha review" : "Escrever review"}
            </button>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg font-bold">Sinopse</h2>
        <p className="mt-2 text-sm leading-relaxed text-paperDim">{book.synopsis}</p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg font-bold">Reviews da comunidade</h2>
        <div className="mt-3 flex flex-col gap-3">
          {myReview && (
            <article className="rounded-2xl border border-foil/40 bg-card p-4">
              <p className="text-sm font-bold">
                @{user.username} <span className="font-medium text-foil">(você)</span>
              </p>
              {rating !== undefined && <Stars rating={rating} className="text-xs" />}
              <p className="mt-1.5 text-sm text-paperDim">{myReview}</p>
            </article>
          )}
          {book.reviews.map((review) => (
            <article
              key={review.user}
              className="rounded-2xl border border-line bg-card p-4"
            >
              <p className="text-sm font-bold">{review.user}</p>
              <Stars rating={review.rating} className="text-xs" />
              <p className="mt-1.5 text-sm text-paperDim">{review.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
