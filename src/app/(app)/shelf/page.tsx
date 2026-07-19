"use client";

import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { useShelf } from "@/lib/store";
import type { ShelfStatus } from "@/lib/types";

const SECTIONS: { status: ShelfStatus; label: string }[] = [
  { status: "READING", label: "Lendo" },
  { status: "WANT_TO_READ", label: "Quero ler" },
  { status: "READ", label: "Lido" },
];

export default function ShelfPage() {
  const shelf = useShelf();

  return (
    <div className="px-5 pt-5">
      <h1 className="font-display text-2xl font-bold">Estante</h1>

      {shelf.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <p className="font-display text-lg font-bold">Sua estante está vazia</p>
          <p className="mt-2 max-w-64 text-sm text-paperDim">
            Busque um livro e marque como Quero ler, Lendo ou Lido para começar.
          </p>
          <Link
            href="/search"
            className="mt-6 rounded-xl bg-foil px-5 py-3 font-bold text-leather transition-opacity hover:opacity-90"
          >
            Buscar livros
          </Link>
        </div>
      ) : (
        SECTIONS.map(({ status, label }) => {
          const items = shelf.filter((item) => item.entry.status === status);
          if (items.length === 0) return null;
          return (
            <section key={status} className="mt-7">
              <h2 className="font-display text-lg font-bold">
                {label} <span className="text-sm font-medium text-paperDim">· {items.length}</span>
              </h2>
              <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5">
                {items.map(({ book }) => (
                  <Link
                    key={book.id}
                    href={`/book/${book.id}`}
                    aria-label={book.title}
                    className="rounded-md"
                  >
                    <BookCover book={book} width={88} />
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
