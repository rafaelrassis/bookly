"use client";

import { useState } from "react";
import { useModalA11y } from "@/lib/useModalA11y";

const CATEGORIES = [
  { id: "erro", label: "Reportar erro" },
  { id: "sugestao", label: "Dar uma sugestão" },
  { id: "outro", label: "Outro" },
] as const;

type Category = (typeof CATEGORIES)[number]["id"];

type Props = {
  onClose: () => void;
  onToast: (message: string) => void;
};

export function FeedbackModal({ onClose, onToast }: Props) {
  const [category, setCategory] = useState<Category>("sugestao");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);

  async function enviar() {
    if (message.trim().length < 5) {
      onToast("Escreva um pouco mais 🙂");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim(), category }),
    });
    setLoading(false);
    if (!res.ok) {
      onToast("Não deu pra enviar agora. Tente de novo.");
      return;
    }
    onToast("Obrigado! Recebemos sua mensagem 💛");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-5">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        tabIndex={-1}
        className="w-full max-w-app rounded-t-2xl border border-line bg-card p-6 focus:outline-none sm:rounded-2xl"
      >
        <h2 id="feedback-modal-title" className="text-lg font-extrabold">
          Ajude a melhorar o Bookly
        </h2>
        <p className="mt-1 text-sm text-paperDim">Encontrou um erro ou tem uma ideia? Conta pra gente.</p>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Categoria do feedback">
          {CATEGORIES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={category === opt.id}
              onClick={() => setCategory(opt.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                category === opt.id ? "bg-foil text-leather" : "border border-line text-paperDim hover:text-paper"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={5}
          placeholder="Escreva aqui…"
          aria-label="Sua mensagem"
          className="mt-4 w-full resize-none rounded-xl border border-line bg-card2 p-3 text-sm text-paper placeholder:text-paperDim/60 focus:outline-none"
        />
        <div className="mt-1 text-right text-[11px] text-paperDim">{message.length}/2000</div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-paperDim hover:text-paper"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={loading}
            className="rounded-xl bg-foil px-5 py-2.5 text-sm font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
