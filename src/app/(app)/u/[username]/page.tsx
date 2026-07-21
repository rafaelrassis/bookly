"use client";

import Link from "next/link";
import { useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import { MOCK_USERS } from "@/data/users";
import { getBook } from "@/data/books";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { Stars } from "@/components/Stars";
import { SectionTitle } from "@/components/SectionTitle";
import { readingDates } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function PublicProfilePage({ params }: { params: { username: string } }) {
  const handle = `@${decodeURIComponent(params.username)}`;
  const profile = MOCK_USERS[handle];

  const myUsername = useStore((s) => s.user.username);
  const feed = useStore((s) => s.feed);
  const followed = useStore((s) => s.followedUsers);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();

  useEffect(() => {
    if (handle === `@${myUsername}`) router.replace("/profile");
  }, [handle, myUsername, router]);

  if (!profile) notFound();

  const reviews = feed.filter((r) => r.user === handle);
  const isFollowing = followed.includes(handle);

  function onFollow() {
    const now = toggleFollow(handle);
    showToast(now ? `Seguindo ${handle}` : `Deixou de seguir ${handle}`);
  }

  return (
    <div className="px-5 pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Perfil</h1>
      </BackHeader>

      <section className="mt-4 flex items-center gap-4">
        <Avatar user={handle} size={72} />
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
        aria-pressed={isFollowing}
        className={`mt-4 w-full rounded-xl px-5 py-3 text-sm font-bold transition-colors ${
          isFollowing
            ? "border border-line bg-card text-paperDim hover:text-paper"
            : "bg-foil text-leather hover:opacity-90"
        }`}
      >
        {isFollowing ? "Seguindo" : "Seguir"}
      </button>

      {profile.reading.length > 0 && (
        <section className="mt-7">
          <SectionTitle>Lendo agora</SectionTitle>
          <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5">
            {profile.reading.map((id) => {
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

      <section className="mt-7 pb-8">
        <SectionTitle>Reviews</SectionTitle>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-paperDim">Nenhuma review ainda.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {reviews.map((r) => {
              const book = getBook(r.bookId);
              if (!book) return null;
              const dates = readingDates(r.startedAt, r.finishedAt);
              return (
                <Link
                  key={r.id}
                  href={`/review/${r.id}`}
                  className="flex gap-3.5 rounded-2xl border border-line bg-card p-3.5 transition-colors hover:bg-card2"
                >
                  <BookCover book={book} width={48} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold">{book.title}</p>
                    <Stars rating={r.rating} className="text-xs" />
                    {r.title && <p className="mt-1 text-sm font-bold">{r.title}</p>}
                    <p className="mt-0.5 line-clamp-2 text-sm text-paperDim">{r.text}</p>
                    {dates && <p className="mt-0.5 text-xs text-paperDim">{dates}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
