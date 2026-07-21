"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BOOKS, getBook } from "@/data/books";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { CopyIcon, LockIcon } from "@/components/icons";
import { SectionTitle } from "@/components/SectionTitle";
import { withAt, withoutAt } from "@/lib/handle";
import { readingPercent } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ClubMessage } from "@/lib/types";

/** Busca case-insensitive; acentos também são ignorados. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Progresso determinístico para membros mocados sem dado real (evita hidration mismatch). */
function mockProgress(seed: number): number {
  return (seed * 37 + 20) % 101;
}

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

/** Modal com todos os membros e progresso; se for o criador, permite remover membros. */
function MembersModal({
  members,
  isOwner,
  me,
  onClose,
  onRemove,
}: {
  members: { user: string; percent: number; mock: boolean }[];
  isOwner: boolean;
  me: string;
  onClose: () => void;
  onRemove: (user: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Membros do clube"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-leather p-5 sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Membros ({members.length})</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-paperDim hover:text-paper"
          >
            ✕
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {members.map(({ user, percent, mock }) => (
            <div key={user} className="flex items-center gap-3">
              <Avatar user={user} size={30} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between text-xs">
                  <span className="truncate font-bold">
                    {user === me ? `${user} (você)` : user}
                  </span>
                  <span className="ml-2 shrink-0 text-paperDim">{percent}%</span>
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-card2">
                  <div
                    className={`h-full rounded-full ${user === me ? "bg-ribbon" : "bg-foil/70"}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
              {isOwner && user !== me && !mock && (
                <button
                  type="button"
                  onClick={() => onRemove(user)}
                  aria-label={`Remover ${user} do clube`}
                  className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-paperDim hover:text-ribbon"
                >
                  Excluir
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClubPage({ params }: { params: { id: string } }) {
  const club = useStore((s) => s.clubs.find((c) => c.id === params.id));
  const user = useStore((s) => s.user);
  const toggleClub = useStore((s) => s.toggleClub);
  const postToClub = useStore((s) => s.postToClub);
  const updateClub = useStore((s) => s.updateClub);
  const removeClubMember = useStore((s) => s.removeClubMember);
  const showToast = useStore((s) => s.showToast);

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ClubMessage | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [editBookQuery, setEditBookQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ block: "end" });
  }, [club?.feed.length]);

  if (!club) notFound();

  const book = getBook(club.bookId);
  const me = withAt(user.username);
  const isOwner = club.creator === me;

  // membros conhecidos: progresso mocado + usuário logado com progresso real
  const myEntry = user.shelf[club.bookId];
  const myPercent =
    book && typeof myEntry?.currentPage === "number"
      ? readingPercent(myEntry.currentPage, book.pages)
      : myEntry?.status === "READ"
        ? 100
        : 0;
  const memberRows: { user: string; percent: number }[] = [
    ...(club.joined ? [{ user: me, percent: myPercent }] : []),
    ...Object.entries(club.memberProgress).map(([u, percent]) => ({ user: u, percent })),
  ];
  const extraMembers = Math.max(0, club.members - memberRows.length);

  // preenche membros sem dado individual com progresso mocado só para exibição na modal
  const allMembers = [
    ...memberRows.map((m) => ({ ...m, mock: false })),
    ...Array.from({ length: extraMembers }, (_, i) => ({
      user: `@membro-do-clube-${i + 1}`,
      percent: mockProgress(i),
      mock: true,
    })),
  ];

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

  function openEdit() {
    setEditName(club!.name);
    setEditDesc(club!.desc);
    setEditBookId(club!.bookId);
    setEditBookQuery("");
    setEditing(true);
  }

  function saveEdit() {
    const name = editName.trim();
    if (!name || !editBookId) {
      showToast("Preencha nome e livro do clube");
      return;
    }
    updateClub(club!.id, name, editBookId, editDesc.trim());
    setEditing(false);
    showToast("Clube atualizado ✦");
  }

  function removeMember(member: string) {
    removeClubMember(club!.id, member);
    showToast(`${member} removido(a) do clube`);
  }

  const editBookResults = editBookQuery.trim()
    ? BOOKS.filter(
        (b) =>
          normalize(b.title).includes(normalize(editBookQuery)) ||
          normalize(b.authors).includes(normalize(editBookQuery))
      )
    : BOOKS;
  const editSelectedBook = BOOKS.find((b) => b.id === editBookId);

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

        <div className="mt-5 flex w-full gap-2">
          <button
            type="button"
            onClick={handleToggle}
            className={`flex-1 rounded-xl px-5 py-3 font-bold transition-colors ${
              club.joined
                ? "border border-line bg-card text-paperDim hover:text-paper"
                : "bg-foil text-leather hover:opacity-90"
            }`}
          >
            {club.joined ? "Sair do clube" : "Participar do clube"}
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={openEdit}
              className="rounded-xl border border-line bg-card px-4 py-3 font-bold text-paper transition-colors hover:bg-card2"
            >
              Editar
            </button>
          )}
        </div>

        {club.visibility === "private" && isOwner && club.code && (
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

      {editing && isOwner && (
        <section className="mt-5 rounded-2xl border border-foil/40 bg-card p-4">
          <SectionTitle>Editar clube</SectionTitle>
          <div className="mt-3 flex flex-col gap-2.5">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nome do clube"
              aria-label="Nome do clube"
              className="rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              placeholder="Bio do clube"
              aria-label="Bio do clube"
              className="resize-none rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
            />

            {editSelectedBook ? (
              <div className="flex items-center gap-3 rounded-xl border border-foil/40 bg-card2 p-2.5">
                <BookCover book={editSelectedBook} width={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{editSelectedBook.title}</p>
                  <p className="truncate text-xs text-paperDim">{editSelectedBook.authors}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditBookId(null)}
                  aria-label="Trocar livro"
                  className="shrink-0 rounded-full px-2 text-sm text-paperDim hover:text-ribbon"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <input
                  type="search"
                  value={editBookQuery}
                  onChange={(e) => setEditBookQuery(e.target.value)}
                  placeholder="Buscar livro lido pelo clube…"
                  aria-label="Buscar livro do clube"
                  className="rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
                />
                <div className="max-h-40 overflow-y-auto rounded-xl border border-line bg-card2">
                  {editBookResults.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setEditBookId(b.id)}
                      className="flex w-full items-center gap-2.5 border-b border-line px-3 py-2 text-left last:border-b-0 hover:bg-card"
                    >
                      <BookCover book={b} width={26} />
                      <span className="min-w-0 truncate text-sm">{b.title}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-paperDim hover:text-paper"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather"
            >
              Salvar
            </button>
          </div>
        </section>
      )}

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
          {memberRows.map(({ user: memberUser, percent }) => {
            const isMe = memberUser === me;
            const href = isMe ? "/profile" : `/u/${withoutAt(memberUser)}`;
            return (
              <Link
                key={memberUser}
                href={href}
                className="flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foil focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <Avatar user={memberUser} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline justify-between text-xs">
                    <span className="truncate font-bold">
                      {isMe ? `${memberUser} (você)` : memberUser}
                    </span>
                    <span className="ml-2 shrink-0 text-paperDim">{percent}%</span>
                  </p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-card2">
                    <div
                      className={`h-full rounded-full ${isMe ? "bg-ribbon" : "bg-foil/70"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
          {extraMembers > 0 && (
            <button
              type="button"
              onClick={() => setMembersOpen(true)}
              className="text-left text-xs font-bold text-foil hover:opacity-80"
            >
              +{extraMembers} {extraMembers === 1 ? "outro membro" : "outros membros"}
            </button>
          )}
        </div>
      </section>

      <section className="mb-4 mt-6">
        <SectionTitle>Mural</SectionTitle>

        <div className="mt-3 flex max-h-[26rem] flex-col gap-3 overflow-y-auto">
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
          <div ref={feedEndRef} />
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

      {membersOpen && (
        <MembersModal
          members={allMembers}
          isOwner={isOwner}
          me={me}
          onClose={() => setMembersOpen(false)}
          onRemove={removeMember}
        />
      )}
    </div>
  );
}
