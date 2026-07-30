"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GENRES } from "@/lib/genres";
import { Logo } from "@/components/Logo";
import { withoutAt } from "@/lib/handle";
import { useUsernameCheck } from "@/hooks/useUsernameCheck";
import { useStore } from "@/lib/store";
import { apiErrorMessage } from "@/lib/apiError";
import { UF_LIST } from "@/lib/uf";

export function OnboardingForm() {
  const user = useStore((s) => s.user);
  const applyProfile = useStore((s) => s.applyProfile);
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState(user.bio);
  const [city, setCity] = useState(user.city ?? "");
  const [state, setState] = useState(user.state ?? "");
  const [genres, setGenres] = useState<string[]>(user.genres);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const usernameCheck = useUsernameCheck(withoutAt(username));

  function toggleGenre(genre: string) {
    setGenres((current) =>
      current.includes(genre) ? current.filter((g) => g !== genre) : [...current, genre]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanUsername = withoutAt(username.trim());
    if (!cleanUsername) {
      setError("Escolha um nome de usuário");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: cleanUsername,
        bio: bio.trim(),
        genres,
        city: city.trim() || null,
        state: state || null,
        onboarded: true,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      if (res.status === 429) {
        setError(await apiErrorMessage(res, "Não foi possível salvar"));
        return;
      }
      const body = await res.json().catch(() => null);
      setError(body?.error === "username em uso" ? "Nome de usuário já em uso" : "Não foi possível salvar");
      return;
    }
    const profile = await res.json();
    applyProfile({
      username: profile.username,
      bio: profile.bio,
      genres: profile.genres,
      city: profile.city,
      state: profile.state,
    });
    router.push("/home");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pb-10 pt-14">
      <Link href="/" className="self-start text-sm text-paperDim hover:text-paper">
        ‹ Voltar
      </Link>

      <Logo className="mt-6 text-3xl" />
      <h1 className="mt-6 text-2xl font-extrabold">Vamos montar seu perfil</h1>
      <p className="mt-1 text-paperDim">Escolha seu nome de usuário e conte o que você gosta de ler.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-1 flex-col">
        <div className="flex flex-col gap-3">
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
                pattern="[a-z0-9._-]+"
                placeholder="meninomaluquinho"
                className="w-full bg-transparent py-3 pl-1 text-base text-paper placeholder:text-paperDim/60 focus:outline-none"
              />
            </div>
            {usernameCheck.state === "checking" && (
              <p className="text-xs text-paperDim">Verificando…</p>
            )}
            {usernameCheck.state === "available" && (
              <p className="text-xs text-green-600">Disponível ✓</p>
            )}
            {usernameCheck.state === "taken" && (
              <p className="text-xs text-red-600">Já está em uso</p>
            )}
            {usernameCheck.state === "invalid" && (
              <p className="text-xs text-red-600">{usernameCheck.error}</p>
            )}
          </label>

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

          <div className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
            Localização (opcional)
            <div className="flex gap-2">
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                aria-label="Estado (UF)"
                className="w-24 rounded-xl border border-line bg-card px-3 py-3 text-base text-paper"
              >
                <option value="">UF</option>
                {UF_LIST.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade"
                aria-label="Cidade"
                maxLength={80}
                className="min-w-0 flex-1 rounded-xl border border-line bg-card px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
              />
            </div>
            <p className="text-xs text-paperDim/80">
              Usado para mostrar doações perto de você. Pode pular e preencher depois no perfil.
            </p>
          </div>
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

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={
            saving ||
            usernameCheck.state === "taken" ||
            usernameCheck.state === "invalid" ||
            usernameCheck.state === "checking"
          }
          className="mt-10 rounded-xl bg-foil px-5 py-3.5 font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Começar a ler"}
        </button>
      </form>
    </main>
  );
}
