"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { SectionTitle } from "@/components/SectionTitle";
import { withAt } from "@/lib/handle";
import { useStore } from "@/lib/store";
import type { ApiAuthor } from "@/lib/types";

export function DiscoverReaders() {
  const showToast = useStore((s) => s.showToast);
  const [suggestions, setSuggestions] = useState<ApiAuthor[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users/suggestions")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setSuggestions(data.items ?? []))
      .catch(() => setSuggestions([]));
  }, []);

  async function follow(username: string) {
    setPending(username);
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
      if (res.ok) {
        setSuggestions((current) => current?.filter((u) => u.username !== username) ?? null);
        showToast(`Seguindo ${withAt(username)}`);
      } else {
        showToast("Não foi possível seguir");
      }
    } finally {
      setPending(null);
    }
  }

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <section className="mt-7">
      <SectionTitle>Descobrir leitores</SectionTitle>
      <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5">
        {suggestions.map((u) => (
          <div
            key={u.username}
            className="w-40 shrink-0 rounded-2xl border border-line bg-card p-4 text-center"
          >
            <Link href={`/u/${u.username}`} className="flex flex-col items-center gap-2">
              <Avatar user={withAt(u.username)} avatarIndex={u.avatar} size={48} />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold">{u.name}</p>
                <p className="truncate text-xs text-paperDim">{withAt(u.username)}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => follow(u.username)}
              disabled={pending === u.username}
              className="mt-3 w-full rounded-full bg-foil px-3 py-1.5 text-xs font-bold text-leather hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foil focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-60"
            >
              Seguir
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
