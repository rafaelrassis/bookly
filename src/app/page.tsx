"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { Logo } from "@/components/Logo";
import { SectionTitle } from "@/components/SectionTitle";
import { useTopBooks } from "@/lib/store/hooks";
import { useStore } from "@/lib/store";

const FEATURES = [
  {
    icon: "★",
    title: "Avalie!",
    text: "Dê estrelas aos livros que você leu e compartilhe sua opinião com a comunidade.",
  },
  {
    icon: "❖",
    title: "Organize!",
    text: "Acompanhe seu progresso de leitura, registre seu avanço e destaque suas citações preferidas.",
  },
  {
    icon: "❋",
    title: "Leia em conjunto!",
    text: "Participe de clubes para compartilhar suas opiniões e seu progresso com seus amigos.",
  },
  {
    icon: "✦",
    title: "Descubra!",
    text: "Encontre recomendações de novos livros com base no que você gosta e no que você já leu.",
  },
];

export default function LandingPage() {
  const loggedIn = useStore((s) => s.user.loggedIn);
  const router = useRouter();
  const topBooks = useTopBooks(4);

  useEffect(() => {
    if (loggedIn) router.replace("/home");
  }, [loggedIn, router]);

  if (loggedIn) return null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pb-10 pt-16">
      <div className="text-center">
        <Logo className="text-5xl" />
        <p className="mt-3 text-lg text-paperDim">
          Registre o que você lê.
          <br />
          Descubra o que ler.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/login"
          className="rounded-xl bg-foil px-5 py-3.5 text-center font-bold text-leather transition-opacity hover:opacity-90"
        >
          Criar conta grátis
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-line bg-card px-5 py-3.5 text-center font-bold text-paper transition-colors hover:bg-card2"
        >
          Já tenho conta
        </Link>
      </div>

      <section className="mt-10">
        <SectionTitle>Top livros do mês</SectionTitle>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5">
          {topBooks.map((book) => (
            <BookCover key={book.id} book={book} width={96} />
          ))}
        </div>
      </section>

      <section className="mt-10 flex flex-col gap-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-card2 text-lg text-foil"
                aria-hidden="true"
              >
                {feature.icon}
              </span>
              <h3 className="font-bold">{feature.title}</h3>
            </div>
            <p className="mt-2 text-sm text-paperDim">{feature.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
