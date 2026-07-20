"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useState } from "react";
import { getBook } from "@/data/books";
import { MOCK_USERS } from "@/data/users";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { SectionTitle } from "@/components/SectionTitle";
import { useStore } from "@/lib/store";

export default function ClubPage({ params }: { params: { id: string } }) {
  const club = useStore((s) => s.clubs.find((c) => c.id === params.id));
  const username = useStore((s) => s.user.username);
  const toggleClub = useStore((s) => s.toggleClub);
  const postToClub = useStore((s) => s.postToClub);
  const showToast = useStore((s) => s.showToast);

  const [draft, setDraft] = useState("");

  if (!club) notFound();

  const book = getBook(club.bookId);
  const previewMembers = Object.keys(MOCK_USERS).slice(0, 4);
  const extraMembers = Math.max(0, club.members - previewMembers.length);

  function handleToggle() {
    const { joined } = toggleClub(club!.id);
    showToast(joined ? "Você entrou no clube! 🎉" : "Você saiu do clube");
  }

  function publish() {
    const text = draft.trim();
    if (!text) return;
    postToClub(club!.id, text);
    setDraft("");
    showToast("Publicado no mural!");
  }

  return (
    <div className="px-5 pt-4">
      <BackHeader />

      <section className="mt-2 flex flex-col items-center text-center">
        <h1 className="font-display text-2xl font-bold">{club.name}</h1>
        <p className="mt-2 max-w-72 text-sm text-paperDim">{club.desc}</p>

        <div className="mt-4 flex items-center">
          {previewMembers.map((user, i) => (
            <span key={user} className={i > 0 ? "-ml-2.5" : ""}>
              <Avatar user={user} size={32} className="ring-2 ring-leather" />
            </span>
          ))}
          <span className="-ml-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-card2 text-[10px] font-bold text-paperDim ring-2 ring-leather">
            +{extraMembers}
          </span>
          <span className="ml-3 text-xs text-paperDim">{club.members} membros</span>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          className={`mt-5 w-full rounded-xl px-5 py-3 font-bold transition-colors ${
            club.joined
              ? "border border-line bg-card text-paperDim hover:text-paper"
              : "bg-foil text-leather hover:opacity-90"
          }`}
        >
          {club.joined ? "Sair do clube" : "Participar do clube"}
        </button>
      </section>

      {book && (
        <section className="mt-7">
          <SectionTitle>Lendo agora</SectionTitle>
          <Link
            href={`/book/${book.id}`}
            className="mt-3 flex items-center gap-4 rounded-2xl border border-line bg-card p-4 transition-colors hover:bg-card2"
          >
            <BookCover book={book} width={56} />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold">{book.title}</p>
              <p className="truncate text-sm text-paperDim">
                {book.authors} · {book.pages} pág.
              </p>
            </div>
          </Link>
        </section>
      )}

      <section className="mt-7">
        <SectionTitle>Mural</SectionTitle>

        {club.joined && (
          <div className="mt-3 flex items-center gap-2">
            <Avatar user={`@${username}`} size={30} />
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") publish();
              }}
              placeholder="Escreva para o clube…"
              aria-label="Publicar no mural"
              className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
            />
            <button
              type="button"
              onClick={publish}
              disabled={!draft.trim()}
              className="rounded-full bg-foil px-3.5 py-2.5 text-xs font-bold text-leather disabled:opacity-40"
            >
              Publicar
            </button>
          </div>
        )}

        <div className="mt-3 flex flex-col">
          {[...club.feed].reverse().map((post, i) => (
            <div key={i} className="flex gap-3 border-b border-line py-3.5">
              <Avatar user={post.user} size={32} />
              <div className="min-w-0">
                <p className="text-sm font-bold">{post.user}</p>
                <p className="mt-0.5 text-sm text-paperDim">{post.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
