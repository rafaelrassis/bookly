"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BOOKS } from "@/data/books";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { LockIcon } from "@/components/icons";
import { SectionTitle } from "@/components/SectionTitle";
import { useStore } from "@/lib/store";
import type { Visibility } from "@/lib/types";

/** Busca case-insensitive; acentos também são ignorados. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function NewClubPage() {
  const createClub = useStore((s) => s.createClub);
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [bookQuery, setBookQuery] = useState("");
  const [bookId, setBookId] = useState<string | null>(null);

  const q = normalize(bookQuery.trim());
  const bookResults = q
    ? BOOKS.filter(
        (b) => normalize(b.title).includes(q) || normalize(b.authors).includes(q)
      )
    : BOOKS;
  const selectedBook = BOOKS.find((b) => b.id === bookId);

  const valid = name.trim().length > 0 && bookId !== null;

  function create() {
    if (!valid || !bookId) return;
    const { id, code } = createClub(name.trim(), bookId, desc.trim(), visibility);
    showToast(
      visibility === "private" ? `Clube criado! Código: ${code}` : "Clube criado! 🎉"
    );
    router.push(`/clubs/${id}`);
  }

  return (
    <div className="pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Criar clube</h1>
      </BackHeader>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
          Nome do clube
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Leitoras de domingo"
            className="rounded-xl border border-line bg-card px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
          Descrição
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            placeholder="Sobre o que é o clube?"
            className="resize-none rounded-xl border border-line bg-card px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
          />
        </label>
      </div>

      <section className="mt-6">
        <SectionTitle>Leitura do clube</SectionTitle>
        {selectedBook ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-foil/40 bg-card p-3">
            <BookCover book={selectedBook} width={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold">{selectedBook.title}</p>
              <p className="truncate text-xs text-paperDim">{selectedBook.authors}</p>
            </div>
            <button
              type="button"
              onClick={() => setBookId(null)}
              className="rounded-full px-2 text-sm text-paperDim hover:text-ribbon"
              aria-label="Trocar livro"
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <input
              type="search"
              value={bookQuery}
              onChange={(e) => setBookQuery(e.target.value)}
              placeholder="Buscar no catálogo…"
              aria-label="Buscar livro para o clube"
              className="mt-3 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
            />
            <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-line bg-card">
              {bookResults.length === 0 ? (
                <p className="p-4 text-sm text-paperDim">Nenhum livro encontrado.</p>
              ) : (
                bookResults.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => setBookId(book.id)}
                    className="flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left last:border-b-0 hover:bg-card2"
                  >
                    <BookCover book={book} width={32} />
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
        )}
      </section>

      <section className="mt-6">
        <SectionTitle>Visibilidade</SectionTitle>
        <div className="mt-3 flex gap-2">
          {(
            [
              { key: "public", label: "Público" },
              { key: "private", label: "Privado" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={visibility === key}
              onClick={() => setVisibility(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-bold transition-colors ${
                visibility === key
                  ? "bg-foil text-leather"
                  : "border border-line bg-card text-paperDim hover:text-paper"
              }`}
            >
              {key === "private" && <LockIcon />}
              {label}
            </button>
          ))}
        </div>
        {visibility === "private" && (
          <p className="mt-2 text-xs text-paperDim">
            Clubes privados geram um código de 6 caracteres para convidar quem você quiser.
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={create}
        disabled={!valid}
        className="mb-4 mt-8 w-full rounded-xl bg-foil px-5 py-3.5 font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Criar clube
      </button>
    </div>
  );
}
