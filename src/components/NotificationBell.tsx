"use client";

import Link from "next/link";
import { useNotifications } from "@/lib/store";

function BellIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 16v-5a6 6 0 1 0-12 0v5l-1.8 2.8A1 1 0 0 0 5 20.5h14a1 1 0 0 0 .8-1.7L18 16Z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function NotificationBell({ className = "" }: { className?: string }) {
  const unread = useNotifications().filter((n) => !n.read).length;

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notificações, ${unread} não lidas` : "Notificações"}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-paperDim transition-colors hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foil focus-visible:ring-offset-2 focus-visible:ring-offset-leather ${className}`}
    >
      <BellIcon />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ribbon px-1 text-[10px] font-bold text-white">
          {unread}
        </span>
      )}
    </Link>
  );
}
