"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { apiErrorMessage } from "@/lib/apiError";
import { withAt } from "@/lib/handle";
import { useStore } from "@/lib/store";
import type { ApiAuthor } from "@/lib/types";

/** Empty state da aba "Seguindo" quando o usuário ainda não segue ninguém —
 * sugere leitores pra seguir (resolve o cold start) em vez de cair pro Geral. */
export function SeguindoEmptyState({ onGoGeneral }: { onGoGeneral: () => void }) {
  const showToast = useStore((s) => s.showToast);
  const [suggestions, setSuggestions] = useState<ApiAuthor[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/suggestions")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => !cancelled && setSuggestions((data.items ?? []).slice(0, 5)))
      .catch(() => !cancelled && setSuggestions([]));
    return () => {
      cancelled = true;
    };
  }, []);

  async function follow(username: string) {
    const prev = suggestions;
    setPending(username);
    setSuggestions((current) => current?.filter((u) => u.username !== username) ?? null); // otimista
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
      if (!res.ok) {
        setSuggestions(prev); // rollback
        showToast(await apiErrorMessage(res, "Não foi possível seguir"));
      } else {
        showToast(`Seguindo ${withAt(username)}`);
      }
    } catch {
      setSuggestions(prev); // rollback
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-1 rounded-2xl border border-line bg-card p-5 text-center">
      <p className="font-display text-base font-bold">Você ainda não segue ninguém</p>
      <p className="mt-1 text-sm text-paperMuted">Siga leitores pra ver as reviews deles aqui.</p>

      {suggestions && suggestions.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 text-left">
          {suggestions.map((u) => (
            <div
              key={u.username}
              className="flex items-center gap-3 rounded-xl border border-line px-3 py-2"
            >
              <Link href={`/u/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar user={withAt(u.username)} avatarIndex={u.avatar} avatarUrl={u.avatarUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{u.name}</p>
                  <p className="truncate text-xs text-paperMuted">{withAt(u.username)}</p>
                </div>
              </Link>
              <Button
                variant="primary"
                className="shrink-0"
                onClick={() => follow(u.username)}
                disabled={pending === u.username}
              >
                Seguir
              </Button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onGoGeneral}
        className="mt-4 text-sm font-bold text-paperMuted underline"
      >
        Explorar no Geral
      </button>
    </div>
  );
}
