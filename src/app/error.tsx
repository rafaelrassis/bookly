"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Logo } from "@/components/Logo";

/** Boundary de erro global: cobre qualquer exceção não tratada renderizando
 * uma rota (não substitui os estados de erro locais das páginas, que sabem
 * distinguir erro de vazio/carregando — este é o último recurso). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error] falha não tratada:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col items-center justify-center px-5 text-center">
      <Logo className="text-3xl" />
      <p className="mt-6 text-lg font-bold">Algo deu errado</p>
      <p className="mt-2 max-w-64 text-sm text-paperDim">
        Não foi possível carregar esta página. Tente de novo em instantes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl bg-foil px-5 py-3 font-bold text-leather transition-opacity hover:opacity-90"
      >
        Tentar de novo
      </button>
    </main>
  );
}
