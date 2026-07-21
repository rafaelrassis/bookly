"use client";

import Link from "next/link";
import { useState } from "react";
import { getBook } from "@/data/books";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { Stars } from "@/components/Stars";
import { useStore } from "@/lib/store";
import type { FeedReview } from "@/lib/types";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.5s-7.2-4.5-9.7-8.3C.4 9.2 2.2 5.5 5.8 5.5c2.1 0 3.4 1.1 4.2 2.3.8-1.2 2.1-2.3 4.2-2.3 3.6 0 5.4 3.7 3.5 6.7-2.5 3.8-9.7 8.3-9.7 8.3z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5c0 4.2-4 7.5-9 7.5-1.1 0-2.2-.16-3.2-.46L3 20l1.6-3.8C3.6 14.9 3 13.3 3 11.5 3 7.3 7 4 12 4s9 3.3 9 7.5z" />
    </svg>
  );
}

/** Post do feed em formato timeline: curtir, comentar e thread inline. */
export function FeedPost({ review }: { review: FeedReview }) {
  const liked = useStore((s) => Boolean(s.user.likedReviews[review.id]));
  const toggleLike = useStore((s) => s.toggleLike);
  const addComment = useStore((s) => s.addComment);
  const showToast = useStore((s) => s.showToast);
  const username = useStore((s) => s.user.username);

  const [threadOpen, setThreadOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const book = getBook(review.bookId);
  if (!book) return null;

  function publishComment() {
    const text = draft.trim();
    if (!text) return;
    addComment(review.id, text);
    setDraft("");
    showToast("Comentário publicado!");
  }

  return (
    <article className="border-b border-line py-4">
      <div className="flex gap-3">
        <Link href={`/u/${review.user.replace("@", "")}`} aria-label={review.user} className="rounded-full">
          <Avatar user={review.user} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug">
            <Link href={`/u/${review.user.replace("@", "")}`} className="font-bold hover:text-foil">
              {review.user}
            </Link>{" "}
            <span className="text-paperDim">avaliou</span>{" "}
            <Link
              href={`/book/${book.id}`}
              className="font-display font-bold italic hover:text-foil"
            >
              {book.title}
            </Link>{" "}
            <span className="text-paperDim">·</span>{" "}
            <Stars rating={review.rating} className="text-xs" />
          </p>
          <Link href={`/review/${review.id}`} className="mt-1.5 block">
            {review.title && (
              <span className="block font-display text-base font-bold leading-snug text-paper">
                {review.title}
              </span>
            )}
            <span className="mt-0.5 block text-sm text-paperDim line-clamp-3 hover:text-paper/90">
              {review.text}
            </span>
          </Link>

          <div className="mt-2.5 flex items-center gap-5 text-xs text-paperDim">
            <button
              type="button"
              onClick={() => toggleLike(review.id)}
              aria-pressed={liked}
              aria-label={liked ? "Remover curtida" : "Curtir review"}
              className={`flex items-center gap-1.5 rounded-full py-1 transition-colors ${
                liked ? "text-ribbon" : "hover:text-paper"
              }`}
            >
              <HeartIcon filled={liked} />
              {review.likes}
            </button>
            <button
              type="button"
              onClick={() => setThreadOpen((o) => !o)}
              aria-expanded={threadOpen}
              className="flex items-center gap-1.5 rounded-full py-1 transition-colors hover:text-paper"
            >
              <CommentIcon />
              {review.comments.length}
            </button>
          </div>
        </div>
        <Link href={`/book/${book.id}`} aria-label={book.title} className="self-start rounded-md">
          <BookCover book={book} width={48} />
        </Link>
      </div>

      {threadOpen && (
        <div className="ml-12 mt-3 flex flex-col gap-3">
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
          <div className="flex items-center gap-2">
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
        </div>
      )}
    </article>
  );
}
