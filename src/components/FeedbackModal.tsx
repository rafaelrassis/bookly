"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { apiErrorMessage } from "@/lib/apiError";

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
      onToast(await apiErrorMessage(res, "Não deu pra enviar agora. Tente de novo."));
      return;
    }
    onToast("Obrigado! Recebemos sua mensagem 💛");
    onClose();
  }

  return (
    <Sheet onClose={onClose} title="Ajude a melhorar o Bookly">
      <p className="text-caption text-paperMuted">Encontrou um erro ou tem uma ideia? Conta pra gente.</p>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Categoria do feedback">
        {CATEGORIES.map((opt) => (
          <button
            key={opt.id}
            type="button"
            aria-pressed={category === opt.id}
            onClick={() => setCategory(opt.id)}
            className={`inline-flex min-h-tap items-center rounded-full px-3.5 text-caption font-bold transition-colors ${
              category === opt.id ? "bg-foil text-leather" : "border border-line text-paperMuted hover:text-paper"
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
        className="mt-4 w-full resize-none rounded-xl border border-line bg-card2 p-3 text-sm text-paper focus:outline-none"
      />
      <div className="mt-1 text-right text-[11px] text-paperMuted">{message.length}/2000</div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={enviar} disabled={loading}>
          {loading ? "Enviando…" : "Enviar"}
        </Button>
      </div>
    </Sheet>
  );
}
