"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { BookOpenIcon, GiftIcon } from "@/components/icons";
import { SectionTitle } from "@/components/SectionTitle";
import { Spinner } from "@/components/Spinner";
import { useRecommendations } from "@/lib/store/hooks";
import type { ApiCommunityList, Book } from "@/lib/types";

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
        {book.hasDonation && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-foil/15 px-2 py-0.5 text-[10px] font-bold text-foil">
            <GiftIcon size={10} />
            Doação disponível
          </span>
        )}
      </div>
    </Link>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [communityLists, setCommunityLists] = useState<ApiCommunityList[]>([]);
  const [retryCount, setRetryCount] = useState(0);
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

  return (
    <div className="pt-4">
      <BackHeader>
        <input
          type="search"
          // eslint-disable-next-line jsx-a11y/no-autofocus -- campo recém-aberto (único alvo óbvio da ação do usuário); não muda o foco de página alguma sem essa ação
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

          {communityLists.length > 0 && (
            <section className="mt-6">
              <SectionTitle>Listas da comunidade</SectionTitle>
              <div className="mt-3 flex flex-col gap-3">
                {communityLists.map((list) => (
                  <div key={list.id} className="rounded-2xl border border-line bg-card p-4">
                    <p className="font-bold">{list.name}</p>
                    <p className="text-xs text-paperDim">por {list.by}</p>
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
            </section>
          )}
        </>
      ) : loading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} className="text-paperDim" label="Buscando" />
        </div>
      ) : error ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-paperDim">Não foi possível buscar agora. Tente novamente em instantes.</p>
          <button
            type="button"
            onClick={() => setRetryCount((n) => n + 1)}
            className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-bold text-paper hover:border-foil/50"
          >
            Tentar de novo
          </button>
        </div>
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
              <BookRow book={book} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
