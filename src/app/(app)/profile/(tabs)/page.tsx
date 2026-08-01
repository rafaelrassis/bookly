"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { Section } from "@/components/ui/Section";
import { useBooksByIds, useRecommendations } from "@/lib/store/hooks";
import { useStore } from "@/lib/store";
import type { ApiList } from "@/lib/types";

/** Visão geral do perfil: favoritos, listas públicas e recomendações —
 * o resto (atividade, doações, estatísticas) mora nas outras abas de rota. */
export default function ProfileOverviewPage() {
  const user = useStore((s) => s.user);
  const recommended = useRecommendations(6);
  const favoriteBooks = useBooksByIds(user.top4);
  const [lists, setLists] = useState<ApiList[]>([]);

  useEffect(() => {
    fetch("/api/lists")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ApiList[]) => setLists(data ?? []));
  }, []);

  const publicLists = lists.filter((l) => l.visibility === "public");

  return (
    <>
      {user.top4.length > 0 && (
        <Section title="Favoritos">
          <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
            {favoriteBooks.map((book) => (
              <Link key={book.id} href={`/book/${book.id}`} aria-label={book.title} className="rounded-md">
                <BookCover book={book} fluid sizes="(min-width: 768px) 16vw, 22vw" />
              </Link>
            ))}
          </div>
        </Section>
      )}

      {publicLists.length > 0 && (
        <Section title="Listas">
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-3">
            {publicLists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4 transition-colors hover:bg-card2"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{list.name}</p>
                  <p className="text-xs text-paperMuted">
                    {list.bookIds.length} {list.bookIds.length === 1 ? "livro" : "livros"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {list.books.slice(0, 3).map((book) => (
                    <BookCover key={book.id} book={book} width={28} />
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section title="Recomendados para você" className="mb-4">
        <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
          {recommended.map((book) => (
            <Link key={book.id} href={`/book/${book.id}`} aria-label={book.title} className="rounded-md">
              <BookCover book={book} fluid sizes="(min-width: 768px) 16vw, 22vw" />
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
