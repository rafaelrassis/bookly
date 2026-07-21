"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useRef, useState } from "react";
import { getBook } from "@/data/books";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { CopyIcon, LockIcon } from "@/components/icons";
import { SectionTitle } from "@/components/SectionTitle";
import { readingPercent } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ClubMessage } from "@/lib/types";

/** Destaca menções (@usuario) em foil dentro do texto da bolha. */
function MentionText({ text }: { text: string }) {
  const parts = text.split(/(@[\w.\-á-úà-ùâ-ûã-õç]+)/gi);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="font-bold text-foil">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function Bubble({
  message,
  own,
  onReply,
}: {
  message: ClubMessage;
  own: boolean;
  onReply: (m: ClubMessage) => void;
}) {
  if (message.system) {
    return (
      <p className="my-1 text-center text-xs text-paperDim">
        <MentionText text={message.text} />
      </p>
    );
  }

  return (
    <div className={`flex gap-2.5 ${own ? "flex-row-reverse" : ""}`}>
      {!own && <Avatar user={message.user} size={30} className="mt-0.5" />}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
          own ? "border border-foil/40 bg-foil/10" : "bg-card"
        }`}
      >
        <p className="flex items-baseline gap-2 text-xs">
          <span className="font-bold">{own ? "você" : message.user}</span>
          <span className="text-[10px] text-paperDim">{message.time}</span>
        </p>
        {message.replyTo && (
          <p className="mt-1.5 border-l-2 border-foil/60 pl-2 text-xs italic text-paperDim">
            <span className="font-bold not-italic">{message.replyTo.user}</span>{" "}
            {message.replyTo.text.length > 80
              ? `${message.replyTo.text.slice(0, 80)}…`
              : message.replyTo.text}
          </p>
        )}
        <p className="mt-1 text-sm">
          <MentionText text={message.text} />
        </p>
        <button
          type="button"
          onClick={() => onReply(message)}
          className="mt-1 text-[10px] font-bold text-paperDim hover:text-foil"
        >
          Responder
        </button>
      </div>
    </div>
  );
}

export default function ClubPage({ params }: { params: { id: string } }) {
  const club = useStore((s) => s.clubs.find((c) => c.id === params.id));
  const user = useStore((s) => s.user);
  const toggleClub = useStore((s) => s.toggleClub);
  const postToClub = useStore((s) => s.postToClub);
  const showToast = useStore((s) => s.showToast);

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ClubMessage | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!club) notFound();

  const book = getBook(club.bookId);
  const me = `@${user.username}`;

  // membros conhecidos: progresso mocado + usuário logado com progresso real
  const myEntry = user.shelf[club.bookId];
  const myPercent =
    book && myEntry?.currentPage !== undefined
      ? readingPercent(myEntry.currentPage, book.pages)
      : myEntry?.status === "READ"
        ? 100
        : 0;
  const memberRows: { user: string; percent: number }[] = [
    ...(club.joined ? [{ user: me, percent: myPercent }] : []),
    ...Object.entries(club.memberProgress).map(([u, percent]) => ({ user: u, percent })),
  ];
  const extraMembers = Math.max(0, club.members - memberRows.length);

  // sugestões de menção ao digitar @
  const mentionMatch = draft.match(/@([\w.\-]*)$/);
  const mentionables = Object.keys(club.memberProgress);
  const suggestions = mentionMatch
    ? mentionables.filter((u) =>
        u.slice(1).toLowerCase().startsWith(mentionMatch[1].toLowerCase())
      )
    : [];

  function applyMention(mention: string) {
    setDraft((d) => d.replace(/@([\w.\-]*)$/, `${mention} `));
    inputRef.current?.focus();
  }

  function handleToggle() {
    const { joined } = toggleClub(club!.id);
    showToast(joined ? "Você entrou no clube! 🎉" : "Você saiu do clube");
  }

  function publish() {
    const text = draft.trim();
    if (!text) return;
    postToClub(
      club!.id,
      text,
      replyTo ? { user: replyTo.user, text: replyTo.text } : undefined
    );
    setDraft("");
    setReplyTo(null);
    showToast("Publicado no mural!");
  }

  async function copyCode() {
    if (!club?.code) return;
    try {
      await navigator.clipboard.writeText(club.code);
      showToast("Código copiado!");
    } catch {
      showToast(`Código: ${club.code}`);
    }
  }

  return (
    <div className="pt-4">
      <BackHeader />

      <section className="mt-2 flex flex-col items-center text-center">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          {club.visibility === "private" && (
            <span className="text-paperDim" aria-label="Clube privado">
              <LockIcon size={16} />
            </span>
          )}
          {club.name}
        </h1>
        <p className="mt-2 max-w-72 text-sm text-paperDim">{club.desc}</p>

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

        {club.visibility === "private" && club.joined && club.code && (
          <div className="mt-3 flex w-full items-center justify-between rounded-2xl border border-foil/40 bg-card px-4 py-3">
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-paperDim">
                Código de convite
              </p>
              <p className="font-mono text-lg font-bold tracking-[0.3em] text-foil">
                {club.code}
              </p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-card2 px-3 py-2 text-xs font-bold text-paper hover:border-foil/50"
            >
              <CopyIcon /> Copiar
            </button>
          </div>
        )}
      </section>

      {book && (
        <section className="mt-6">
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

      <section className="mt-6">
        <SectionTitle>Progresso dos membros</SectionTitle>
        <div className="mt-3 flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-4">
          {memberRows.map(({ user: memberUser, percent }) => (
            <div key={memberUser} className="flex items-center gap-3">
              <Avatar user={memberUser} size={28} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between text-xs">
                  <span className="truncate font-bold">
                    {memberUser === me ? `${memberUser} (você)` : memberUser}
                  </span>
                  <span className="ml-2 shrink-0 text-paperDim">{percent}%</span>
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-card2">
                  <div
                    className={`h-full rounded-full ${memberUser === me ? "bg-ribbon" : "bg-foil/70"}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {extraMembers > 0 && (
            <p className="text-xs text-paperDim">
              +{extraMembers} {extraMembers === 1 ? "outro membro" : "outros membros"}
            </p>
          )}
        </div>
      </section>

      <section className="mb-4 mt-6">
        <SectionTitle>Mural</SectionTitle>

        <div className="mt-3 flex flex-col gap-3">
          {club.feed.map((message) => (
            <Bubble
              key={message.id}
              message={message}
              own={message.user === me && !message.system}
              onReply={(m) => {
                setReplyTo(m);
                inputRef.current?.focus();
              }}
            />
          ))}
          {club.feed.length === 0 && (
            <p className="text-sm text-paperDim">
              Ainda não há mensagens. Comece a conversa!
            </p>
          )}
        </div>

        {club.joined && (
          <div className="mt-4">
            {replyTo && (
              <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border-l-2 border-foil bg-card px-3 py-2 text-xs text-paperDim">
                <p className="min-w-0">
                  Respondendo <span className="font-bold text-paper">{replyTo.user}</span>:{" "}
                  <span className="italic">
                    {replyTo.text.length > 60 ? `${replyTo.text.slice(0, 60)}…` : replyTo.text}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  aria-label="Cancelar resposta"
                  className="shrink-0 text-paperDim hover:text-ribbon"
                >
                  ✕
                </button>
              </div>
            )}
            {suggestions.length > 0 && (
              <div className="mb-2 overflow-hidden rounded-xl border border-line bg-card">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => applyMention(s)}
                    className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left text-sm last:border-b-0 hover:bg-card2"
                  >
                    <Avatar user={s} size={22} />
                    <span className="font-bold text-foil">{s}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Avatar user={me} size={30} />
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && suggestions.length === 0) publish();
                }}
                placeholder="Escreva para o clube… use @ para marcar"
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
          </div>
        )}
      </section>
    </div>
  );
}
