"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPublicProfile } from "@/data/users";
import { getBook } from "@/data/books";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { Stars } from "@/components/Stars";
import { SectionTitle } from "@/components/SectionTitle";
import { withAt } from "@/lib/handle";
import { useStore } from "@/lib/store";

export default function PublicProfilePage({ params }: { params: { username: string } }) {
  const handle = withAt(decodeURIComponent(params.username));
  const profile = getPublicProfile(handle);

  const myUsername = useStore((s) => s.user.username);
  const followed = useStore((s) => s.followedUsers);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();

  const isMe = handle === withAt(myUsername);

  useEffect(() => {
    if (isMe) router.replace("/profile");
  }, [isMe, router]);

  if (isMe) return null;

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
          { label: "lidos", value: String(profile.readIds.length) },
          { label: "reviews", value: String(profile.reviews.length) },
          { label: "seguidores", value: String(profile.followers) },
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

      <section className="mt-7 pb-8">
        <SectionTitle>Reviews</SectionTitle>
        {profile.reviews.length === 0 ? (
          <p className="mt-3 text-sm text-paperDim">Nenhuma review ainda.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {profile.reviews.map((review) => {
              const book = getBook(review.bookId);
              if (!book) return null;
              return (
                <Link
                  key={review.bookId}
                  href={`/book/${book.id}`}
                  className="flex gap-3.5 rounded-2xl border border-line bg-card p-3.5 transition-colors hover:bg-card2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foil focus-visible:ring-offset-2 focus-visible:ring-offset-leather"
                >
                  <BookCover book={book} width={48} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold">{book.title}</p>
                    <Stars rating={review.rating} className="text-xs" />
                    {review.title && <p className="mt-1 text-sm font-bold">{review.title}</p>}
                    <p className="mt-0.5 line-clamp-2 text-sm text-paperDim">{review.text}</p>
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
