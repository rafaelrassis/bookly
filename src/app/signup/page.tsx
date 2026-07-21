"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/Logo";
import { VerificationModal } from "@/components/VerificationModal";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        password,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setLoading(false);
      setError(typeof body?.error === "string" ? body.error : "Não foi possível criar a conta.");
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      setError("Conta criada, mas não foi possível entrar. Tente fazer login.");
      return;
    }
    setVerifying(true);
  }

  function goToOnboarding() {
    router.push("/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pb-10 pt-14">
      <Link href="/login" className="self-start text-sm text-paperDim hover:text-paper">
        ‹ Voltar
      </Link>

      <div className="mt-10 text-center">
        <Logo className="text-4xl" />
        <p className="mt-2 text-paperDim">Crie sua conta e comece a registrar suas leituras</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
          Nome
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Victor Frankenstein"
            className="rounded-xl border border-line bg-card px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
          Nome de usuário
          <div className="flex items-center rounded-xl border border-line bg-card px-4">
            <span className="text-paperDim">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              minLength={3}
              maxLength={20}
              pattern="[a-z0-9._]+"
              placeholder="meninomaluquinho"
              className="w-full bg-transparent py-3 pl-1 text-base text-paper placeholder:text-paperDim/60 focus:outline-none"
            />
          </div>
        </label>
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
        <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
          Senha (mín. 8 caracteres)
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
          disabled={loading}
          className="mt-2 rounded-xl bg-foil px-5 py-3.5 font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Criando conta…" : "Criar conta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-paperDim">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-paper underline">
          Entrar
        </Link>
      </p>

      {verifying && (
        <VerificationModal email={email} onVerified={goToOnboarding} onSkip={goToOnboarding} />
      )}
    </main>
  );
}
