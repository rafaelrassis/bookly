"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GENRES } from "@/data/books";
import { Logo } from "@/components/Logo";
import { useUser } from "@/lib/store";

export default function OnboardingPage() {
  const { user, completeOnboarding } = useUser();
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [genres, setGenres] = useState<string[]>(user.genres);

  function toggleGenre(genre: string) {
    setGenres((current) =>
      current.includes(genre) ? current.filter((g) => g !== genre) : [...current, genre]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    completeOnboarding(name.trim() || user.name, username.trim() || user.username, genres);
    router.push("/home");
  }

  return (
    <main className="flex min-h-dvh flex-col px-5 pb-10 pt-14">
      <Logo className="text-3xl" />
      <h1 className="mt-6 font-display text-2xl font-bold">Vamos montar seu perfil</h1>
      <p className="mt-1 text-paperDim">Conte quem você é e o que gosta de ler.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-1 flex-col">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
            Nome
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-line bg-card px-4 py-3 text-base text-paper"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
            Nome de usuário
            <div className="flex items-center rounded-xl border border-line bg-card px-4">
              <span className="text-paperDim">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent py-3 pl-1 text-base text-paper focus:outline-none"
              />
            </div>
          </label>
        </div>

        <fieldset className="mt-8">
          <legend className="text-sm font-medium text-paperDim">
            Gêneros de interesse
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {GENRES.map((genre) => {
              const selected = genres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  aria-pressed={selected}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selected
                      ? "bg-foil font-bold text-leather"
                      : "border border-line bg-card text-paperDim hover:text-paper"
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          className="mt-10 rounded-xl bg-foil px-5 py-3.5 font-bold text-leather transition-opacity hover:opacity-90"
        >
          Começar a ler ✦
        </button>
      </form>
    </main>
  );
}
