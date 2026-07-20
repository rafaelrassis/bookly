"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { Logo } from "@/components/Logo";
import { SectionTitle } from "@/components/SectionTitle";
import { topBooks } from "@/lib/store/hooks";
import { useStore } from "@/lib/store";

const FEATURES = [
  {
    icon: "★",
    title: "Avalie com meia estrela",
    text: "Notas de 0,5 a 5 para registrar exatamente o que você achou de cada leitura.",
  },
  {
    icon: "♥",
    title: "Reviews como rede social",
    text: "Um feed de reviews para curtir, comentar e descobrir sua próxima leitura.",
  },
  {
    icon: "❋",
    title: "Clubes do livro",
    text: "Leia junto: clubes com leitura do mês e mural para discutir cada capítulo.",
  },
];

export default function LandingPage() {
  const loggedIn = useStore((s) => s.user.loggedIn);
  const router = useRouter();

  useEffect(() => {
    if (loggedIn) router.replace("/home");
  }, [loggedIn, router]);

  if (loggedIn) return null;

  return (
    <main className="flex min-h-dvh flex-col px-5 pb-10 pt-16">
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
          {topBooks(4).map((book) => (
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
