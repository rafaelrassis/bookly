"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Spinner } from "@/components/Spinner";
import { Section } from "@/components/ui/Section";
import { formatNotificationTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ApiClubDiscussion } from "@/lib/types";
import { apiErrorMessage } from "@/lib/apiError";

/** Discussão do livro do mês travada por progresso: só mostra comentários
 * até onde o próprio membro leu — resolve spoiler no clube. */
export function ClubDiscussionCard({ clubId }: { clubId: string }) {
  const showToast = useStore((s) => s.showToast);
  const [data, setData] = useState<ApiClubDiscussion | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "no-book">("loading");
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState<number | "">("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/clubs/${clubId}/discussion`)
      .then(async (res) => {
        if (res.status === 404) {
          setStatus("no-book");
          return null;
        }
        if (!res.ok) return null;
        return (await res.json()) as ApiClubDiscussion;
      })
      .then((json) => {
        if (json) {
          setData(json);
          setStatus("ok");
          setPage((p) => (p === "" ? json.mine?.currentPage ?? "" : p));
        }
      });
  }, [clubId]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading" || status === "no-book") return null;
  if (!data) return null;

  const locked = !data.mine || data.mine.status === "WANT_TO_READ";
  const maxPage = data.mine?.status === "READING" ? data.mine.currentPage ?? 0 : null;

  async function publish() {
    const content = draft.trim();
    if (!content || page === "" || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/discussion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, page }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.error === "PAGE_BEYOND_YOUR_PROGRESS") {
          showToast("Você marcou uma página além do seu progresso");
        } else if (json?.error === "NO_PROGRESS") {
          showToast("Comece a ler o livro do mês pra comentar");
        } else {
          showToast(await apiErrorMessage(res, "Não foi possível publicar o comentário"));
        }
        return;
      }
      setDraft("");
      load();
    } finally {
      setPosting(false);
    }
  }

  return (
    <Section title="Discussão">
      {locked ? (
        <div className="mt-3 flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-5 text-center">
          <p className="text-sm text-paperMuted">
            Adicione o livro e comece a ler pra participar da discussão.
          </p>
          <Link
            href={`/book/${data.bookId}`}
            className="rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather hover:opacity-90"
          >
            Ver livro do mês
          </Link>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
          <div className="flex flex-col gap-3">
            {data.comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <Avatar
                  user={c.author.user}
                  avatarIndex={c.author.avatar}
                  avatarUrl={c.author.avatarUrl}
                  size={28}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1 rounded-xl bg-card2 px-3 py-2.5">
                  <p className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-bold">{c.author.user}</span>
                    <span className="shrink-0 text-caption text-paperMuted">
                      pág. {c.page} · {formatNotificationTime(c.createdAt)}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
                </div>
              </div>
            ))}
            {data.comments.length === 0 && (
              <p className="text-sm text-paperMuted">Ainda não há comentários. Comece a discussão!</p>
            )}
          </div>

          {!!data.lockedCount && (
            <p className="text-xs text-paperMuted">
              {data.lockedCount === 1
                ? "1 comentário bloqueado"
                : `${data.lockedCount} comentários bloqueados`}{" "}
              — continue lendo pra ver.
            </p>
          )}

          <div className="mt-1 flex flex-col gap-2 border-t border-line pt-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="Comente sobre o que já leu…"
              aria-label="Novo comentário na discussão"
              className="resize-none rounded-xl border border-line bg-card2 px-3.5 py-2.5 text-sm text-paper"
            />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-paperMuted">
                até a pág.
                <input
                  type="number"
                  min={0}
                  max={maxPage ?? undefined}
                  value={page}
                  onChange={(e) => {
                    const v = e.target.value === "" ? "" : Number(e.target.value);
                    if (v === "" || (maxPage == null ? true : v <= maxPage)) setPage(v);
                  }}
                  aria-label="Página até onde o comentário é seguro"
                  className="w-16 rounded-lg border border-line bg-card px-2 py-1 text-sm text-paper"
                />
              </label>
              <button
                type="button"
                onClick={publish}
                disabled={!draft.trim() || page === "" || posting}
                className="ml-auto flex items-center justify-center rounded-full bg-foil px-4 py-2 text-xs font-bold text-leather disabled:opacity-40"
              >
                {posting ? <Spinner size={14} className="text-leather" /> : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}
