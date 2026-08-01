"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { GiftIcon } from "@/components/icons";
import { SectionError } from "@/components/SectionError";
import { Skeleton } from "@/components/Skeleton";
import { apiErrorMessage } from "@/lib/apiError";
import { withAt } from "@/lib/handle";
import { formatNotificationTime } from "@/lib/format";
import type { ApiNotificationGroup } from "@/lib/types";

function actorNames(actors: ApiNotificationGroup["actors"]): string {
  const names = actors.length > 0 ? actors.map((a) => a.name) : ["Alguém"];
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  const rest = names.length - 2;
  return `${names[0]}, ${names[1]} e mais ${rest} ${rest === 1 ? "pessoa" : "pessoas"}`;
}

function groupText(g: ApiNotificationGroup): string {
  const who = actorNames(g.actors);
  const book = g.donation?.book?.title ?? "um livro";
  const plural = g.actors.length > 1;
  switch (g.type) {
    case "DONATION_REQUEST_RECEIVED":
      return plural
        ? `${who} querem o livro "${book}" que você está doando.`
        : `${who} quer o livro "${book}" que você está doando.`;
    case "DONATION_CHOSEN":
      return `${who} escolheu você para receber "${book}"! Veja o contato.`;
    case "DONATION_COMPLETED":
      return `${who} confirmou a doação de "${book}". Combine a entrega.`;
    case "DONATION_RESERVE_EXPIRING":
      return `A reserva de "${book}" expira em breve — combine a entrega antes do prazo.`;
    case "DONATION_RESERVE_EXPIRED":
      return `A reserva de "${book}" expirou e o livro voltou a ficar disponível.`;
    case "DONATION_RECEIPT_CONFIRMED":
      return `${who} confirmou que recebeu "${book}". Doação concluída!`;
    case "DONATION_RESERVE_EXTENDED":
      return `${who} estendeu o prazo da reserva de "${book}".`;
    default:
      return "Você tem uma nova notificação.";
  }
}

function groupHref(g: ApiNotificationGroup): string {
  switch (g.type) {
    case "DONATION_REQUEST_RECEIVED":
    case "DONATION_RECEIPT_CONFIRMED":
    case "DONATION_CHOSEN":
    case "DONATION_COMPLETED":
    case "DONATION_RESERVE_EXTENDED":
      return "/profile/doacoes";
    default:
      return "/profile";
  }
}

function GroupAvatar({ actors }: { actors: ApiNotificationGroup["actors"] }) {
  if (actors.length === 0) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card2 text-foil">
        <GiftIcon size={18} />
      </span>
    );
  }
  if (actors.length === 1) {
    const a = actors[0];
    return <Avatar user={withAt(a.username ?? a.name)} avatarIndex={a.avatar} avatarUrl={a.avatarUrl} size={40} />;
  }
  const shown = actors.slice(0, 3);
  return (
    <span className="relative h-10 shrink-0" style={{ width: 28 + (shown.length - 1) * 14 }}>
      {shown.map((a, i) => (
        <span
          key={a.id}
          className="absolute top-0 rounded-full ring-2 ring-card2"
          style={{ left: i * 14, zIndex: shown.length - i }}
        >
          <Avatar user={withAt(a.username ?? a.name)} avatarIndex={a.avatar} avatarUrl={a.avatarUrl} size={28} />
        </span>
      ))}
    </span>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<ApiNotificationGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadSignal, setReloadSignal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch("/api/notifications")
      .then(async (res) => {
        if (!res.ok) throw new Error(await apiErrorMessage(res, "Não foi possível carregar suas notificações"));
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setNotifications(data.notifications ?? []);
        fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" } });
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [reloadSignal]);

  function markGroupRead(g: ApiNotificationGroup) {
    if (!g.donationId) return;
    setNotifications((prev) => (prev ? prev.map((n) => (n.key === g.key ? { ...n, read: true } : n)) : prev));
    fetch("/api/notifications/group/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: g.type, donationId: g.donationId }),
    }).catch(() => {});
  }

  return (
    <div className="px-5 pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Notificações</h1>
      </BackHeader>

      {error ? (
        <SectionError message={error} onRetry={() => setReloadSignal((n) => n + 1)} />
      ) : !notifications ? (
        <NotificationsSkeleton />
      ) : notifications.length === 0 ? (
        <p className="mt-6 text-sm text-paperDim">Nenhuma notificação por aqui ainda.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-1 pb-8">
          {notifications.map((g) => (
            <div
              key={g.key}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${g.read ? "" : "bg-card2"}`}
            >
              <Link
                href={groupHref(g)}
                className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-xl transition-colors hover:bg-card2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foil focus-visible:ring-offset-2 focus-visible:ring-offset-leather"
              >
                <GroupAvatar actors={g.actors} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-paperDim">{groupText(g)}</p>
                  <p className="mt-0.5 text-xs text-paperDim">{formatNotificationTime(g.createdAt)}</p>
                </div>
              </Link>
              {!g.read && g.actors.length > 1 && g.donationId ? (
                <button
                  type="button"
                  onClick={() => markGroupRead(g)}
                  className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-bold text-paper transition-colors hover:bg-card"
                >
                  Marcar lido
                </button>
              ) : (
                !g.read && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-ribbon" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="mt-4 flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
