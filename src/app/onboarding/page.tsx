"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GENRES } from "@/data/books";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";

export default function OnboardingPage() {
  const user = useStore((s) => s.user);
  const applyProfile = useStore((s) => s.applyProfile);
  const router = useRouter();

  const [bio, setBio] = useState(user.bio);
  const [genres, setGenres] = useState<string[]>(user.genres);

  function toggleGenre(genre: string) {
    setGenres((current) =>
      current.includes(genre) ? current.filter((g) => g !== genre) : [...current, genre]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bio.trim(), genres }),
      });
      if (res.ok) {
        const profile = await res.json();
        applyProfile({ bio: profile.bio, genres: profile.genres });
      }
    } catch {
      // onboarding não deve travar por falha de rede — perfil pode ser
      // completado depois em /profile/edit.
    }
    router.push("/home");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pb-10 pt-14">
      <Logo className="text-3xl" />
      <h1 className="mt-6 text-2xl font-extrabold">Vamos montar seu perfil</h1>
      <p className="mt-1 text-paperDim">Conte o que você gosta de ler.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-1 flex-col">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Era uma vez..."
              className="resize-none rounded-xl border border-line bg-card px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
            />
          </label>
        </div>

        <fieldset className="mt-8">
          <legend className="text-sm font-medium text-paperDim">Gêneros de interesse</legend>
          <p className="mt-1 text-xs text-paperDim/80">
            Usamos seus gêneros para recomendar livros na busca e no perfil.
          </p>
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
          Começar a ler
        </button>
      </form>
    </main>
  );
}
