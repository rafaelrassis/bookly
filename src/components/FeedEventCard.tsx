"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { FeedPost } from "@/components/FeedPost";
import { BookOpenIcon, GiftIcon, GroupIcon } from "@/components/icons";
import { withAt } from "@/lib/handle";
import type { ApiFeedEvent, ApiReview } from "@/lib/types";

/** Aspas Fraunces — ícone do evento de citação, sem SVG. */
function QuoteMark() {
  return (
    <span aria-hidden="true" className="font-display text-lg font-bold leading-none text-foil">
      &ldquo;
    </span>
  );
}

/** Post simples (sem curtir/comentar) pros eventos que não são review:
 * livro terminado, doação criada, entrada em clube, citação. */
function SimpleEventPost({
  event,
  icon,
  text,
  href,
  children,
}: {
  event: ApiFeedEvent;
  icon: React.ReactNode;
  text: React.ReactNode;
  href: string;
  children?: React.ReactNode;
}) {
  const authorHandle = withAt(event.user.username);
  return (
    <article className="border-b border-line py-4">
      <div className="flex gap-3">
        <Link href={`/u/${event.user.username}`} aria-label={authorHandle} className="rounded-full">
          <Avatar user={authorHandle} avatarIndex={event.user.avatar} avatarUrl={event.user.avatarUrl} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm leading-snug text-paperDim">
            <span className="shrink-0 text-foil">{icon}</span>
            {text}
          </p>
          <Link href={href} className="mt-1.5 block rounded-lg">
            {children}
          </Link>
        </div>
        {event.book && (
          <Link href={`/book/${event.book.id}`} aria-label={event.book.title} className="self-start rounded-md">
            <BookCover book={event.book} width={48} />
          </Link>
        )}
      </div>
    </article>
  );
}

/** Card do feed unificado (stream) — troca o conteúdo conforme `event.type`. */
export function FeedEventCard({ event }: { event: ApiFeedEvent }) {
  const authorHandle = withAt(event.user.username);

  if (event.type === "REVIEW" && event.review && event.book) {
    const review: ApiReview = { ...event.review, book: event.book, user: event.user };
    return <FeedPost review={review} />;
  }

  if (event.type === "BOOK_FINISHED" && event.book) {
    return (
      <SimpleEventPost
        event={event}
        icon={<BookOpenIcon size={16} />}
        href={`/book/${event.book.id}`}
        text={
          <>
            <Link href={`/u/${event.user.username}`} className="font-bold text-paper hover:text-foil">
              {authorHandle}
            </Link>{" "}
            terminou de ler{" "}
            <span className="font-display font-bold italic text-paper">{event.book.title}</span>
          </>
        }
      />
    );
  }

  if (event.type === "DONATION_CREATED" && event.book) {
    return (
      <SimpleEventPost
        event={event}
        icon={<GiftIcon size={16} />}
        href={`/book/${event.book.id}`}
        text={
          <>
            <Link href={`/u/${event.user.username}`} className="font-bold text-paper hover:text-foil">
              {authorHandle}
            </Link>{" "}
            colocou{" "}
            <span className="font-display font-bold italic text-paper">{event.book.title}</span> pra doar
          </>
        }
      />
    );
  }

  if (event.type === "CLUB_JOINED" && event.club) {
    return (
      <SimpleEventPost
        event={event}
        icon={<GroupIcon size={16} />}
        href={`/clubs/${event.club.id}`}
        text={
          <>
            <Link href={`/u/${event.user.username}`} className="font-bold text-paper hover:text-foil">
              {authorHandle}
            </Link>{" "}
            entrou no clube{" "}
            <span className="font-display font-bold italic text-paper">{event.club.name}</span>
          </>
        }
      />
    );
  }

  if (event.type === "HIGHLIGHT" && event.highlight && event.book) {
    return (
      <SimpleEventPost
        event={event}
        icon={<QuoteMark />}
        href={`/book/${event.book.id}`}
        text={
          <>
            <Link href={`/u/${event.user.username}`} className="font-bold text-paper hover:text-foil">
              {authorHandle}
            </Link>{" "}
            destacou uma citação de{" "}
            <span className="font-display font-bold italic text-paper">{event.book.title}</span>
          </>
        }
      >
        <span className="mt-0.5 block font-display text-sm italic leading-snug text-paperDim line-clamp-3">
          &ldquo;{event.highlight.text}&rdquo;
        </span>
      </SimpleEventPost>
    );
  }

  return null;
}
