"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { Spinner } from "@/components/Spinner";
import { readingPercent } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Book, ShelfEntry } from "@/lib/types";

/** Atualização de progresso com unidade Páginas | % (preferência no perfil). */
export function ProgressSection({
  book,
  entry,
  onProgress,
}: {
  book: Book;
  entry: ShelfEntry;
  onProgress: (page: number) => Promise<{ delta: number; finished: boolean } | null>;
}) {
  const unit = useStore((s) => s.user.progressUnit);
  const applyProfile = useStore((s) => s.applyProfile);
  const showToast = useStore((s) => s.showToast);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (saving) return;
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
    setSaving(true);
    try {
      const result = await onProgress(page);
      if (!result) {
        showToast("Não foi possível salvar o progresso");
        return;
      }
      setValue("");
      showToast(
        result.finished
          ? "Livro concluído 📖"
          : result.delta > 0
            ? `+${result.delta} páginas! 📖`
            : "Progresso atualizado 📖"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Seu progresso"
      className="rounded-2xl border border-line bg-card p-4 !mt-6"
      action={
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
                unit === key ? "bg-foil text-leather" : "text-paperMuted hover:text-paper"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      <div
        className="h-1.5 overflow-hidden rounded-full bg-card2"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso de leitura"
      >
        <div className="h-full rounded-full bg-ribbon" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-paperMuted">
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
          className="min-h-tap min-w-0 flex-1 rounded-xl border border-line bg-card2 px-4 text-sm text-paper"
        />
        <button
          type="button"
          onClick={save}
          disabled={!value.trim() || saving}
          className="flex min-h-tap items-center justify-center rounded-xl bg-foil px-4 text-sm font-bold text-leather disabled:opacity-40"
        >
          {saving ? <Spinner size={16} className="text-leather" /> : "Salvar"}
        </button>
      </div>
    </Section>
  );
}
