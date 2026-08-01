"use client";

import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/apiError";

type Props = {
  bookId: string;
  tags: string[];
  /** Chamado com a lista canônica após adicionar/remover com sucesso, pra o pai sincronizar seu estado. */
  onChanged?: (tags: string[]) => void;
  onToast?: (message: string) => void;
};

/** Editor de tags de um livro (chips + input). Compartilhado entre a página
 * do livro e o bottom sheet da Estante — faz as chamadas à API e mantém
 * estado otimista local, sincronizado com `tags` quando o pai revalida. */
export function TagEditor({ bookId, tags, onChanged, onToast }: Props) {
  const [list, setList] = useState(tags);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setList(tags), [tags]);

  async function addTag() {
    const tag = draft.trim().toLowerCase();
    if (!tag || list.includes(tag) || busy) return;
    setBusy(true);
    const prev = list;
    setList([...list, tag]);
    setDraft("");
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, "Não foi possível adicionar a tag"));
      const data: { tags: string[] } = await res.json();
      setList(data.tags);
      onChanged?.(data.tags);
      onToast?.("Tag adicionada");
    } catch (err) {
      setList(prev);
      onToast?.(err instanceof Error ? err.message : "Não foi possível adicionar a tag");
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(tag: string) {
    if (busy) return;
    setBusy(true);
    const prev = list;
    setList(list.filter((t) => t !== tag));
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, "Não foi possível remover a tag"));
      const data: { tags: string[] } = await res.json();
      setList(data.tags);
      onChanged?.(data.tags);
      onToast?.("Tag removida");
    } catch (err) {
      setList(prev);
      onToast?.(err instanceof Error ? err.message : "Não foi possível remover a tag");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {list.length === 0 && (
        <p className="w-full text-xs text-paperDim">
          Tags são suas: use para organizar e filtrar a estante (ex.: &quot;favoritos do
          ano&quot;).
        </p>
      )}
      {list.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1.5 rounded-full bg-card2 py-1.5 pl-3.5 pr-2 text-xs font-medium text-paper"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`Remover tag ${tag}`}
            disabled={busy}
            className="tap flex h-4 w-4 items-center justify-center rounded-full text-paperDim hover:text-ribbonText disabled:opacity-40"
          >
            ✕
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") addTag();
        }}
        onBlur={() => draft.trim() && addTag()}
        placeholder="+ Adicionar"
        aria-label="Adicionar tag"
        disabled={busy}
        className="w-28 rounded-full border border-dashed border-line bg-transparent px-3.5 py-1.5 text-xs text-paper disabled:opacity-40"
      />
    </div>
  );
}
