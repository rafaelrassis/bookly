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
import type { ApiNotification } from "@/lib/types";

function notificationText(n: ApiNotification): string {
  const who = n.actor?.name ?? "Alguém";
  const book = n.donation?.book?.title ?? "um livro";
  switch (n.type) {
    case "DONATION_REQUEST_RECEIVED":
      return `${who} quer o livro "${book}" que você está doando.`;
    case "DONATION_CHOSEN":
      return `${who} escolheu você para receber "${book}"! Veja o contato.`;
    case "DONATION_COMPLETED":
      return `${who} confirmou a doação de "${book}". Combine a entrega.`;
    case "DONATION_RESERVE_EXPIRING":
      return `A reserva de "${book}" expira em breve — combine a entrega antes do prazo.`;
    case "DONATION_RESERVE_EXPIRED":
      return `A reserva de "${book}" expirou e o livro voltou a ficar disponível.`;
    default:
      return "Você tem uma nova notificação.";
  }
}

function notificationHref(n: ApiNotification): string {
  switch (n.type) {
    case "DONATION_REQUEST_RECEIVED":
      return "/profile#minhas-doacoes";
    case "DONATION_CHOSEN":
    case "DONATION_COMPLETED":
      return "/profile#recebidos";
    default:
      return "/profile";
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<ApiNotification[] | null>(null);
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
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={notificationHref(n)}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-card2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foil focus-visible:ring-offset-2 focus-visible:ring-offset-leather ${
                n.read ? "" : "bg-card2"
              }`}
            >
              {n.actor ? (
                <Avatar
                  user={withAt(n.actor.username ?? n.actor.name)}
                  avatarIndex={n.actor.avatar}
                  avatarUrl={n.actor.avatarUrl}
                  size={40}
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card2 text-foil">
                  <GiftIcon size={18} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-paperDim">{notificationText(n)}</p>
                <p className="mt-0.5 text-xs text-paperDim">{formatNotificationTime(n.createdAt)}</p>
              </div>
              {!n.read && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-ribbon" />}
            </Link>
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
