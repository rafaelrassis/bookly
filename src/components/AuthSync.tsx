"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useStore } from "@/lib/store";

/** Mantém o store em sincronia com a sessão NextAuth e, uma vez logado, com
 * o perfil real vindo de /api/users/me (identidade, bio, gêneros, avatar,
 * top4, seguidores). Estante/notas/reviews continuam mocadas até a Spec 3. */
export function AuthSync() {
  const { data: session, status } = useSession();
  const hasHydrated = useStore((s) => s.hasHydrated);
  const loggedIn = useStore((s) => s.user.loggedIn);
  const email = useStore((s) => s.user.email);
  const hydrateFromSession = useStore((s) => s.hydrateFromSession);
  const applyProfile = useStore((s) => s.applyProfile);
  const logout = useStore((s) => s.logout);

  useEffect(() => {
    if (!hasHydrated || status === "loading") return;

    if (status === "authenticated" && session.user) {
      if (!loggedIn || email !== session.user.email) {
        hydrateFromSession({
          name: session.user.name ?? "",
          username: session.user.username ?? "",
          email: session.user.email ?? "",
        });
      }
      fetch("/api/users/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((profile) => {
          if (!profile) return;
          applyProfile({
            name: profile.name,
            username: profile.username,
            bio: profile.bio,
            genres: profile.genres,
            avatar: profile.avatar,
            top4: profile.top4,
            followers: profile.followers,
            progressUnit: profile.progressUnit,
          });
        })
        .catch(() => {});
    } else if (status === "unauthenticated" && loggedIn) {
      logout();
    }
  }, [hasHydrated, status, session, loggedIn, email, hydrateFromSession, applyProfile, logout]);

  return null;
}
