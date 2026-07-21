"use client";

import { useEffect, useState } from "react";

type Props = {
  email: string;
  onVerified: () => void;
  onSkip?: () => void;
};

export function VerificationModal({ email, onVerified, onSkip }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/verification/email/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Código inválido ou expirado.");
      return;
    }
    onVerified();
  }

  async function resend() {
    if (cooldown > 0) return;
    setError(null);
    const res = await fetch("/api/verification/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.status === 429) {
      setError("Aguarde um pouco antes de reenviar.");
      return;
    }
    setCooldown(60);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-6">
        <h2 className="text-lg font-extrabold">Verificar e-mail</h2>
        <p className="mt-1 text-sm text-paperDim">
          Enviamos um código de 6 dígitos para <span className="text-paper">{email}</span>.
        </p>

        <form onSubmit={verify} className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="rounded-xl border border-line bg-card2 px-4 py-3 text-center text-lg tracking-[0.5em] text-paper placeholder:text-paperDim/40"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="rounded-xl bg-foil px-5 py-3 font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Verificando…" : "Verificar"}
          </button>

          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0}
            className="text-sm text-paperDim underline decoration-dotted disabled:no-underline disabled:opacity-60"
          >
            {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
          </button>

          {onSkip && (
            <button type="button" onClick={onSkip} className="text-sm text-paperDim underline">
              Pular por agora
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
