"use client";

import Link from "next/link";
import { useState } from "react";
import { notFound } from "next/navigation";
import { getBook } from "@/data/books";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { Stars } from "@/components/Stars";
import { readingDates } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function ReviewPage({ params }: { params: { id: string } }) {
  const review = useStore((s) => s.feed.find((r) => r.id === params.id));
  const liked = useStore((s) => Boolean(s.user.likedReviews[params.id]));
  const username = useStore((s) => s.user.username);
  const toggleLike = useStore((s) => s.toggleLike);
  const addComment = useStore((s) => s.addComment);
  const showToast = useStore((s) => s.showToast);
  const [draft, setDraft] = useState("");

  if (!review) notFound();
  const book = getBook(review.bookId);
  if (!book) notFound();

  const profileHref = `/u/${review.user.replace("@", "")}`;
  const dates = readingDates(review.startedAt, review.finishedAt);

  function publishComment() {
    const text = draft.trim();
    if (!text) return;
    addComment(review!.id, text);
    setDraft("");
    showToast("Comentário publicado!");
  }

  return (
    <div className="px-5 pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Resenha</h1>
      </BackHeader>

      <article className="mt-4">
        <div className="flex items-center gap-3">
          <Link href={profileHref} aria-label={review.user} className="rounded-full">
            <Avatar user={review.user} />
          </Link>
          <div className="min-w-0">
            <Link href={profileHref} className="text-sm font-bold hover:text-foil">
              {review.user}
            </Link>
            <p className="text-xs text-paperDim">
              avaliou <span className="font-display font-bold italic">{book.title}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-4">
          <Link href={`/book/${book.id}`} aria-label={book.title} className="rounded-md">
            <BookCover book={book} width={72} />
          </Link>
          <div className="min-w-0">
            <Stars rating={review.rating} className="text-sm" />
            {review.title && (
              <h2 className="mt-2 font-display text-xl font-bold leading-snug">{review.title}</h2>
            )}
            {dates && <p className="mt-1 text-xs text-paperDim">{dates}</p>}
          </div>
        </div>

        <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-paper">
          {review.text}
        </p>

        <div className="mt-5 flex items-center gap-5 border-y border-line py-3 text-sm text-paperDim">
          <button
            type="button"
            onClick={() => toggleLike(review!.id)}
            aria-pressed={liked}
            className={`transition-colors ${liked ? "text-ribbon" : "hover:text-paper"}`}
          >
            ♥ {review.likes}
          </button>
          <span>{review.comments.length} comentários</span>
        </div>
      </article>

      <section className="mt-4 flex flex-col gap-3 pb-8">
        {review.comments.map((comment, i) => (
          <div key={i} className="flex gap-2.5">
            <Link href={`/u/${comment.user.replace("@", "")}`} aria-label={comment.user}>
              <Avatar user={comment.user} size={26} />
            </Link>
            <p className="min-w-0 text-sm text-paperDim">
              <Link
                href={`/u/${comment.user.replace("@", "")}`}
                className="font-bold text-paper hover:text-foil"
              >
                {comment.user}
              </Link>{" "}
              {comment.text}
            </p>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-2">
          <Avatar user={`@${username}`} size={26} />
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") publishComment();
            }}
            placeholder="Adicione um comentário…"
            aria-label="Escrever comentário"
            className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2 text-sm text-paper placeholder:text-paperDim/60"
          />
          <button
            type="button"
            onClick={publishComment}
            disabled={!draft.trim()}
            className="rounded-full bg-foil px-3.5 py-2 text-xs font-bold text-leather disabled:opacity-40"
          >
            Publicar
          </button>
        </div>
      </section>
    </div>
  );
}
