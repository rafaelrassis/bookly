"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { withAt, withoutAt } from "@/lib/handle";
import { formatCount, formatDecimal } from "@/lib/format";
import type { YearStats } from "@/lib/stats";
import YearInBooksLoading from "./loading";

type YearUser = { username: string; name: string; avatar: number; avatarUrl: string | null };

export function YearInBooksPageClient({
  params,
}: {
  params: { username: string; year: string };
}) {
  const username = withoutAt(decodeURIComponent(params.username));
  const year = Number(params.year);

  const [user, setUser] = useState<YearUser | null | undefined>(undefined);
  const [stats, setStats] = useState<YearStats | null>(null);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    fetch(`/api/users/${username}/stats/${year}`)
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) return Promise.reject(res);
        return res.json();
      })
      .then((data: YearStats | null) => {
        if (cancelled) return;
        if (!data) {
          setUser(null);
          return;
        }
        setStats(data);
        return fetch(`/api/users/${username}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((profile) => !cancelled && setUser(profile ?? null));
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [username, year, retryCount]);

  if (error) {
    return (
      <div className="px-5 pt-4">
        <BackHeader>
          <h1 className="text-lg font-extrabold">{year} em livros</h1>
        </BackHeader>
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-paperDim">Não foi possível carregar esta página. Tente de novo.</p>
          <button
            type="button"
            onClick={() => setRetryCount((n) => n + 1)}
            className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-bold text-paper hover:border-foil/50"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (user === undefined) return <YearInBooksLoading />;
  if (user === null) notFound();

  const handle = withAt(user.username);

  return (
    <div className="px-5 pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">{year} em livros</h1>
      </BackHeader>

      <section className="mt-4 flex items-center gap-3">
        <Avatar user={handle} avatarIndex={user.avatar} avatarUrl={user.avatarUrl} size={48} />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold">{user.name}</p>
          <p className="text-sm text-paperDim">{handle}</p>
        </div>
      </section>

      <div className="mt-6 rounded-2xl border border-line bg-card p-4">
        {!stats || stats.booksRead === 0 ? (
          <p className="py-4 text-center text-sm text-paperDim">
            Nenhum livro concluído em {year} ainda.
          </p>
        ) : (
          <>
            <div className="flex">
              <div className="flex-1 text-center">
                <p className="font-display text-2xl font-bold text-foil">{stats.booksRead}</p>
                <p className="mt-0.5 text-meta uppercase text-paperMuted">
                  livros lidos
                </p>
              </div>
              <div className="flex-1 border-l border-line text-center">
                <p className="font-display text-2xl font-bold text-foil">
                  {formatCount(stats.pagesRead)}
                </p>
                <p className="mt-0.5 text-meta uppercase text-paperMuted">
                  páginas
                </p>
              </div>
              <div className="flex-1 border-l border-line text-center">
                <p className="font-display text-2xl font-bold text-foil">
                  {stats.avgRating !== null ? formatDecimal(stats.avgRating) : "–"}
                </p>
                <p className="mt-0.5 text-meta uppercase text-paperMuted">
                  nota média
                </p>
              </div>
            </div>

            {stats.topGenres.length > 0 && (
              <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
                {stats.topGenres.map(({ genre, count }) => (
                  <div key={genre} className="flex items-center justify-between text-xs text-paperDim">
                    <span className="truncate">{genre}</span>
                    <span className="shrink-0 font-bold text-paper">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {stats.covers.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-3 border-t border-line pt-4">
                {stats.covers.map((cover) => (
                  <div key={cover} className="aspect-[2/3] overflow-hidden rounded-md bg-card2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
