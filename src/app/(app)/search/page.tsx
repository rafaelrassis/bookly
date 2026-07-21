"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COMMUNITY_LISTS } from "@/data/community";
import { getBook } from "@/data/books";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { SectionTitle } from "@/components/SectionTitle";
import { useRecommendations } from "@/lib/store/hooks";
import type { Book } from "@/lib/types";

function BookRow({ book }: { book: Book }) {
  return (
    <Link
      href={`/book/${book.id}`}
      className="flex items-center gap-3.5 rounded-2xl px-2 py-2.5 transition-colors hover:bg-card"
    >
      <BookCover book={book} width={44} />
      <div className="min-w-0">
        <p className="truncate font-display font-bold">{book.title}</p>
        <p className="truncate text-sm text-paperDim">
          {book.authors} · {book.year}
        </p>
      </div>
    </Link>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const recommended = useRecommendations(4);

  const q = query.trim();

  useEffect(() => {
    if (!q) {
      setResults([]);
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
  }, [q]);

  return (
    <div className="pt-4">
      <BackHeader>
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Título ou autor…"
          aria-label="Buscar livros por título ou autor"
          className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-base text-paper placeholder:text-paperDim/60"
        />
      </BackHeader>

      {q === "" ? (
        <>
          <section className="mt-6">
            <SectionTitle>Recomendados para você</SectionTitle>
            <div className="mt-2 flex flex-col">
              {recommended.map((book) => (
                <BookRow key={book.id} book={book} />
              ))}
            </div>
          </section>

          <section className="mt-6">
            <SectionTitle>Listas da comunidade</SectionTitle>
            <div className="mt-3 flex flex-col gap-3">
              {COMMUNITY_LISTS.map((list) => (
                <div key={list.name} className="rounded-2xl border border-line bg-card p-4">
                  <p className="font-bold">{list.name}</p>
                  <p className="text-xs text-paperDim">por {list.by}</p>
                  <div className="mt-3 flex gap-2.5">
                    {list.bookIds.map((id) => {
                      const book = getBook(id);
                      if (!book) return null;
                      return (
                        <Link
                          key={id}
                          href={`/book/${id}`}
                          aria-label={book.title}
                          className="rounded-md"
                        >
                          <BookCover book={book} width={52} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : results.length === 0 ? (
        <p className="mt-10 text-center text-paperDim">
          Nenhum livro encontrado no catálogo.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col">
          {results.map((book) => (
            <li key={book.id}>
              <BookRow book={book} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
