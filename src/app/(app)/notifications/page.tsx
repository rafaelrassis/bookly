"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { withoutAt } from "@/lib/handle";
import { formatNotificationTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Notification } from "@/lib/types";

function notificationText(n: Notification): string {
  if (n.kind === "like") return "curtiu sua review";
  if (n.kind === "comment") return `comentou: "${n.text}"`;
  return "começou a seguir você";
}

function notificationHref(n: Notification): string {
  if (n.kind === "follow") return `/u/${withoutAt(n.actor)}`;
  return `/review/${n.reviewId}`;
}

export default function NotificationsPage() {
  const notifications = useStore((s) => s.notifications);
  const markNotificationsRead = useStore((s) => s.markNotificationsRead);

  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  return (
    <div className="px-5 pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Notificações</h1>
      </BackHeader>

      {notifications.length === 0 ? (
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
              <Avatar user={n.actor} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                  <span className="font-bold">{n.actor}</span>{" "}
                  <span className="text-paperDim">{notificationText(n)}</span>
                </p>
                <p className="mt-0.5 text-xs text-paperDim">{formatNotificationTime(n.time)}</p>
              </div>
              {!n.read && (
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-ribbon"
                />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
