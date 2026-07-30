"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { PageLoader } from "@/components/PageLoader";
import { SectionTitle } from "@/components/SectionTitle";
import { Spinner } from "@/components/Spinner";
import { withAt, withoutAt } from "@/lib/handle";
import { useStore } from "@/lib/store";
import type { ApiBookOfMonthMember, ApiBookOfMonthMembers, ApiClubBookOfMonthDetail } from "@/lib/types";
import { apiErrorMessage } from "@/lib/apiError";

const NOTICE_SEEN_KEY = "bookly:buddyReadNoticeSeen";

function MemberRow({ member, me }: { member: ApiBookOfMonthMember; me: string }) {
  const isMe = member.user === me;
  const href = isMe ? "/profile" : `/u/${withoutAt(member.user)}`;
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foil focus-visible:ring-offset-2 focus-visible:ring-offset-card"
    >
      <Avatar user={member.user} avatarIndex={member.avatar} avatarUrl={member.avatarUrl} size={28} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between text-xs">
          <span className="truncate font-bold">{isMe ? `${member.user} (você)` : member.user}</span>
          <span className="ml-2 shrink-0 text-paperDim">{member.percent}%</span>
        </p>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-card2">
          <div
            className={`h-full rounded-full ${isMe ? "bg-ribbon" : "bg-foil/70"}`}
            style={{ width: `${member.percent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

export default function BookOfMonthMembersPage({ params }: { params: { id: string } }) {
  const username = useStore((s) => s.user.username);
  const showToast = useStore((s) => s.showToast);
  const me = withAt(username);

  const [detail, setDetail] = useState<ApiClubBookOfMonthDetail | null>(null);
  const [data, setData] = useState<ApiBookOfMonthMembers | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound" | "error">("loading");
  const [addingShelf, setAddingShelf] = useState(false);

  const load = useCallback(() => {
    setStatus((s) => (s === "ok" ? s : "loading"));
    Promise.all([
      fetch(`/api/clubs/${params.id}/book-of-month`),
      fetch(`/api/clubs/${params.id}/book-of-month/members`),
    ])
      .then(async ([detailRes, membersRes]) => {
        if (!detailRes.ok || membersRes.status === 404) {
          setStatus("notfound");
          return;
        }
        if (!membersRes.ok) {
          setStatus("error");
          return;
        }
        setDetail(await detailRes.json());
        setData(await membersRes.json());
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addToShelf(bookId: string) {
    if (addingShelf) return;
    setAddingShelf(true);
    try {
      const res = await fetch(`/api/books/${bookId}/shelf`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "WANT_TO_READ" }),
      });
      if (!res.ok) {
        showToast(await apiErrorMessage(res, "Não foi possível adicionar à estante"));
        return;
      }
      const seenNotice = typeof window !== "undefined" && localStorage.getItem(NOTICE_SEEN_KEY);
      if (!seenNotice) {
        localStorage.setItem(NOTICE_SEEN_KEY, "1");
        showToast("Seu progresso fica visível pros membros do clube enquanto durar o livro do mês.");
      } else {
        showToast("Adicionado à estante");
      }
      load();
    } finally {
      setAddingShelf(false);
    }
  }

  if (status === "notfound") {
    return (
      <div className="pt-4">
        <BackHeader />
        <p className="mt-10 text-center text-paperDim">Este clube ainda não tem um livro do mês.</p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="pt-4">
        <BackHeader />
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-paperDim">Não foi possível carregar o progresso. Tente de novo.</p>
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-bold text-paper hover:border-foil/50"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }
  if (status === "loading" || !detail?.bookOfMonth || !data) {
    return (
      <div className="pt-4">
        <BackHeader />
        <PageLoader />
      </div>
    );
  }

  const { book } = detail.bookOfMonth;

  return (
    <div className="pb-4 pt-4">
      <BackHeader>
        <h1 className="font-display text-lg font-bold">Progresso dos membros</h1>
      </BackHeader>

      <Link
        href={`/book/${book.id}`}
        className="mt-4 flex items-center gap-4 rounded-2xl border border-line bg-card p-4 transition-colors hover:bg-card2"
      >
        <BookCover book={book} width={48} />
        <div className="min-w-0">
          <p className="truncate font-display text-base font-bold">{book.title}</p>
          <p className="truncate text-sm text-paperDim">{book.authors}</p>
        </div>
      </Link>

      {!detail.mine && (
        <button
          type="button"
          onClick={() => addToShelf(book.id)}
          disabled={addingShelf}
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm font-bold text-paper transition-colors hover:border-foil/50 disabled:opacity-60"
        >
          {addingShelf ? <Spinner size={16} className="text-paper" /> : "Adicionar à minha estante"}
        </button>
      )}

      <section className="mt-6">
        <SectionTitle>Terminaram ({data.finished.length})</SectionTitle>
        <div className="mt-3 flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-4">
          {data.finished.length === 0 ? (
            <p className="text-sm text-paperDim">Ninguém terminou ainda.</p>
          ) : (
            data.finished.map((m) => <MemberRow key={m.userId} member={m} me={me} />)
          )}
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle>Lendo ({data.reading.length})</SectionTitle>
        <div className="mt-3 flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-4">
          {data.reading.length === 0 ? (
            <p className="text-sm text-paperDim">Ninguém está lendo ainda.</p>
          ) : (
            data.reading.map((m) => <MemberRow key={m.userId} member={m} me={me} />)
          )}
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle>Ainda não começaram</SectionTitle>
        <div className="mt-3 rounded-2xl border border-line bg-card p-4">
          <p className="text-sm text-paperDim">
            {data.notStartedCount === 0
              ? "Todo mundo já começou!"
              : `${data.notStartedCount} de ${data.totalMembers} ${
                  data.notStartedCount === 1 ? "membro ainda não começou" : "membros ainda não começaram"
                } a ler.`}
          </p>
        </div>
      </section>
    </div>
  );
}
