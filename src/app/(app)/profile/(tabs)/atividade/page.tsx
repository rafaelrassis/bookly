"use client";

import Link from "next/link";
import { useState } from "react";
import { BookCover } from "@/components/BookCover";
import { FeedPost } from "@/components/FeedPost";
import { Chip } from "@/components/ui/Chip";
import { Stars } from "@/components/Stars";
import { useLikedReviews } from "@/lib/store/hooks";
import { handleTablistKeyDown } from "@/lib/tablist";
import { useProfileStats } from "../ProfileStatsContext";

type ActivityTab = "ratings" | "reviews" | "likes";

const ACTIVITY_TABS: { key: ActivityTab; label: string }[] = [
  { key: "ratings", label: "Últimas avaliações" },
  { key: "reviews", label: "Reviews" },
  { key: "likes", label: "Curtidas" },
];

export default function ProfileActivityPage() {
  const { ratedBooks, reviewEntries } = useProfileStats();
  const { items: likedFeedReviews } = useLikedReviews();
  const [tab, setTab] = useState<ActivityTab>("ratings");

  return (
    <div className="mt-6 mb-4">
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- onKeyDown aqui só delega a navegação por setas pros [role=tab] filhos (já focáveis); o tablist em si não recebe foco no padrão ARIA */}
      <div
        role="tablist"
        aria-label="Atividade do perfil"
        className="no-scrollbar flex gap-2 overflow-x-auto"
        onKeyDown={handleTablistKeyDown}
      >
        {ACTIVITY_TABS.map(({ key, label }) => (
          <Chip
            key={key}
            role="tab"
            id={`activity-tab-${key}`}
            aria-controls={`activity-panel-${key}`}
            aria-selected={tab === key}
            active={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </Chip>
        ))}
      </div>

      <div id={`activity-panel-${tab}`} role="tabpanel" aria-labelledby={`activity-tab-${tab}`} tabIndex={0}>
        {tab === "ratings" &&
          (ratedBooks.length === 0 ? (
            <p className="mt-4 text-sm text-paperMuted">Você ainda não avaliou nenhum livro.</p>
          ) : (
            <div className="mt-4 grid grid-cols-4 gap-3 md:grid-cols-6">
              {ratedBooks.map(({ book, rating }) => (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  aria-label={book.title}
                  className="flex flex-col items-center gap-1 rounded-md"
                >
                  <BookCover book={book} fluid sizes="(min-width: 768px) 16vw, 22vw" />
                  <Stars rating={rating} className="text-[10px]" />
                </Link>
              ))}
            </div>
          ))}

        {tab === "reviews" &&
          (reviewEntries.length === 0 ? (
            <p className="mt-4 text-sm text-paperMuted">Você ainda não escreveu reviews.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {reviewEntries.map(({ book, title, text }) => (
                <article key={book.id} className="flex gap-3.5 rounded-2xl border border-line bg-card p-3.5">
                  <Link href={`/book/${book.id}`} aria-label={book.title} className="self-start rounded-md">
                    <BookCover book={book} width={48} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-bold">{book.title}</p>
                    {title && <p className="mt-1 text-sm font-bold">{title}</p>}
                    <p className="mt-1 line-clamp-3 text-sm text-paperMuted">{text}</p>
                  </div>
                </article>
              ))}
            </div>
          ))}

        {tab === "likes" &&
          (likedFeedReviews.length === 0 ? (
            <p className="mt-4 text-sm text-paperMuted">Você ainda não curtiu nenhuma review.</p>
          ) : (
            <div className="mt-1">
              {likedFeedReviews.map((review) => (
                <FeedPost key={review.id} review={review} />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
