"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/Logo";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { emailLoginEnabled } from "@/lib/featureFlags";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Credenciais inválidas.");
      return;
    }
    router.push("/home");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pb-10 pt-14">
      <Link href="/" className="self-start text-sm text-paperMuted hover:text-paper">
        ‹ Voltar
      </Link>

      <div className="mt-10 text-center">
        <Logo className="text-4xl" />
        <p className="mt-2 text-paperMuted">Entre para continuar sua leitura</p>
      </div>

      <div className="mt-10">
        <SocialLoginButtons callbackUrl="/home" />
      </div>

      {emailLoginEnabled ? (
        <>
          <div className="mt-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.12em] text-paperMuted">
            <span className="h-px flex-1 bg-line" />
            ou
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <Field label="E-mail" id="login-email">
              <Input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="capitu@biblioteca.com"
              />
            </Field>
            <Field label="Senha" id="login-password">
              <Input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </Field>

            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-xl bg-foil px-5 py-3.5 font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-paperMuted">
            Não tem conta?{" "}
            <Link href="/signup" className="font-semibold text-paper underline">
              Criar conta
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-paperMuted">
            <Link href="/forgot-password" className="underline">
              Esqueci minha senha
            </Link>
          </p>
        </>
      ) : (
        <p className="mt-7 text-center text-xs text-paperMuted">
          Ao continuar você concorda com os termos de uso. Não tem conta? O login cria uma
          automaticamente.
        </p>
      )}
    </main>
  );
}
