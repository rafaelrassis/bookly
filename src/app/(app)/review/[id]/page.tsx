"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { getBook } from "@/data/books";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { Stars } from "@/components/Stars";
import { withAt, withoutAt } from "@/lib/handle";
import { readingDates } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useMyMockReview } from "@/lib/store/hooks";
import type { ApiComment, ApiReview } from "@/lib/types";

/** Visualização somente-leitura da própria review ainda não publicada de
 * verdade ("me-<bookId>" — autoria de review é Spec 3a, fora do escopo
 * desta fatia). Curtir/comentar aqui só existe para reviews reais. */
function MyMockReviewPage({ id }: { id: string }) {
  const review = useMyMockReview(id);

  if (!review) notFound();
  const book = getBook(review.bookId);
  if (!book) notFound();

  const profileHref = `/u/${withoutAt(review.user)}`;
  const dates = readingDates(review.startedAt, review.finishedAt);

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
          <span>♥ {review.likes}</span>
          <span>{review.comments.length} comentários</span>
        </div>
      </article>

      <section className="mt-4 flex flex-col gap-3 pb-8">
        {review.comments.map((comment, i) => (
          <div key={i} className="flex gap-2.5">
            <Link href={`/u/${withoutAt(comment.user)}`} aria-label={comment.user}>
              <Avatar user={comment.user} size={26} />
            </Link>
            <p className="min-w-0 text-sm text-paperDim">
              <Link
                href={`/u/${withoutAt(comment.user)}`}
                className="font-bold text-paper hover:text-foil"
              >
                {comment.user}
              </Link>{" "}
              {comment.text}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

/** Post de uma review real (Spec 3b): dados vêm da API, curtir/comentar são reais. */
function RealReviewPage({ id }: { id: string }) {
  const username = useStore((s) => s.user.username);
  const showToast = useStore((s) => s.showToast);

  const [review, setReview] = useState<ApiReview | null | undefined>(undefined);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    fetch(`/api/reviews/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ApiReview | null) => {
        setReview(data);
        if (data) {
          setLiked(data.likedByMe);
          setLikeCount(data.likes);
        }
      });
    fetch(`/api/reviews/${id}/comments`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setComments(data.items ?? []));
  }, [id]);

  if (review === null) notFound();
  if (review === undefined) return null;

  const book = review.book;
  const authorHandle = withAt(review.user.username);
  const dates = readingDates(review.startedAt, review.finishedAt);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const res = await fetch(`/api/reviews/${id}/like`, { method: next ? "POST" : "DELETE" });
    if (!res.ok) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  async function publishComment() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const res = await fetch(`/api/reviews/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      showToast("Não foi possível comentar");
      return;
    }
    const comment: ApiComment = await res.json();
    setComments((current) => [...current, comment]);
    showToast("Comentário publicado!");
  }

  return (
    <div className="px-5 pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Resenha</h1>
      </BackHeader>

      <article className="mt-4">
        <div className="flex items-center gap-3">
          <Link href={`/u/${review.user.username}`} aria-label={authorHandle} className="rounded-full">
            <Avatar user={authorHandle} avatarIndex={review.user.avatar} />
          </Link>
          <div className="min-w-0">
            <Link href={`/u/${review.user.username}`} className="text-sm font-bold hover:text-foil">
              {authorHandle}
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
            onClick={toggleLike}
            aria-pressed={liked}
            className={`transition-colors ${liked ? "text-ribbon" : "hover:text-paper"}`}
          >
            ♥ {likeCount}
          </button>
          <span>{comments.length} comentários</span>
        </div>
      </article>

      <section className="mt-4 flex flex-col gap-3 pb-8">
        {comments.map((comment) => {
          const handle = withAt(comment.user.username);
          return (
            <div key={comment.id} className="flex gap-2.5">
              <Link href={`/u/${comment.user.username}`} aria-label={handle}>
                <Avatar user={handle} avatarIndex={comment.user.avatar} size={26} />
              </Link>
              <p className="min-w-0 text-sm text-paperDim">
                <Link
                  href={`/u/${comment.user.username}`}
                  className="font-bold text-paper hover:text-foil"
                >
                  {handle}
                </Link>{" "}
                {comment.text}
              </p>
            </div>
          );
        })}
        <div className="mt-1 flex items-center gap-2">
          <Avatar user={withAt(username)} size={26} />
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

export default function ReviewPage({ params }: { params: { id: string } }) {
  if (params.id.startsWith("me-")) return <MyMockReviewPage id={params.id} />;
  return <RealReviewPage id={params.id} />;
}
