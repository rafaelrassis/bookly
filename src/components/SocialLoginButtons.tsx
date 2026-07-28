"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Spinner } from "@/components/Spinner";

type Provider = "google" | "amazon";

/** Botões de login/criação de conta via OAuth — usados na landing e em
 * /login. Mesma ação nos dois lugares (login e cadastro são o mesmo fluxo
 * OAuth), por isso um único componente compartilhado. */
export function SocialLoginButtons({ callbackUrl = "/home" }: { callbackUrl?: string }) {
  const [loading, setLoading] = useState<Provider | null>(null);

  function handleSignIn(provider: Provider) {
    setLoading(provider);
    signIn(provider, { callbackUrl });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => handleSignIn("google")}
        disabled={loading !== null}
        className="flex items-center justify-center gap-3 rounded-2xl border border-line bg-card px-5 py-3.5 font-bold text-paper transition-colors hover:bg-card2 disabled:opacity-60"
      >
        {loading === "google" ? (
          <Spinner size={18} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
            />
          </svg>
        )}
        Continuar com Google
      </button>
      <button
        type="button"
        onClick={() => handleSignIn("amazon")}
        disabled={loading !== null}
        className="flex items-center justify-center gap-3 rounded-2xl border border-line bg-card px-5 py-3.5 font-bold text-paper transition-colors hover:bg-card2 disabled:opacity-60"
      >
        {loading === "amazon" ? (
          <Spinner size={18} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF9900" aria-hidden="true">
            <path d="M12.5 13.6c-1.9 1.4-4.6 2.1-6.9 2.1-3.3 0-6.2-1.2-8.5-3.2-.2-.2 0-.4.2-.3 2.4 1.4 5.4 2.3 8.5 2.3 2.1 0 4.4-.4 6.5-1.3.3-.1.6.2.2.4Z" />
            <path d="M13.3 12.7c-.2-.3-1.6-.2-2.2-.1-.2 0-.2-.2 0-.3 1.1-.8 2.9-.5 3.1-.3.2.3-.1 2.1-1.1 3-.2.1-.3 0-.2-.2.2-.6.6-1.8.4-2.1Z" />
            <path d="M11.2 2.4C8 2.4 5.6 4.6 5.6 7.7c0 1.9.9 3.1 2.2 4l-.9 1.1c-.1.2 0 .3.2.3.5-.1 1.4-.4 2-.8.5.1 1.1.2 1.7.2 3.2 0 5.6-2.2 5.6-5.3.1-3-2.2-4.8-5.2-4.8Zm.4 8.1c-1.5 0-2.6-1.3-2.6-3.1 0-1.9 1.1-3.2 2.6-3.2 1.5 0 2.5 1.3 2.5 3.2 0 1.8-1 3.1-2.5 3.1Z" />
          </svg>
        )}
        Continuar com Amazon
      </button>
    </div>
  );
}
