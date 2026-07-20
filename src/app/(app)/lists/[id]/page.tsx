"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useState } from "react";
import { getBook } from "@/data/books";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { LockIcon } from "@/components/icons";
import { SectionTitle } from "@/components/SectionTitle";
import { useStore } from "@/lib/store";

export default function ListPage({ params }: { params: { id: string } }) {
  const list = useStore((s) => s.user.lists.find((l) => l.id === params.id));
  const shelf = useStore((s) => s.user.shelf);
  const toggleListVisibility = useStore((s) => s.toggleListVisibility);
  const addBooksToList = useStore((s) => s.addBooksToList);
  const removeBookFromList = useStore((s) => s.removeBookFromList);
  const showToast = useStore((s) => s.showToast);

  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  if (!list) notFound();

  const books = list.bookIds
    .map((id) => getBook(id))
    .filter((b): b is NonNullable<ReturnType<typeof getBook>> => Boolean(b));

  // candidatos: livros da estante que ainda não estão na lista
  const candidates = Object.keys(shelf)
    .filter((id) => !list.bookIds.includes(id))
    .map((id) => getBook(id))
    .filter((b): b is NonNullable<ReturnType<typeof getBook>> => Boolean(b));

  function togglePick(bookId: string) {
    setPicked((current) =>
      current.includes(bookId) ? current.filter((id) => id !== bookId) : [...current, bookId]
    );
  }

  function confirmAdd() {
    if (picked.length === 0) return;
    addBooksToList(list!.id, picked);
    showToast(`${picked.length} ${picked.length === 1 ? "livro adicionado" : "livros adicionados"}`);
    setPicked([]);
    setAdding(false);
  }

  function toggleVisibility() {
    toggleListVisibility(list!.id);
    showToast(
      list!.visibility === "public"
        ? "Lista agora é privada 🔒"
        : "Lista agora é pública 🌐"
    );
  }

  return (
    <div className="px-5 pt-4">
      <BackHeader>
        <h1 className="min-w-0 truncate text-lg font-extrabold">{list.name}</h1>
      </BackHeader>

      <div className="mt-3 flex items-center gap-2">
        {(
          [
            { key: "public", label: "Pública" },
            { key: "private", label: "Privada" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={list.visibility === key}
            onClick={() => list.visibility !== key && toggleVisibility()}
            className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              list.visibility === key
                ? "bg-foil text-leather"
                : "border border-line bg-card text-paperDim hover:text-paper"
            }`}
          >
            {key === "private" && <LockIcon size={10} />}
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs font-bold uppercase tracking-[0.14em] text-paperDim">
          {books.length} {books.length === 1 ? "livro" : "livros"}
        </span>
      </div>
      {list.visibility === "public" ? (
        <p className="mt-2 text-xs text-paperDim">Listas públicas aparecem no seu perfil.</p>
      ) : (
        <p className="mt-2 text-xs text-paperDim">Só você vê esta lista.</p>
      )}

      {books.length === 0 ? (
        <p className="mt-8 text-center text-sm text-paperDim">
          Lista vazia. Adicione livros da sua estante!
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-4 gap-3">
          {books.map((book) => (
            <div key={book.id} className="relative">
              <Link href={`/book/${book.id}`} aria-label={book.title} className="rounded-md">
                <BookCover book={book} width={88} />
              </Link>
              <button
                type="button"
                onClick={() => {
                  removeBookFromList(list!.id, book.id);
                  showToast("Removido da lista");
                }}
                aria-label={`Remover ${book.title} da lista`}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-card2 text-[10px] font-bold text-paperDim ring-1 ring-line hover:text-ribbon"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <section className="mb-4 mt-7">
        {adding ? (
          <>
            <div className="flex items-center justify-between">
              <SectionTitle>Adicionar da estante</SectionTitle>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setPicked([]);
                }}
                className="text-xs font-bold text-paperDim hover:text-paper"
              >
                Cancelar
              </button>
            </div>
            {candidates.length === 0 ? (
              <p className="mt-3 text-sm text-paperDim">
                Todos os livros da sua estante já estão na lista.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-4 gap-3">
                {candidates.map((book) => {
                  const selected = picked.includes(book.id);
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => togglePick(book.id)}
                      aria-pressed={selected}
                      aria-label={book.title}
                      className={`relative rounded-md transition-opacity ${
                        selected ? "" : "opacity-60 hover:opacity-90"
                      }`}
                    >
                      <BookCover book={book} width={88} />
                      {selected && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foil text-[10px] font-bold text-leather">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={confirmAdd}
              disabled={picked.length === 0}
              className="mt-4 w-full rounded-xl bg-foil px-5 py-3 font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Adicionar ({picked.length})
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full rounded-xl border border-dashed border-line px-5 py-3.5 font-bold text-paperDim transition-colors hover:text-paper"
          >
            + Adicionar livros
          </button>
        )}
      </section>
    </div>
  );
}
