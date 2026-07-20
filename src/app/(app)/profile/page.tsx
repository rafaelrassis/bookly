"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBook } from "@/data/books";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { FeedPost } from "@/components/FeedPost";
import { SectionTitle } from "@/components/SectionTitle";
import { Stars } from "@/components/Stars";
import { formatCount, formatDecimal } from "@/lib/format";
import { useMyStats, useRecommendations } from "@/lib/store/hooks";
import { useStore } from "@/lib/store";

const HISTOGRAM_LABELS: Record<number, string> = { 0.5: "½★", 5: "★★★★★" };

type ActivityTab = "ratings" | "reviews" | "likes";

const ACTIVITY_TABS: { key: ActivityTab; label: string }[] = [
  { key: "ratings", label: "Últimas avaliações" },
  { key: "reviews", label: "Reviews" },
  { key: "likes", label: "Curtidas" },
];

export default function ProfilePage() {
  const user = useStore((s) => s.user);
  const feed = useStore((s) => s.feed);
  const logout = useStore((s) => s.logout);
  const { readCount, pagesRead, reviewCount, avgRating, histogram, maxCount, ratedBooks } =
    useMyStats();
  const recommended = useRecommendations(6);
  const router = useRouter();

  const [tab, setTab] = useState<ActivityTab>("ratings");

  const likedFeedReviews = feed.filter((r) => user.likedReviews[r.id]);
  const myReviewEntries = Object.entries(user.myReviews)
    .map(([bookId, text]) => ({ book: getBook(bookId), text }))
    .filter((e): e is { book: NonNullable<ReturnType<typeof getBook>>; text: string } =>
      Boolean(e.book)
    );

  function handleLogout() {
    logout();
    router.replace("/");
  }

  const stats = [
    { label: "lidos", value: String(readCount) },
    { label: "páginas", value: formatCount(pagesRead) },
    { label: "reviews", value: String(reviewCount) },
  ];

  return (
    <div className="px-5 pt-8">
      <section className="flex items-center gap-4">
        <Avatar user={`@${user.username}`} size={72} />
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold">{user.name}</h1>
          <p className="text-sm text-paperDim">@{user.username}</p>
          <p className="mt-1 text-xs text-paperDim">
            <span className="font-bold text-paper">{user.followers}</span> seguidores ·{" "}
            <span className="font-bold text-paper">{user.following}</span> seguindo
          </p>
        </div>
      </section>

      {user.bio && <p className="mt-4 text-sm text-paperDim">{user.bio}</p>}

      {user.top4.length > 0 && (
        <section className="mt-6">
          <SectionTitle>Favoritos</SectionTitle>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {user.top4.map((id) => {
              const book = getBook(id);
              if (!book) return null;
              return (
                <Link key={id} href={`/book/${id}`} aria-label={book.title} className="rounded-md">
                  <BookCover book={book} width={88} />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-line bg-card py-4 text-center">
            <p className="font-display text-2xl font-bold text-foil">{stat.value}</p>
            <p className="mt-0.5 text-xs text-paperDim">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <SectionTitle>Suas notas</SectionTitle>
        <div className="mt-3 flex items-end gap-4 rounded-2xl border border-line bg-card p-4">
          <div className="flex-1">
            <div className="flex h-20 gap-1">
              {histogram.map(({ value, count }) => {
                const height = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                const isMax = maxCount > 0 && count === maxCount;
                return (
                  <div
                    key={value}
                    className="flex h-full flex-1 flex-col justify-end"
                    title={`${formatDecimal(value)}: ${count}`}
                  >
                    <div
                      className={`w-full rounded-t-sm ${isMax ? "bg-foil" : "bg-line"}`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-paperDim">
              <span>{HISTOGRAM_LABELS[0.5]}</span>
              <span className="text-foil">{HISTOGRAM_LABELS[5]}</span>
            </div>
          </div>
          <div className="pb-4 text-center">
            <p className="font-display text-3xl font-black text-foil">
              {avgRating !== null ? formatDecimal(avgRating) : "–"}
            </p>
            <p className="text-[10px] text-paperDim">sua média</p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle>Atividade</SectionTitle>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {ACTIVITY_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                tab === key
                  ? "bg-foil text-leather"
                  : "border border-line bg-card text-paperDim hover:text-paper"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "ratings" &&
          (ratedBooks.length === 0 ? (
            <p className="mt-4 text-sm text-paperDim">Você ainda não avaliou nenhum livro.</p>
          ) : (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {ratedBooks.map(({ book, rating }) => (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  aria-label={book.title}
                  className="flex flex-col items-center gap-1 rounded-md"
                >
                  <BookCover book={book} width={88} />
                  <Stars rating={rating} className="text-[10px]" />
                </Link>
              ))}
            </div>
          ))}

        {tab === "reviews" &&
          (myReviewEntries.length === 0 ? (
            <p className="mt-4 text-sm text-paperDim">Você ainda não escreveu reviews.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {myReviewEntries.map(({ book, text }) => (
                <article key={book.id} className="flex gap-3.5 rounded-2xl border border-line bg-card p-3.5">
                  <Link href={`/book/${book.id}`} aria-label={book.title} className="self-start rounded-md">
                    <BookCover book={book} width={48} />
                  </Link>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold">{book.title}</p>
                    {user.ratings[book.id] !== undefined && (
                      <Stars rating={user.ratings[book.id]} className="text-xs" />
                    )}
                    <p className="mt-1 line-clamp-3 text-sm text-paperDim">{text}</p>
                  </div>
                </article>
              ))}
            </div>
          ))}

        {tab === "likes" &&
          (likedFeedReviews.length === 0 ? (
            <p className="mt-4 text-sm text-paperDim">Você ainda não curtiu nenhuma review.</p>
          ) : (
            <div className="mt-1">
              {likedFeedReviews.map((review) => (
                <FeedPost key={review.id} review={review} />
              ))}
            </div>
          ))}
      </section>

      <section className="mt-7">
        <SectionTitle>Recomendados para você</SectionTitle>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5">
          {recommended.map((book) => (
            <Link key={book.id} href={`/book/${book.id}`} aria-label={book.title} className="rounded-md">
              <BookCover book={book} width={88} />
            </Link>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-8 w-full rounded-xl border border-line bg-card px-5 py-3.5 font-bold text-ribbon transition-colors hover:bg-card2"
      >
        Sair
      </button>
    </div>
  );
}
