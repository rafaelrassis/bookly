"use client";

import Link from "next/link";
import { MOCK_USERS } from "@/data/users";
import { Avatar } from "@/components/Avatar";
import { SectionTitle } from "@/components/SectionTitle";
import { useStore } from "@/lib/store";

export function DiscoverReaders() {
  const myUsername = useStore((s) => s.user.username);
  const followed = useStore((s) => s.followedUsers);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const showToast = useStore((s) => s.showToast);

  const suggestions = Object.entries(MOCK_USERS)
    .filter(([handle]) => handle !== `@${myUsername}` && !followed.includes(handle))
    .slice(0, 6);

  if (suggestions.length === 0) return null;

  return (
    <section className="mt-7">
      <SectionTitle>Descobrir leitores</SectionTitle>
      <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5">
        {suggestions.map(([handle, u]) => (
          <div
            key={handle}
            className="w-40 shrink-0 rounded-2xl border border-line bg-card p-4 text-center"
          >
            <Link href={`/u/${handle.replace("@", "")}`} className="flex flex-col items-center gap-2">
              <Avatar user={handle} size={48} />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold">{u.name}</p>
                <p className="truncate text-xs text-paperDim">{handle}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => {
                const now = toggleFollow(handle);
                showToast(now ? `Seguindo ${handle}` : `Deixou de seguir ${handle}`);
              }}
              className="mt-3 w-full rounded-full bg-foil px-3 py-1.5 text-xs font-bold text-leather hover:opacity-90"
            >
              Seguir
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
