"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBook } from "@/data/books";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { Stars } from "@/components/Stars";
import { SectionTitle } from "@/components/SectionTitle";
import { withAt, withoutAt } from "@/lib/handle";
import { formatCount } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ApiList, ApiUserReview } from "@/lib/types";
import type { UserStats } from "@/lib/stats";

type Profile = {
  id: string;
  username: string;
  name: string;
  bio: string;
  avatar: number;
  top4: string[];
  followers: number;
  following: number;
  isMe: boolean;
  isFollowing: boolean;
  stats: UserStats;
};

export default function PublicProfilePage({ params }: { params: { username: string } }) {
  const username = withoutAt(decodeURIComponent(params.username));
  const myUsername = useStore((s) => s.user.username);
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [reviews, setReviews] = useState<ApiUserReview[]>([]);
  const [lists, setLists] = useState<ApiList[]>([]);
  const [followBusy, setFollowBusy] = useState(false);

  const isMe = username === myUsername;

  useEffect(() => {
    if (isMe) {
      router.replace("/profile");
      return;
    }
    fetch(`/api/users/${username}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Profile | null) => {
        setProfile(data ?? null);
        if (data) {
          fetch(`/api/users/${username}/reviews`)
            .then((r) => (r.ok ? r.json() : { items: [] }))
            .then((d) => setReviews((d.items ?? []).filter((r: ApiUserReview) => r.text !== "")));
          fetch(`/api/lists?userId=${data.id}`)
            .then((r) => (r.ok ? r.json() : []))
            .then((d) => setLists(d ?? []));
        }
      });
  }, [username, isMe, router]);

  if (isMe || profile === undefined) return null;

  if (!profile) {
    return (
      <div className="px-5 pt-4">
        <BackHeader>
          <h1 className="text-lg font-extrabold">Perfil</h1>
        </BackHeader>
        <p className="mt-8 text-center text-sm text-paperDim">Usuário não encontrado.</p>
      </div>
    );
  }

  const handle = withAt(profile.username);

  async function onFollow() {
    if (followBusy || !profile) return;
    setFollowBusy(true);
    const next = !profile.isFollowing;
    try {
      const res = await fetch(`/api/users/${profile.username}/follow`, {
        method: next ? "POST" : "DELETE",
      });
      if (res.ok) {
        setProfile((p) => (p ? { ...p, isFollowing: next, followers: p.followers + (next ? 1 : -1) } : p));
        showToast(next ? `Seguindo ${handle}` : `Deixou de seguir ${handle}`);
      }
    } finally {
      setFollowBusy(false);
    }
  }

  const publicLists = lists.filter((l) => l.visibility === "public");

  return (
    <div className="px-5 pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Perfil</h1>
      </BackHeader>

      <section className="mt-4 flex items-center gap-4">
        <Avatar user={handle} avatarIndex={profile.avatar} size={72} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold">{profile.name}</h2>
          <p className="text-sm text-paperDim">{handle}</p>
          <div className="mt-1 flex gap-4 text-xs text-paperDim">
            <span>
              <b className="text-paper">{profile.followers}</b> seguidores
            </span>
            <span>
              <b className="text-paper">{profile.following}</b> seguindo
            </span>
          </div>
        </div>
      </section>

      {profile.bio && <p className="mt-3 text-sm text-paper">{profile.bio}</p>}

      <button
        type="button"
        onClick={onFollow}
        disabled={followBusy}
        aria-pressed={profile.isFollowing}
        className={`mt-4 w-full rounded-xl px-5 py-3 text-sm font-bold transition-colors disabled:opacity-60 ${
          profile.isFollowing
            ? "border border-line bg-card text-paperDim hover:text-paper"
            : "bg-foil text-leather hover:opacity-90"
        }`}
      >
        {profile.isFollowing ? "Seguindo" : "Seguir"}
      </button>

      {profile.top4.length > 0 && (
        <section className="mt-7">
          <SectionTitle>Favoritos</SectionTitle>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {profile.top4.map((id) => {
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

      <div className="mt-6 flex rounded-2xl border border-line bg-card py-4">
        {[
          { label: "lidos", value: String(profile.stats.readCount) },
          { label: "páginas", value: formatCount(profile.stats.pagesRead) },
          { label: "reviews", value: String(profile.stats.reviewCount) },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`flex-1 text-center ${i > 0 ? "border-l border-line" : ""}`}
          >
            <p className="font-display text-2xl font-bold text-foil">{stat.value}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-paperDim">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {publicLists.length > 0 && (
        <section className="mt-7">
          <SectionTitle>Listas</SectionTitle>
          <div className="mt-3 flex flex-col gap-3">
            {publicLists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4 transition-colors hover:bg-card2"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{list.name}</p>
                  <p className="text-xs text-paperDim">
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
        </section>
      )}

      <section className="mt-7 pb-8">
        <SectionTitle>Reviews</SectionTitle>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-paperDim">Nenhuma review ainda.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {reviews.map((review) => (
              <Link
                key={review.id}
                href={`/review/${review.id}`}
                className="flex gap-3.5 rounded-2xl border border-line bg-card p-3.5 transition-colors hover:bg-card2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foil focus-visible:ring-offset-2 focus-visible:ring-offset-leather"
              >
                <BookCover book={review.book} width={48} />
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold">{review.book.title}</p>
                  <Stars rating={review.rating} className="text-xs" />
                  {review.title && <p className="mt-1 text-sm font-bold">{review.title}</p>}
                  <p className="mt-0.5 line-clamp-2 text-sm text-paperDim">{review.text}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
