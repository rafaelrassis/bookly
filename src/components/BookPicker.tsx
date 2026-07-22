"use client";

import { useEffect, useState } from "react";
import { BOOKS } from "@/data/books";
import { BookCover } from "@/components/BookCover";
import type { Book } from "@/lib/types";

/** Sem query, lista o catálogo semeado (estático, idêntico ao que o seed
 * grava no banco); com query, busca com debounce em /api/books?q=. */
function useBookSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>(BOOKS);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(BOOKS);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      fetch(`/api/books?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data) setResults(data.items);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  return { query, setQuery, results };
}

/** Seletor de livro do catálogo pra criar/editar clube: livro escolhido vira
 * um card com botão de trocar; senão, busca + lista com debounce. */
export function BookPicker({
  selected,
  onSelect,
  onClear,
  placeholder = "Buscar no catálogo…",
  dense = false,
}: {
  selected: Book | null;
  onSelect: (book: Book) => void;
  onClear: () => void;
  placeholder?: string;
  dense?: boolean;
}) {
  const { query, setQuery, results } = useBookSearch();

  if (selected) {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border border-foil/40 bg-card ${dense ? "p-2.5" : "p-3"}`}
      >
        <BookCover book={selected} width={dense ? 32 : 40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold">{selected.title}</p>
          <p className="truncate text-xs text-paperDim">{selected.authors}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Trocar livro"
          className="shrink-0 rounded-full px-2 text-sm text-paperDim hover:text-ribbon"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar livro"
        className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
      />
      <div
        className={`mt-2 overflow-y-auto rounded-2xl border border-line bg-card ${dense ? "max-h-40" : "max-h-56"}`}
      >
        {results.length === 0 ? (
          <p className="p-4 text-sm text-paperDim">Nenhum livro encontrado.</p>
        ) : (
          results.map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => onSelect(book)}
              className="flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left last:border-b-0 hover:bg-card2"
            >
              <BookCover book={book} width={dense ? 26 : 32} />
              <span className="min-w-0">
                <span className="block truncate font-display text-sm font-bold">
                  {book.title}
                </span>
                <span className="block truncate text-xs text-paperDim">{book.authors}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </>
  );
}
