"use client";

import { useState } from "react";
import { RatingInput } from "@/components/RatingInput";
import { Section } from "@/components/ui/Section";
import { Spinner } from "@/components/Spinner";

type Props = {
  rating: number | null;
  myReviewTitle: string | null;
  myReview: string | null;
  onRate: (value: number) => void;
  onPublish: (title: string, text: string) => Promise<boolean>;
};

/** Sua avaliação: estrelas + review opcional (título + texto). */
export function RatingReviewSection({ rating, myReviewTitle, myReview, onRate, onPublish }: Props) {
  const [editingReview, setEditingReview] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [reviewDraft, setReviewDraft] = useState("");
  const [publishing, setPublishing] = useState(false);

  async function publish() {
    if (publishing) return;
    setPublishing(true);
    try {
      const ok = await onPublish(titleDraft.trim(), reviewDraft.trim());
      if (ok) setEditingReview(false);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Section title="Sua avaliação" className="rounded-2xl border border-line bg-card p-4">
      <RatingInput rating={rating ?? 0} onChange={onRate} />

      <div className="mt-4 border-t border-line pt-4">
        {editingReview ? (
          <div>
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="Título"
              aria-label="Título da sua review"
              aria-required="true"
              required
              className="mb-2 min-h-tap w-full rounded-xl border border-line bg-card2 px-4 text-sm font-bold text-paper placeholder:font-normal"
            />
            <textarea
              value={reviewDraft}
              onChange={(e) => setReviewDraft(e.target.value)}
              rows={4}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- campo recém-aberto (único alvo óbvio da ação do usuário); não muda o foco de página alguma sem essa ação
              autoFocus
              placeholder="O que você achou deste livro?"
              aria-label="Texto da sua review"
              className="w-full rounded-xl border border-line bg-card2 px-4 py-3 text-base text-paper"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingReview(false)}
                className="min-h-tap rounded-xl px-4 text-sm font-bold text-paperMuted hover:text-paper"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={publish}
                disabled={!reviewDraft.trim() || !titleDraft.trim() || publishing}
                className="flex min-h-tap items-center justify-center rounded-xl bg-foil px-4 text-sm font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {publishing ? <Spinner size={16} className="text-leather" /> : "Publicar"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {myReview && (
              <div className="mb-3">
                {myReviewTitle && <p className="text-sm font-bold">{myReviewTitle}</p>}
                <p className="mt-1 text-sm text-paperMuted">{myReview}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setTitleDraft(myReviewTitle ?? "");
                setReviewDraft(myReview ?? "");
                setEditingReview(true);
              }}
              className="min-h-tap w-full rounded-xl border border-line bg-card2 px-4 text-sm font-bold text-paper transition-colors hover:border-foil/50"
            >
              {myReview ? "Editar minha review" : "Escrever review"}
            </button>
          </>
        )}
      </div>
    </Section>
  );
}
