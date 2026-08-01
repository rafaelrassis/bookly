"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { BookOpenIcon, GiftIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { Section } from "@/components/ui/Section";
import { Spinner } from "@/components/Spinner";
import { useStore } from "@/lib/store";
import { useRecommendations } from "@/lib/store/hooks";
import type { ApiCommunityList, Book } from "@/lib/types";

function BookRow({ book, added, onQuickAdd }: { book: Book; added: boolean; onQuickAdd: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl transition-colors hover:bg-card">
      <Link href={`/book/${book.id}`} className="flex min-w-0 flex-1 items-center gap-3.5 px-2 py-2.5">
        <BookCover book={book} width={44} />
        <div className="min-w-0">
          <p className="truncate font-display font-bold">{book.title}</p>
          <p className="truncate text-sm text-paperMuted">
            {book.authors} · {book.year}
          </p>
          {book.hasDonation && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-foil/15 px-2 py-0.5 text-[10px] font-bold text-foil">
              <GiftIcon size={10} />
              Doação disponível
            </span>
          )}
        </div>
      </Link>
      <Button
        variant={added ? "ghost" : "secondary"}
        className="mr-2 shrink-0"
        disabled={added}
        onClick={() => onQuickAdd(book.id)}
      >
        {added ? "Adicionado ✓" : "Quero ler"}
      </Button>
    </div>
  );
}

export default function SearchPage() {
  const showToast = useStore((s) => s.showToast);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [communityLists, setCommunityLists] = useState<ApiCommunityList[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const recommended = useRecommendations(4);

  const q = query.trim();

  useEffect(() => {
    fetch("/api/lists/community")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setCommunityLists(data.items ?? []));
  }, []);

  useEffect(() => {
    if (!q) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const handle = setTimeout(() => {
      fetch(`/api/books/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => {
          setResults(data.books);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          if (!controller.signal.aborted) setError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [q, retryCount]);

  async function quickAdd(bookId: string) {
    const res = await fetch(`/api/books/${bookId}/shelf`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "WANT_TO_READ" }),
    });
    if (!res.ok) {
      showToast("Não foi possível adicionar agora");
      return;
    }
    setAddedIds((current) => new Set(current).add(bookId));
    showToast("Adicionado à estante ✦");
  }

  return (
    <div className="pt-4">
      <div className="sticky top-0 z-30 -mx-5 bg-leather/95 px-5 pb-2 pt-4 backdrop-blur md:top-16">
        <BackHeader className="lg:hidden">
          <input
            type="search"
            // eslint-disable-next-line jsx-a11y/no-autofocus -- campo recém-aberto (único alvo óbvio da ação do usuário); não muda o foco de página alguma sem essa ação
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Título ou autor…"
            aria-label="Buscar livros por título ou autor"
            className="min-h-tap w-full rounded-xl border border-line bg-card px-4 text-base text-paper"
          />
        </BackHeader>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Título ou autor…"
          aria-label="Buscar livros por título ou autor"
          className="hidden min-h-tap w-full rounded-xl border border-line bg-card px-4 text-base text-paper lg:block"
        />
      </div>

      {q === "" ? (
        <>
          <Section title="Recomendados para você" className="mt-6">
            <div className="flex flex-col">
              {recommended.map((book) => (
                <BookRow key={book.id} book={book} added={addedIds.has(book.id)} onQuickAdd={quickAdd} />
              ))}
            </div>
          </Section>

          {communityLists.length > 0 && (
            <Section title="Listas da comunidade">
              <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
                {communityLists.map((list) => (
                  <div key={list.id} className="rounded-2xl border border-line bg-card p-4">
                    <p className="font-bold">{list.name}</p>
                    <p className="text-xs text-paperMuted">por {list.by}</p>
                    <div className="mt-3 flex gap-2.5">
                      {list.books.map((book) => (
                        <Link
                          key={book.id}
                          href={`/book/${book.id}`}
                          aria-label={book.title}
                          className="rounded-md"
                        >
                          <BookCover book={book} width={52} />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      ) : loading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} className="text-paperMuted" label="Buscando" />
        </div>
      ) : error ? (
        <ErrorRetry
          className="mt-10"
          message="Não foi possível buscar agora. Tente novamente em instantes."
          onRetry={() => setRetryCount((n) => n + 1)}
        />
      ) : results.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<BookOpenIcon />}
          title="Nenhum livro encontrado"
          description={`Não encontramos nada para "${q}".`}
          action={{ label: "Limpar busca", onClick: () => setQuery("") }}
        />
      ) : (
        <ul className="mt-4 flex flex-col">
          {results.map((book) => (
            <li key={book.id}>
              <BookRow book={book} added={addedIds.has(book.id)} onQuickAdd={quickAdd} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
