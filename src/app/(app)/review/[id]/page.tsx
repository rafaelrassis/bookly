"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { Stars } from "@/components/Stars";
import { withAt } from "@/lib/handle";
import { readingDates } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ApiComment, ApiReview } from "@/lib/types";

export default function ReviewPage({ params }: { params: { id: string } }) {
  const username = useStore((s) => s.user.username);
  const showToast = useStore((s) => s.showToast);

  const [status, setStatus] = useState<"loading" | "ok" | "notfound">("loading");
  const [review, setReview] = useState<ApiReview | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    fetch(`/api/reviews/${params.id}`).then(async (res) => {
      if (res.status === 404) {
        setStatus("notfound");
        return;
      }
      if (!res.ok) return;
      const data: ApiReview = await res.json();
      setReview(data);
      setLiked(data.likedByMe);
      setLikeCount(data.likes);
      setStatus("ok");
    });
    fetch(`/api/reviews/${params.id}/comments`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setComments(data.items ?? []));
  }, [params.id]);

  if (status === "notfound") notFound();
  if (status === "loading" || !review) return null;

  const profileHref = `/u/${review.user.username}`;
  const authorHandle = withAt(review.user.username);
  const dates = readingDates(review.startedAt, review.finishedAt);

  async function toggleLike() {
    if (likeBusy) return;
    setLikeBusy(true);
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const res = await fetch(`/api/reviews/${review!.id}/like`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    } finally {
      setLikeBusy(false);
    }
  }

  async function publishComment() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const res = await fetch(`/api/reviews/${review!.id}/comments`, {
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
          <Link href={profileHref} aria-label={authorHandle} className="rounded-full">
            <Avatar user={authorHandle} avatarIndex={review.user.avatar} />
          </Link>
          <div className="min-w-0">
            <Link href={profileHref} className="text-sm font-bold hover:text-foil">
              {authorHandle}
            </Link>
            <p className="text-xs text-paperDim">
              avaliou <span className="font-display font-bold italic">{review.book.title}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-4">
          <Link href={`/book/${review.book.id}`} aria-label={review.book.title} className="rounded-md">
            <BookCover book={review.book} width={72} />
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
            disabled={likeBusy}
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
