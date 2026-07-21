"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useStore } from "@/lib/store";

/** Mantém o store (identidade mocada) em sincronia com a sessão real do NextAuth. */
export function AuthSync() {
  const { data: session, status } = useSession();
  const hasHydrated = useStore((s) => s.hasHydrated);
  const loggedIn = useStore((s) => s.user.loggedIn);
  const email = useStore((s) => s.user.email);
  const hydrateFromSession = useStore((s) => s.hydrateFromSession);
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
    } else if (status === "unauthenticated" && loggedIn) {
      logout();
    }
  }, [hasHydrated, status, session, loggedIn, email, hydrateFromSession, logout]);

  return null;
}
