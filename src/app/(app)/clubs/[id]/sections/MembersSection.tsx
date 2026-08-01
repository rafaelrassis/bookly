"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Section } from "@/components/ui/Section";
import { withoutAt } from "@/lib/handle";
import { formatStreak } from "@/lib/streak";
import { useModalA11y } from "@/lib/useModalA11y";
import type { ClubDetail } from "@/lib/types";

type Props = {
  club: ClubDetail;
  me: string;
  streaks: Record<string, number>;
  onRemoveMember: (userId: string, user: string) => void;
};

/** Progresso dos membros: até 6 em destaque, o resto atrás de um modal com
 * todos (e, pra quem criou o clube, remoção). */
export function MembersSection({ club, me, streaks, onRemoveMember }: Props) {
  const [membersOpen, setMembersOpen] = useState(false);
  const visibleMembers = club.members.slice(0, 6);
  const extraMembers = Math.max(0, club.members.length - visibleMembers.length);

  return (
    <>
      <Section title="Progresso dos membros">
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
                <Avatar user={m.user} avatarIndex={m.avatar} avatarUrl={m.avatarUrl} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline justify-between text-xs">
                    <span className="truncate font-bold">{isMe ? `${m.user} (você)` : m.user}</span>
                    <span className="ml-2 shrink-0 text-paperMuted">{m.percent}%</span>
                  </p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-card2">
                    <div
                      className={`h-full rounded-full ${isMe ? "bg-ribbon" : "bg-foil/70"}`}
                      style={{ width: `${m.percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-meta text-paperMuted">{formatStreak(streaks[m.userId] ?? 0)}</p>
                </div>
              </Link>
            );
          })}
          {extraMembers > 0 && (
            <Button variant="ghost" className="justify-start text-foil" onClick={() => setMembersOpen(true)}>
              +{extraMembers} {extraMembers === 1 ? "outro membro" : "outros membros"}
            </Button>
          )}
        </div>
      </Section>

      {membersOpen && (
        <MembersModal
          club={club}
          me={me}
          streaks={streaks}
          onClose={() => setMembersOpen(false)}
          onRemove={onRemoveMember}
        />
      )}
    </>
  );
}

/** Modal com todos os membros e progresso; se for o criador, permite remover membros. */
function MembersModal({
  club,
  me,
  streaks,
  onClose,
  onRemove,
}: {
  club: ClubDetail;
  me: string;
  streaks: Record<string, number>;
  onClose: () => void;
  onRemove: (userId: string, user: string) => void;
}) {
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- fechar no clique fora é um atalho de mouse; teclado já fecha com Esc (useModalA11y) e o botão "Fechar" abaixo
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Membros do clube"
        tabIndex={-1}
        className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-leather p-5 sm:max-w-md sm:rounded-3xl focus:outline-none"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Membros ({club.members.length})</h2>
          <IconButton label="Fechar" onClick={onClose}>
            ✕
          </IconButton>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {club.members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3">
              <Avatar user={m.user} avatarIndex={m.avatar} avatarUrl={m.avatarUrl} size={30} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between text-xs">
                  <span className="truncate font-bold">{m.user === me ? `${m.user} (você)` : m.user}</span>
                  <span className="ml-2 shrink-0 text-paperMuted">{m.percent}%</span>
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-card2">
                  <div
                    className={`h-full rounded-full ${m.user === me ? "bg-ribbon" : "bg-foil/70"}`}
                    style={{ width: `${m.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-meta text-paperMuted">{formatStreak(streaks[m.userId] ?? 0)}</p>
              </div>
              {club.isCreator && m.user !== me && (
                <Button
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => onRemove(m.userId, m.user)}
                  aria-label={`Remover ${m.user} do clube`}
                >
                  Excluir
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
