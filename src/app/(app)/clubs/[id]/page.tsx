"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BackHeader } from "@/components/BackHeader";
import { PageLoader } from "@/components/PageLoader";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { AsideContent } from "@/lib/aside";
import { withAt } from "@/lib/handle";
import { useStore } from "@/lib/store";
import type { ApiClubStreaks, ClubDetail, ClubMessage } from "@/lib/types";
import { apiErrorMessage } from "@/lib/apiError";
import { AdminSection } from "./sections/AdminSection";
import { BookOfMonthSection } from "./sections/BookOfMonthSection";
import { ClubHeader } from "./sections/ClubHeader";
import { MembersSection } from "./sections/MembersSection";
import { MuralSection } from "./sections/MuralSection";

const POLL_INTERVAL_MS = 4000;

export default function ClubPage({ params }: { params: { id: string } }) {
  const username = useStore((s) => s.user.username);
  const showToast = useStore((s) => s.showToast);

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound" | "error">("loading");
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ClubMessage | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);

  const me = withAt(username);

  const loadClub = useCallback(() => {
    setStatus((s) => (s === "ok" ? s : "loading"));
    fetch(`/api/clubs/${params.id}`)
      .then((res) => {
        if (res.status === 404) {
          setStatus("notfound");
          return null;
        }
        if (!res.ok) {
          setStatus("error");
          return null;
        }
        return res.json();
      })
      .then((data: ClubDetail | null) => {
        if (data) {
          setClub(data);
          setStatus("ok");
        }
      })
      .catch(() => setStatus("error"));
  }, [params.id]);

  useEffect(() => {
    loadClub();
  }, [loadClub, retryCount]);

  // streak semanal por membro: incentivo social leve, não bloqueia o carregamento do clube.
  useEffect(() => {
    fetch(`/api/clubs/${params.id}/streaks`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ApiClubStreaks | null) => {
        if (!data) return;
        setStreaks(Object.fromEntries(data.streaks.map((s) => [s.userId, s.streak])));
      })
      .catch(() => {});
  }, [params.id, retryCount]);

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
  if (status === "error") {
    return (
      <div className="pt-4">
        <BackHeader />
        <ErrorRetry
          className="mt-10"
          message="Não foi possível carregar o clube. Tente de novo."
          onRetry={() => setRetryCount((n) => n + 1)}
        />
      </div>
    );
  }
  if (status === "loading" || !club) {
    return (
      <div className="pt-4">
        <BackHeader />
        <PageLoader />
      </div>
    );
  }

  // sugestões de menção ao digitar @
  const mentionMatch = draft.match(/@([\w.\-]*)$/);
  const avatarByHandle = new Map(club.members.map((m) => [m.user, m]));
  const mentionables = club.members.map((m) => m.user);
  const suggestions = mentionMatch
    ? mentionables.filter((u) => u.slice(1).toLowerCase().startsWith(mentionMatch[1].toLowerCase()))
    : [];

  function applyMention(mention: string) {
    setDraft((d) => d.replace(/@([\w.\-]*)$/, `${mention} `));
    inputRef.current?.focus();
  }

  async function join() {
    if (membershipBusy) return;
    setMembershipBusy(true);
    try {
      const res = await fetch(`/api/clubs/${club!.id}/join`, { method: "POST" });
      if (!res.ok) {
        showToast(await apiErrorMessage(res, "Não foi possível entrar no clube"));
        return;
      }
      showToast("Você entrou no clube! 🎉");
      loadClub();
    } finally {
      setMembershipBusy(false);
    }
  }

  async function leave() {
    if (membershipBusy) return;
    setMembershipBusy(true);
    try {
      const res = await fetch(`/api/clubs/${club!.id}/leave`, { method: "DELETE" });
      if (!res.ok) {
        showToast(await apiErrorMessage(res, "Não foi possível sair do clube"));
        return;
      }
      showToast("Você saiu do clube");
      loadClub();
      setMessages([]);
      lastIdRef.current = null;
    } finally {
      setMembershipBusy(false);
    }
  }

  async function publish() {
    const text = draft.trim();
    if (!text || publishing) return;
    setDraft("");
    setPublishing(true);
    const replyToSnapshot = replyTo;
    setReplyTo(null);
    try {
      const res = await fetch(`/api/clubs/${club!.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, replyToId: replyToSnapshot?.id }),
      });
      if (!res.ok) {
        showToast(await apiErrorMessage(res, "Não foi possível publicar"));
        return;
      }
      const message: ClubMessage = await res.json();
      lastIdRef.current = message.id;
      setMessages((prev) => [...prev, message]);
    } finally {
      setPublishing(false);
    }
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
      showToast(await apiErrorMessage(res, "Não foi possível gerar um novo código"));
      return;
    }
    const { code } = await res.json();
    setClub((c) => (c ? { ...c, code } : c));
    showToast("Novo código gerado!");
  }

  function openEdit() {
    setEditName(club!.name);
    setEditDesc(club!.desc);
    setEditing(true);
  }

  async function saveEdit() {
    const name = editName.trim();
    if (!name || savingEdit) {
      if (!name) showToast("Preencha o nome do clube");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/clubs/${club!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, desc: editDesc.trim() }),
      });
      if (!res.ok) {
        showToast(await apiErrorMessage(res, "Não foi possível atualizar o clube"));
        return;
      }
      setEditing(false);
      showToast("Clube atualizado ✦");
      loadClub();
    } finally {
      setSavingEdit(false);
    }
  }

  async function removeMember(userId: string, user: string) {
    const res = await fetch(`/api/clubs/${club!.id}/members/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      showToast(await apiErrorMessage(res, "Não foi possível remover o membro"));
      return;
    }
    showToast(`${user} removido(a) do clube`);
    loadClub();
  }

  async function deleteClub() {
    if (!window.confirm("Excluir este clube apaga o mural pra sempre. Confirma?")) return;
    const res = await fetch(`/api/clubs/${club!.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast(await apiErrorMessage(res, "Não foi possível excluir o clube"));
      return;
    }
    window.location.href = "/clubs";
  }

  return (
    <div className="pt-4">
      <BackHeader />

      <ClubHeader
        club={club}
        membershipBusy={membershipBusy}
        onJoin={join}
        onLeave={leave}
        onDelete={deleteClub}
        onOpenEdit={openEdit}
      />

      <AdminSection
        club={club}
        editing={editing}
        editName={editName}
        editDesc={editDesc}
        savingEdit={savingEdit}
        onEditNameChange={setEditName}
        onEditDescChange={setEditDesc}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditing(false)}
        onCopyCode={copyCode}
        onRegenerateCode={regenerateCode}
      />

      <div className="lg:hidden">
        <BookOfMonthSection clubId={club.id} isCreator={club.isCreator} joined={club.joined} />
      </div>
      <AsideContent>
        <div className="[&>section:first-child]:mt-0">
          <BookOfMonthSection clubId={club.id} isCreator={club.isCreator} joined={club.joined} />
        </div>
      </AsideContent>

      <div className="lg:hidden">
        <MembersSection club={club} me={me} streaks={streaks} onRemoveMember={removeMember} />
      </div>
      <AsideContent>
        <div className="[&>section:first-child]:mt-0">
          <MembersSection club={club} me={me} streaks={streaks} onRemoveMember={removeMember} />
        </div>
      </AsideContent>

      <MuralSection
        joined={club.joined}
        messages={messages}
        me={me}
        draft={draft}
        replyTo={replyTo}
        suggestions={suggestions}
        avatarByHandle={avatarByHandle}
        publishing={publishing}
        inputRef={inputRef}
        feedEndRef={feedEndRef}
        onDraftChange={setDraft}
        onPublish={publish}
        onReply={(m) => {
          setReplyTo(m);
          inputRef.current?.focus();
        }}
        onCancelReply={() => setReplyTo(null)}
        onApplyMention={applyMention}
      />
    </div>
  );
}
