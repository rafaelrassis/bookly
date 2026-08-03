"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/Skeleton";
import { withAt } from "@/lib/handle";

type ListUser = {
  id: string;
  username: string;
  name: string;
  avatar: number;
  avatarUrl: string | null;
  isFollowing: boolean;
  isMe: boolean;
};

export function UserListView({ username, kind }: { username: string; kind: "seguidores" | "seguindo" }) {
  const [items, setItems] = useState<ListUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const endpoint = kind === "seguidores" ? "followers" : "following";

  const load = useCallback(async () => {
    setLoading(true);
    const url = new URL(`/api/users/${username}/${endpoint}`, window.location.origin);
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setHasMore(Boolean(data.nextCursor));
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, endpoint]);

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, kind]);

  async function toggleFollow(target: ListUser) {
    if (busyId) return;
    setBusyId(target.id);
    const next = !target.isFollowing;
    setItems((prev) => prev.map((u) => (u.id === target.id ? { ...u, isFollowing: next } : u)));
    try {
      const res = await fetch(`/api/users/${target.username}/follow`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems((prev) => prev.map((u) => (u.id === target.id ? { ...u, isFollowing: !next } : u)));
    } finally {
      setBusyId(null);
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-paperMuted">
        {kind === "seguidores" ? "Ninguém segue este perfil ainda." : "Ainda não segue ninguém."}
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-col">
      {items.map((u) => (
        <div key={u.id} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
          <Link href={`/u/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar user={withAt(u.username)} size={44} avatarIndex={u.avatar} avatarUrl={u.avatarUrl} />
            <div className="min-w-0">
              <p className="truncate font-bold">{u.name}</p>
              <p className="truncate text-xs text-paperMuted">@{u.username}</p>
            </div>
          </Link>
          {!u.isMe && (
            <button
              type="button"
              onClick={() => toggleFollow(u)}
              disabled={busyId === u.id}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors disabled:opacity-60 ${
                u.isFollowing
                  ? "border border-line bg-card text-paperMuted hover:text-paper"
                  : "bg-foil text-leather hover:opacity-90"
              }`}
            >
              {u.isFollowing ? "Seguindo" : "Seguir"}
            </button>
          )}
        </div>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="mt-3 self-center text-xs font-bold text-paperMuted hover:text-paper disabled:opacity-60"
        >
          {loading ? "Carregando…" : "Carregar mais"}
        </button>
      )}
    </div>
  );
}
