"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { ShareIcon } from "@/components/icons";
import { Spinner } from "@/components/Spinner";
import { withAt } from "@/lib/handle";
import { useStore } from "@/lib/store";
import type { ApiQuote } from "@/lib/types";
import CitacaoLoading from "./loading";

export function CitacaoPageClient({ params }: { params: { id: string } }) {
  const showToast = useStore((s) => s.showToast);

  const [status, setStatus] = useState<"loading" | "ok" | "notfound" | "error">("loading");
  const [quote, setQuote] = useState<ApiQuote | null>(null);
  const [sharing, setSharing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/quotes/${params.id}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setStatus("notfound");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const data: ApiQuote = await res.json();
        setQuote(data);
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, retryCount]);

  if (status === "notfound") notFound();

  if (status === "error") {
    return (
      <div className="px-5 pt-4">
        <BackHeader>
          <h1 className="text-lg font-extrabold">Citação</h1>
        </BackHeader>
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-paperDim">Não foi possível carregar a citação. Tente de novo.</p>
          <button
            type="button"
            onClick={() => setRetryCount((n) => n + 1)}
            className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-bold text-paper hover:border-foil/50"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (status === "loading" || !quote) return <CitacaoLoading />;

  const authorHandle = withAt(quote.user.username);

  async function handleShare() {
    if (!quote || sharing) return;
    setSharing(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/card`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const file = new File([blob], "citacao-bookly.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "citacao-bookly.png";
      a.click();
      URL.revokeObjectURL(url);
      showToast("Imagem baixada");
    } catch {
      showToast("Não foi possível gerar o card. Tente de novo.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="px-5 pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Citação</h1>
      </BackHeader>

      <article className="mt-4">
        <div className="flex items-center gap-3">
          <Link href={`/u/${quote.user.username}`} aria-label={authorHandle} className="rounded-full">
            <Avatar user={authorHandle} avatarIndex={quote.user.avatar} avatarUrl={quote.user.avatarUrl} />
          </Link>
          <div className="min-w-0">
            <Link href={`/u/${quote.user.username}`} className="text-sm font-bold hover:text-foil">
              {authorHandle}
            </Link>
            <p className="text-xs text-paperDim">
              destacou <span className="font-display font-bold italic">{quote.book.title}</span>
            </p>
          </div>
        </div>

        <blockquote className="mt-5 rounded-2xl border border-foil/40 bg-card p-5 font-display text-lg italic leading-relaxed text-paper">
          “{quote.text}”
          {quote.page !== undefined && (
            <footer className="mt-3 text-right font-sans text-xs not-italic text-paperDim">
              — pág. {quote.page}
            </footer>
          )}
        </blockquote>

        <Link
          href={`/book/${quote.book.id}`}
          className="mt-4 flex items-center gap-3.5 rounded-2xl border border-line bg-card p-3.5 transition-colors hover:bg-card2"
        >
          <BookCover book={quote.book} width={48} />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold">{quote.book.title}</p>
            <p className="text-xs text-paperDim">{quote.book.authors}</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-foil px-4 py-3 text-sm font-bold text-leather transition-opacity disabled:opacity-60"
        >
          {sharing ? <Spinner size={16} className="text-leather" /> : <ShareIcon size={16} />}
          Compartilhar card
        </button>
      </article>
    </div>
  );
}
