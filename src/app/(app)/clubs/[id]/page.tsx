"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { BookPicker } from "@/components/BookPicker";
import { CopyIcon, LockIcon } from "@/components/icons";
import { SectionTitle } from "@/components/SectionTitle";
import { formatClockTime } from "@/lib/format";
import { withAt, withoutAt } from "@/lib/handle";
import { useStore } from "@/lib/store";
import type { Book, ClubDetail, ClubMessage } from "@/lib/types";

const POLL_INTERVAL_MS = 4000;

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
      {!own && (
        <Avatar user={message.user} avatarIndex={message.avatar} size={30} className="mt-0.5" />
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
          own ? "border border-foil/40 bg-foil/10" : "bg-card"
        }`}
      >
        <p className="flex items-baseline gap-2 text-xs">
          <span className="font-bold">{own ? "você" : message.user}</span>
          <span className="text-[10px] text-paperDim">{formatClockTime(message.time)}</span>
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
  club,
  me,
  onClose,
  onRemove,
}: {
  club: ClubDetail;
  me: string;
  onClose: () => void;
  onRemove: (userId: string, user: string) => void;
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
          <h2 className="font-display text-lg font-bold">Membros ({club.members.length})</h2>
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
          {club.members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3">
              <Avatar user={m.user} avatarIndex={m.avatar} size={30} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between text-xs">
                  <span className="truncate font-bold">
                    {m.user === me ? `${m.user} (você)` : m.user}
                  </span>
                  <span className="ml-2 shrink-0 text-paperDim">{m.percent}%</span>
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-card2">
                  <div
                    className={`h-full rounded-full ${m.user === me ? "bg-ribbon" : "bg-foil/70"}`}
                    style={{ width: `${m.percent}%` }}
                  />
                </div>
              </div>
              {club.isCreator && m.user !== me && (
                <button
                  type="button"
                  onClick={() => onRemove(m.userId, m.user)}
                  aria-label={`Remover ${m.user} do clube`}
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
  const username = useStore((s) => s.user.username);
  const showToast = useStore((s) => s.showToast);

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound">("loading");
  const [messages, setMessages] = useState<ClubMessage[]>([]);

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ClubMessage | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editBook, setEditBook] = useState<Book | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);

  const me = withAt(username);

  const loadClub = useCallback(() => {
    fetch(`/api/clubs/${params.id}`)
      .then((res) => {
        if (res.status === 404) {
          setStatus("notfound");
          return null;
        }
        return res.json();
      })
      .then((data: ClubDetail | null) => {
        if (data) {
          setClub(data);
          setStatus("ok");
        }
      });
  }, [params.id]);

  useEffect(() => {
    loadClub();
  }, [loadClub]);

  // polling do mural: ~4s enquanto a aba está visível, pausa quando some.
  useEffect(() => {
    if (!club?.joined) return;

    let cancelled = false;

    async function poll() {
      const url = lastIdRef.current
        ? `/api/clubs/${params.id}/messages?after=${lastIdRef.current}`
        : `/api/clubs/${params.id}/messages`;
      const res = await fetch(url);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (data.items.length === 0) return;
      lastIdRef.current = data.items[data.items.length - 1].id;
      setMessages((prev) => [...prev, ...data.items]);
    }

    poll();
    const interval = setInterval(() => {
      if (!document.hidden) poll();
    }, POLL_INTERVAL_MS);

    function onVisibility() {
      if (!document.hidden) poll();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.joined, params.id]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (status === "notfound") {
    return (
      <div className="pt-4">
        <BackHeader />
        <p className="mt-10 text-center text-paperDim">Clube não encontrado.</p>
      </div>
    );
  }
  if (status === "loading" || !club) {
    return (
      <div className="pt-4">
        <BackHeader />
        <p className="mt-10 text-center text-paperDim">Carregando…</p>
      </div>
    );
  }

  // sugestões de menção ao digitar @
  const mentionMatch = draft.match(/@([\w.\-]*)$/);
  const mentionables = club.members.map((m) => m.user);
  const suggestions = mentionMatch
    ? mentionables.filter((u) =>
        u.slice(1).toLowerCase().startsWith(mentionMatch[1].toLowerCase())
      )
    : [];

  function applyMention(mention: string) {
    setDraft((d) => d.replace(/@([\w.\-]*)$/, `${mention} `));
    inputRef.current?.focus();
  }

  async function join() {
    const res = await fetch(`/api/clubs/${club!.id}/join`, { method: "POST" });
    if (!res.ok) {
      showToast("Não foi possível entrar no clube");
      return;
    }
    showToast("Você entrou no clube! 🎉");
    loadClub();
  }

  async function leave() {
    const res = await fetch(`/api/clubs/${club!.id}/leave`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      showToast(data?.error ?? "Não foi possível sair do clube");
      return;
    }
    showToast("Você saiu do clube");
    loadClub();
    setMessages([]);
    lastIdRef.current = null;
  }

  async function publish() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const replyToSnapshot = replyTo;
    setReplyTo(null);
    const res = await fetch(`/api/clubs/${club!.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, replyToId: replyToSnapshot?.id }),
    });
    if (!res.ok) {
      showToast("Não foi possível publicar");
      return;
    }
    const message: ClubMessage = await res.json();
    lastIdRef.current = message.id;
    setMessages((prev) => [...prev, message]);
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

  async function regenerateCode() {
    const res = await fetch(`/api/clubs/${club!.id}/code/regenerate`, { method: "POST" });
    if (!res.ok) {
      showToast("Não foi possível gerar um novo código");
      return;
    }
    const { code } = await res.json();
    setClub((c) => (c ? { ...c, code } : c));
    showToast("Novo código gerado!");
  }

  function openEdit() {
    setEditName(club!.name);
    setEditDesc(club!.desc);
    setEditBook(club!.book);
    setEditing(true);
  }

  async function saveEdit() {
    const name = editName.trim();
    if (!name || !editBook) {
      showToast("Preencha nome e livro do clube");
      return;
    }
    const res = await fetch(`/api/clubs/${club!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bookId: editBook.id, desc: editDesc.trim() }),
    });
    if (!res.ok) {
      showToast("Não foi possível atualizar o clube");
      return;
    }
    setEditing(false);
    showToast("Clube atualizado ✦");
    loadClub();
  }

  async function removeMember(userId: string, user: string) {
    const res = await fetch(`/api/clubs/${club!.id}/members/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Não foi possível remover o membro");
      return;
    }
    showToast(`${user} removido(a) do clube`);
    loadClub();
  }

  async function deleteClub() {
    if (!window.confirm("Excluir este clube apaga o mural pra sempre. Confirma?")) return;
    const res = await fetch(`/api/clubs/${club!.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Não foi possível excluir o clube");
      return;
    }
    window.location.href = "/clubs";
  }

  const visibleMembers = club.members.slice(0, 6);
  const extraMembers = Math.max(0, club.members.length - visibleMembers.length);

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
          {club.isCreator ? (
            <button
              type="button"
              onClick={deleteClub}
              className="flex-1 rounded-xl border border-line bg-card px-5 py-3 font-bold text-paperDim transition-colors hover:text-ribbon"
            >
              Excluir clube
            </button>
          ) : club.joined ? (
            <button
              type="button"
              onClick={leave}
              className="flex-1 rounded-xl border border-line bg-card px-5 py-3 font-bold text-paperDim transition-colors hover:text-paper"
            >
              Sair do clube
            </button>
          ) : (
            <button
              type="button"
              onClick={join}
              className="flex-1 rounded-xl bg-foil px-5 py-3 font-bold text-leather transition-opacity hover:opacity-90"
            >
              Participar do clube
            </button>
          )}
          {club.isCreator && (
            <button
              type="button"
              onClick={openEdit}
              className="rounded-xl border border-line bg-card px-4 py-3 font-bold text-paper transition-colors hover:bg-card2"
            >
              Editar
            </button>
          )}
        </div>

        {club.visibility === "private" && club.isCreator && club.code && (
          <div className="mt-3 flex w-full items-center justify-between rounded-2xl border border-foil/40 bg-card px-4 py-3">
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-paperDim">
                Código de convite
              </p>
              <p className="font-mono text-lg font-bold tracking-[0.3em] text-foil">
                {club.code}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-card2 px-3 py-2 text-xs font-bold text-paper hover:border-foil/50"
              >
                <CopyIcon /> Copiar
              </button>
              <button
                type="button"
                onClick={regenerateCode}
                className="rounded-xl border border-line bg-card2 px-3 py-2 text-xs font-bold text-paper hover:border-foil/50"
              >
                Gerar novo
              </button>
            </div>
          </div>
        )}
      </section>

      {editing && club.isCreator && (
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
            <BookPicker
              selected={editBook}
              onSelect={setEditBook}
              onClear={() => setEditBook(null)}
              placeholder="Buscar livro lido pelo clube…"
              dense
            />
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

      <section className="mt-6">
        <SectionTitle>Lendo agora</SectionTitle>
        <Link
          href={`/book/${club.book.id}`}
          className="mt-3 flex items-center gap-4 rounded-2xl border border-line bg-card p-4 transition-colors hover:bg-card2"
        >
          <BookCover book={club.book} width={56} />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold">{club.book.title}</p>
            <p className="truncate text-sm text-paperDim">
              {club.book.authors} · {club.book.pages} pág.
            </p>
          </div>
        </Link>
      </section>

      <section className="mt-6">
        <SectionTitle>Progresso dos membros</SectionTitle>
        <div className="mt-3 flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-4">
          {visibleMembers.map((m) => {
            const isMe = m.user === me;
            const href = isMe ? "/profile" : `/u/${withoutAt(m.user)}`;
            return (
              <Link
                key={m.userId}
                href={href}
                className="flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foil focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <Avatar user={m.user} avatarIndex={m.avatar} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline justify-between text-xs">
                    <span className="truncate font-bold">
                      {isMe ? `${m.user} (você)` : m.user}
                    </span>
                    <span className="ml-2 shrink-0 text-paperDim">{m.percent}%</span>
                  </p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-card2">
                    <div
                      className={`h-full rounded-full ${isMe ? "bg-ribbon" : "bg-foil/70"}`}
                      style={{ width: `${m.percent}%` }}
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

        {club.joined ? (
          <>
            <div className="mt-3 flex max-h-[26rem] flex-col gap-3 overflow-y-auto">
              {messages.map((message) => (
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
              {messages.length === 0 && (
                <p className="text-sm text-paperDim">Ainda não há mensagens. Comece a conversa!</p>
              )}
              <div ref={feedEndRef} />
            </div>

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
          </>
        ) : (
          <p className="mt-3 text-sm text-paperDim">
            Participe do clube pra ver e escrever no mural.
          </p>
        )}
      </section>

      {membersOpen && (
        <MembersModal
          club={club}
          me={me}
          onClose={() => setMembersOpen(false)}
          onRemove={removeMember}
        />
      )}
    </div>
  );
}
