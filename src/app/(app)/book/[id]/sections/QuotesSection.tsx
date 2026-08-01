"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { Spinner } from "@/components/Spinner";

type Quote = { id: string; text: string; page?: number };

type Props = {
  quotes: Quote[];
  onAdd: (text: string, page?: number) => Promise<boolean>;
  onRemove: (id: string) => void;
};

export function QuotesSection({ quotes, onAdd, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pageDraft, setPageDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      const page = Number(pageDraft);
      const ok = await onAdd(text, Number.isInteger(page) && page > 0 ? page : undefined);
      if (ok) {
        setDraft("");
        setPageDraft("");
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section id="citacoes" title="Citações">
      <div className="flex flex-col gap-3">
        {quotes.map((quote) => (
          <blockquote
            key={quote.id}
            className="relative rounded-2xl border border-foil/40 bg-card p-4 font-display italic leading-relaxed text-paper"
          >
            <button
              type="button"
              onClick={() => onRemove(quote.id)}
              aria-label="Remover citação"
              className="absolute right-2 top-2 flex min-h-tap min-w-tap items-center justify-center rounded-full font-sans text-xs not-italic text-paperMuted hover:text-ribbonText"
            >
              ✕
            </button>
            <span className="pr-5">“{quote.text}”</span>
            {quote.page !== undefined && (
              <footer className="mt-2 text-right font-sans text-xs not-italic text-paperMuted">
                — pág. {quote.page}
              </footer>
            )}
          </blockquote>
        ))}

        {open ? (
          <div className="rounded-2xl border border-line bg-card p-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- campo recém-aberto (único alvo óbvio da ação do usuário); não muda o foco de página alguma sem essa ação
              autoFocus
              placeholder="Copie aqui o trecho que te marcou…"
              aria-label="Texto da citação"
              className="w-full rounded-xl border border-line bg-card2 px-4 py-3 text-sm text-paper"
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={pageDraft}
                onChange={(e) => setPageDraft(e.target.value)}
                placeholder="pág. (opcional)"
                aria-label="Página da citação"
                className="min-h-tap w-32 rounded-xl border border-line bg-card2 px-3.5 text-sm text-paper"
              />
              <div className="flex flex-1 justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-tap rounded-xl px-3 text-sm font-bold text-paperMuted hover:text-paper"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!draft.trim() || saving}
                  className="flex min-h-tap items-center justify-center rounded-xl bg-foil px-4 text-sm font-bold text-leather disabled:opacity-40"
                >
                  {saving ? <Spinner size={16} className="text-leather" /> : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-tap w-full rounded-xl border border-line bg-card px-4 text-sm font-bold text-paper transition-colors hover:border-foil/50"
          >
            Destacar citação
          </button>
        )}
      </div>
    </Section>
  );
}
