import Link from "next/link";
import { Logo } from "@/components/Logo";

/** not-found.tsx global: cobre rotas inexistentes e notFound() chamado
 * sem um not-found.tsx mais específico na árvore. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col items-center justify-center px-5 text-center">
      <Logo className="text-3xl" />
      <p className="mt-6 text-lg font-bold">Página não encontrada</p>
      <p className="mt-2 max-w-64 text-sm text-paperMuted">
        O que você procura não existe ou foi removido.
      </p>
      <Link
        href="/home"
        className="mt-6 rounded-xl bg-foil px-5 py-3 font-bold text-leather transition-opacity hover:opacity-90"
      >
        Voltar para o início
      </Link>
    </main>
  );
}
