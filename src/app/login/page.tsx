"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  function goToOnboarding(e?: React.FormEvent) {
    e?.preventDefault();
    router.push("/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pb-10 pt-14">
      <Link href="/" className="self-start text-sm text-paperDim hover:text-paper">
        ‹ Voltar
      </Link>

      <div className="mt-10 text-center">
        <Logo className="text-4xl" />
        <p className="mt-2 text-paperDim">Entre para continuar sua leitura</p>
      </div>

      <button
        type="button"
        onClick={() => goToOnboarding()}
        className="mt-10 flex items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 font-bold text-[#1F1F1F] transition-opacity hover:opacity-90"
      >
        <GoogleLogo />
        Continuar com Google
      </button>

      <div className="my-7 flex items-center gap-4 text-xs text-paperDim">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        ou
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>

      <form onSubmit={goToOnboarding} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
          E-mail
          <input
            type="email"
            name="email"
            placeholder="voce@exemplo.com"
            className="rounded-xl border border-line bg-card px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
          Senha
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            className="rounded-xl border border-line bg-card px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-xl bg-foil px-5 py-3.5 font-bold text-leather transition-opacity hover:opacity-90"
        >
          Entrar
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-paperDim">
        Login de demonstração — qualquer opção continua para o onboarding.
      </p>
    </main>
  );
}
