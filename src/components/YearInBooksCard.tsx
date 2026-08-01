"use client";

import { useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { ShareIcon } from "@/components/icons";
import { formatCount, formatDecimal } from "@/lib/format";
import { useStore } from "@/lib/store";

type YearStats = {
  year: number;
  booksRead: number;
  pagesRead: number;
  topGenres: { genre: string; count: number }[];
  avgRating: number | null;
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export function YearInBooksCard() {
  const username = useStore((s) => s.user.username);
  const showToast = useStore((s) => s.showToast);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [stats, setStats] = useState<YearStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function onShare() {
    const url = `${window.location.origin}/u/${username}/ano/${year}`;
    const shareData = { title: `Meu ${year} em livros`, url };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // usuário cancelou o share sheet — não é erro
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copiado!");
    } catch {
      showToast(url);
    }
  }

  useEffect(() => {
    setLoaded(false);
    fetch(`/api/stats/${year}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: YearStats | null) => setStats(data))
      .finally(() => setLoaded(true));
  }, [year]);

  const maxGenreCount = Math.max(0, ...(stats?.topGenres.map((g) => g.count) ?? []));

  return (
    <Section
      title={`Seu ${year} em livros`}
      action={
        <div className="flex items-center gap-1.5">
          {stats && stats.booksRead > 0 && (
            <button
              type="button"
              onClick={onShare}
              aria-label="Compartilhar"
              className="flex min-h-tap items-center gap-1 rounded-full border border-line bg-card px-2.5 text-xs font-bold text-paperMuted transition-colors hover:text-paper"
            >
              <ShareIcon size={12} />
              Compartilhar
            </button>
          )}
          {YEAR_OPTIONS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`flex min-h-tap items-center rounded-full px-2.5 text-xs font-bold transition-colors ${
                y === year
                  ? "bg-foil text-leather"
                  : "border border-line bg-card text-paperMuted hover:text-paper"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      }
    >
      <div className="rounded-2xl border border-line bg-card p-4">
        {!loaded ? null : !stats || stats.booksRead === 0 ? (
          <p className="text-sm text-paperMuted">Nenhum livro concluído em {year} ainda.</p>
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
                  <div key={genre} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate text-xs text-paperMuted">{genre}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-card2">
                      <div
                        className="h-full rounded-full bg-foil"
                        style={{
                          width: `${maxGenreCount > 0 ? Math.max(6, Math.round((count / maxGenreCount) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-right text-xs font-bold text-paper">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Section>
  );
}
