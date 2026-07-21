"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

type Step = "request" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    setLoading(false);
    setInfo("Se o e-mail existir, enviamos um código de 6 dígitos.");
    setStep("reset");
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), code, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Código inválido ou expirado.");
      return;
    }
    router.push("/login");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pb-10 pt-14">
      <Link href="/login" className="self-start text-sm text-paperDim hover:text-paper">
        ‹ Voltar
      </Link>

      <div className="mt-10 text-center">
        <Logo className="text-4xl" />
        <p className="mt-2 text-paperDim">
          {step === "request" ? "Recupere o acesso à sua conta" : "Defina uma nova senha"}
        </p>
      </div>

      {step === "request" ? (
        <form onSubmit={requestCode} className="mt-10 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="capitu@biblioteca.com"
              className="rounded-xl border border-line bg-card px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-foil px-5 py-3.5 font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Enviando…" : "Enviar código"}
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="mt-10 flex flex-col gap-3">
          {info && <p className="text-sm text-paperDim">{info}</p>}
          <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
            Código (6 dígitos)
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              placeholder="000000"
              className="rounded-xl border border-line bg-card px-4 py-3 text-center text-lg tracking-[0.5em] text-paper"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
            Nova senha (mín. 8 caracteres)
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className="rounded-xl border border-line bg-card px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="mt-2 rounded-xl bg-foil px-5 py-3.5 font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Salvando…" : "Redefinir senha"}
          </button>
          <button
            type="button"
            onClick={() => setStep("request")}
            className="text-sm text-paperDim underline"
          >
            Usar outro e-mail
          </button>
        </form>
      )}
    </main>
  );
}
