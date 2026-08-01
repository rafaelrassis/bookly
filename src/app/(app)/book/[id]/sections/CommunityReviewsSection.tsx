import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ExpandableText } from "@/components/ExpandableText";
import { Section } from "@/components/ui/Section";
import { Stars } from "@/components/Stars";
import { readingDates } from "@/lib/format";
import type { ShelfEntry } from "@/lib/types";

export type CommunityReview = {
  id: string;
  user: { username: string; name: string; avatar: number; avatarUrl: string | null };
  rating: number;
  title?: string;
  text: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type Props = {
  username: string;
  rating: number | null;
  myReviewTitle: string | null;
  myReview: string | null;
  entry: ShelfEntry | null;
  reviews: CommunityReview[];
  cursor: string | null;
  onLoadMore: (cursor: string) => void;
};

export function CommunityReviewsSection({
  username,
  rating,
  myReviewTitle,
  myReview,
  entry,
  reviews,
  cursor,
  onLoadMore,
}: Props) {
  return (
    <Section title="Reviews da comunidade">
      <div className="flex flex-col gap-3">
        {myReview && (
          <article className="rounded-2xl border border-foil/40 bg-card p-4">
            <p className="text-sm font-bold">
              @{username} <span className="font-medium text-foil">(você)</span>
            </p>
            {rating !== null && <Stars rating={rating} className="text-xs" />}
            {readingDates(entry?.startedAt ?? undefined, entry?.finishedAt ?? undefined) && (
              <p className="mt-1 text-xs text-paperMuted">
                {readingDates(entry?.startedAt ?? undefined, entry?.finishedAt ?? undefined)}
              </p>
            )}
            {myReviewTitle && <p className="mt-1.5 text-sm font-bold">{myReviewTitle}</p>}
            <ExpandableText text={myReview} className="mt-1 text-sm text-paperMuted" />
          </article>
        )}
        {reviews.length === 0 && !myReview && (
          <p className="text-sm text-paperMuted">
            Ainda não há reviews por aqui. Seja a primeira pessoa a avaliar!
          </p>
        )}
        {reviews.map((review) => (
          <Link
            key={review.id}
            href={`/review/${review.id}`}
            className="block rounded-2xl border border-line bg-card p-4 transition-colors hover:bg-card2"
          >
            <div className="flex items-center gap-2.5">
              <Avatar
                user={`@${review.user.username}`}
                avatarIndex={review.user.avatar}
                avatarUrl={review.user.avatarUrl}
                size={28}
              />
              <div>
                <p className="text-sm font-bold">{review.user.name}</p>
                <Stars rating={review.rating} className="text-xs" />
              </div>
            </div>
            {readingDates(review.startedAt ?? undefined, review.finishedAt ?? undefined) && (
              <p className="mt-1 text-xs text-paperMuted">
                {readingDates(review.startedAt ?? undefined, review.finishedAt ?? undefined)}
              </p>
            )}
            {review.title && <p className="mt-1.5 text-sm font-bold">{review.title}</p>}
            <p className="mt-1 line-clamp-3 text-sm text-paperMuted">{review.text}</p>
          </Link>
        ))}
        {cursor && (
          <button
            type="button"
            onClick={() => onLoadMore(cursor)}
            className="min-h-tap rounded-xl border border-line bg-card px-4 text-sm font-bold text-paperMuted hover:text-paper"
          >
            Carregar mais
          </button>
        )}
      </div>
    </Section>
  );
}
