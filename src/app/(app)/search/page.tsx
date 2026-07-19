"use client";

import Link from "next/link";
import { useState } from "react";
import { BOOKS } from "@/data/books";
import { BookCover } from "@/components/BookCover";

/** Busca case-insensitive; acentos também são ignorados para facilitar. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const q = normalize(query.trim());
  const results = q
    ? BOOKS.filter(
        (book) => normalize(book.title).includes(q) || normalize(book.authors).includes(q)
      )
    : BOOKS;

  return (
    <div className="px-5 pt-5">
      <h1 className="font-display text-2xl font-bold">Buscar</h1>
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Título ou autor…"
        aria-label="Buscar livros por título ou autor"
        className="mt-4 w-full rounded-xl border border-line bg-card px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
      />

      {results.length === 0 ? (
        <p className="mt-10 text-center text-paperDim">
          Nenhum livro encontrado. No app real, a busca consulta a Google Books API.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col">
          {results.map((book) => (
            <li key={book.id}>
              <Link
                href={`/book/${book.id}`}
                className="flex items-center gap-3.5 rounded-2xl px-2 py-2.5 transition-colors hover:bg-card"
              >
                <BookCover book={book} width={44} />
                <div className="min-w-0">
                  <p className="truncate font-bold">{book.title}</p>
                  <p className="truncate text-sm text-paperDim">
                    {book.authors} · {book.year}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
