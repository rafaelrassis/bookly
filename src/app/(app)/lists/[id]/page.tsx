"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { LockIcon } from "@/components/icons";
import { PageLoader } from "@/components/PageLoader";
import { Spinner } from "@/components/Spinner";
import { Chip } from "@/components/ui/Chip";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { Section } from "@/components/ui/Section";
import { useStore } from "@/lib/store";
import type { ApiList, Book } from "@/lib/types";
import { apiErrorMessage } from "@/lib/apiError";

function DeleteListButton({ listId, listName }: { listId: string; listName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Apagar a lista "${listName}"? Esta ação não pode ser desfeita.`)) return;
    setLoading(true);
    const res = await fetch(`/api/lists/${listId}`, { method: "DELETE" });
    if (!res.ok) {
      setLoading(false);
      alert(await apiErrorMessage(res, "Não foi possível apagar a lista."));
      return;
    }
    router.push("/shelf");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="mt-8 flex w-full items-center justify-center rounded-xl border border-ribbon/40 py-3 font-semibold text-ribbon disabled:opacity-50"
    >
      {loading ? <Spinner size={16} className="text-ribbon" /> : "Apagar lista"}
    </button>
  );
}

export default function ListPage({ params }: { params: { id: string } }) {
  const showToast = useStore((s) => s.showToast);

  const [list, setList] = useState<ApiList | null | undefined>(undefined);
  const [shelfBooks, setShelfBooks] = useState<Book[]>([]);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    fetch(`/api/lists/${params.id}`)
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) return Promise.reject(res);
        return res.json();
      })
      .then((data) => !cancelled && setList(data))
      .catch(() => !cancelled && setError(true));
    fetch("/api/shelf")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => !cancelled && data && setShelfBooks(data.items.map((i: { book: Book }) => i.book)));
    return () => {
      cancelled = true;
    };
  }, [params.id, retryCount]);

  if (error) {
    return (
      <div className="pt-4">
        <BackHeader />
        <ErrorRetry
          className="mt-10"
          message="Não foi possível carregar a lista. Tente de novo."
          onRetry={() => setRetryCount((n) => n + 1)}
        />
      </div>
    );
  }
  if (list === null) notFound();
  if (list === undefined) {
    return (
      <div className="pt-4">
        <BackHeader />
        <PageLoader />
      </div>
    );
  }

  const books = list.books;

  // candidatos: livros da estante que ainda não estão na lista
  const candidates = shelfBooks.filter((b) => !list!.bookIds.includes(b.id));

  function togglePick(bookId: string) {
    setPicked((current) =>
      current.includes(bookId) ? current.filter((id) => id !== bookId) : [...current, bookId]
    );
  }

  async function confirmAdd() {
    if (picked.length === 0 || busy) return;
    setBusy(true);
    try {
      for (const bookId of picked) {
        await fetch(`/api/lists/${list!.id}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId }),
        });
      }
      const res = await fetch(`/api/lists/${list!.id}`);
      if (res.ok) setList(await res.json());
      showToast(`${picked.length} ${picked.length === 1 ? "livro adicionado" : "livros adicionados"}`);
      setPicked([]);
      setAdding(false);
    } finally {
      setBusy(false);
    }
  }

  async function removeBook(bookId: string) {
    if (removingId) return;
    setRemovingId(bookId);
    try {
      const res = await fetch(`/api/lists/${list!.id}/books`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      if (res.ok) {
        setList((current) =>
          current
            ? {
                ...current,
                bookIds: current.bookIds.filter((id) => id !== bookId),
                books: current.books.filter((b) => b.id !== bookId),
              }
            : current
        );
        showToast("Removido da lista");
      }
    } finally {
      setRemovingId(null);
    }
  }

  async function toggleVisibility() {
    const nextVisibility = list!.visibility === "public" ? "private" : "public";
    const res = await fetch(`/api/lists/${list!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: nextVisibility }),
    });
    if (res.ok) {
      setList((current) => (current ? { ...current, visibility: nextVisibility } : current));
      showToast(nextVisibility === "private" ? "Lista agora é privada 🔒" : "Lista agora é pública 🌐");
    }
  }

  return (
    <div className="pt-4">
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
          <Chip
            key={key}
            active={list.visibility === key}
            onClick={() => list!.visibility !== key && toggleVisibility()}
          >
            {key === "private" && <LockIcon size={10} />}
            {label}
          </Chip>
        ))}
        <span className="ml-auto text-meta uppercase text-paperMuted">
          {books.length} {books.length === 1 ? "livro" : "livros"}
        </span>
      </div>
      {list.visibility === "public" ? (
        <p className="mt-2 text-xs text-paperMuted">Listas públicas aparecem no seu perfil.</p>
      ) : (
        <p className="mt-2 text-xs text-paperMuted">Só você vê esta lista.</p>
      )}

      {books.length === 0 ? (
        <p className="mt-8 text-center text-sm text-paperMuted">
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
                onClick={() => removeBook(book.id)}
                disabled={removingId === book.id}
                aria-label={`Remover ${book.title} da lista`}
                className="tap absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-card2 text-meta text-paperMuted ring-1 ring-line hover:text-ribbonText disabled:opacity-60"
              >
                {removingId === book.id ? <Spinner size={10} className="text-paperMuted" /> : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <Section
          title="Adicionar da estante"
          action={
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setPicked([]);
              }}
              className="text-xs font-bold text-paperMuted hover:text-paper"
            >
              Cancelar
            </button>
          }
        >
          {candidates.length === 0 ? (
            <p className="mt-3 text-sm text-paperMuted">
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
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foil text-meta text-leather">
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
            disabled={picked.length === 0 || busy}
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-foil px-5 py-3 font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? <Spinner size={18} className="text-leather" /> : `Adicionar (${picked.length})`}
          </button>
        </Section>
      ) : (
        <section className="mb-4 mt-7">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full rounded-xl border border-dashed border-line px-5 py-3.5 font-bold text-paperMuted transition-colors hover:text-paper"
          >
            + Adicionar livros
          </button>
        </section>
      )}

      {list.isOwner && <DeleteListButton listId={list.id} listName={list.name} />}
    </div>
  );
}
