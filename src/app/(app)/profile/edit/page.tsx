"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_CHOICES } from "@/lib/avatars";
import { AvatarUpload } from "@/components/AvatarUpload";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Section } from "@/components/ui/Section";
import { withoutAt } from "@/lib/handle";
import { UF_LIST } from "@/lib/uf";
import { useUsernameCheck } from "@/hooks/useUsernameCheck";
import { useBooksByIds } from "@/lib/store/hooks";
import { useStore } from "@/lib/store";
import type { Book } from "@/lib/types";
import { apiErrorMessage } from "@/lib/apiError";

export default function EditProfilePage() {
  const user = useStore((s) => s.user);
  const applyProfile = useStore((s) => s.applyProfile);
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();

  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatar);
  const [bio, setBio] = useState(user.bio);
  const [city, setCity] = useState(user.city ?? "");
  const [state, setState] = useState(user.state ?? "");
  const [top4, setTop4] = useState<string[]>(user.top4);
  const [saving, setSaving] = useState(false);
  const [readShelfBooks, setReadShelfBooks] = useState<Book[]>([]);

  const usernameCheck = useUsernameCheck(withoutAt(username), user.username);

  useEffect(() => {
    fetch("/api/shelf?status=READ")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setReadShelfBooks(data.items.map((i: { book: Book }) => i.book)));
  }, []);

  // favoritos escolhidos entre os livros lidos (+ os já favoritos, mesmo que
  // não estejam mais marcados como lidos)
  const missingFavoriteIds = top4.filter((id) => !readShelfBooks.some((b) => b.id === id));
  const extraFavorites = useBooksByIds(missingFavoriteIds);
  const readBooks = [...readShelfBooks, ...extraFavorites];

  function toggleFavorite(bookId: string) {
    setTop4((current) => {
      if (current.includes(bookId)) return current.filter((id) => id !== bookId);
      if (current.length >= 4) {
        showToast("Máximo de 4 favoritos");
        return current;
      }
      return [...current, bookId];
    });
  }

  async function save() {
    const name = withoutAt(username.trim());
    if (!name) {
      showToast("Escolha um nome de usuário");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: name,
        avatar,
        bio: bio.trim(),
        top4,
        city: city.trim() || null,
        state: state || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      if (res.status === 429) {
        showToast(await apiErrorMessage(res, "Não foi possível salvar"));
        return;
      }
      const body = await res.json().catch(() => null);
      showToast(body?.error === "username em uso" ? "Nome de usuário já em uso" : "Não foi possível salvar");
      return;
    }
    const profile = await res.json();
    applyProfile({
      username: profile.username,
      avatar: profile.avatar,
      bio: profile.bio,
      top4: profile.top4,
      city: profile.city,
      state: profile.state,
    });
    showToast("Perfil atualizado ✦");
    router.push("/profile");
  }

  return (
    <div className="pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Editar perfil</h1>
      </BackHeader>

      <Section title="Foto">
        <AvatarUpload />

        {!user.avatarUrl && (
          <div className="mt-3 flex flex-wrap gap-3">
            {AVATAR_CHOICES.map(([from, to], i) => (
              <button
                key={i}
                type="button"
                onClick={() => setAvatar(i)}
                aria-label={`Avatar ${i + 1}`}
                aria-pressed={avatar === i}
                className={`h-14 w-14 rounded-full transition-transform ${
                  avatar === i ? "ring-2 ring-foil ring-offset-2 ring-offset-leather" : ""
                }`}
                style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
              />
            ))}
          </div>
        )}
      </Section>

      <section className="mt-6 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-paperMuted">
          Nome de usuário
          <div className="flex items-center rounded-xl border border-line bg-card px-4">
            <span className="text-paperMuted">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-transparent py-3 pl-1 text-base text-paper focus:outline-none"
            />
          </div>
          {usernameCheck.state === "checking" && (
            <p className="text-xs text-paperMuted">Verificando…</p>
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
        <Field label="Bio" id="profile-bio">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="min-h-tap w-full resize-none rounded-xl border border-line bg-card px-4 py-3 text-base text-paper focus:border-foil/60"
          />
        </Field>
        <div className="flex flex-col gap-1.5 text-sm font-medium text-paperMuted">
          Localização
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
            <Input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Cidade"
              aria-label="Cidade"
              maxLength={80}
              className="min-w-0 flex-1"
            />
          </div>
          <p className="text-xs text-paperMuted">Usado para mostrar doações perto de você.</p>
        </div>
      </section>

      <Section title="Favoritos" action={<span className="text-xs font-bold text-paperMuted">{top4.length}/4</span>}>
        <p className="text-xs text-paperMuted">Escolha até 4 entre os livros que você leu.</p>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {readBooks.map((book) => {
            const selected = top4.includes(book.id);
            return (
              <button
                key={book.id}
                type="button"
                onClick={() => toggleFavorite(book.id)}
                aria-pressed={selected}
                aria-label={book.title}
                className={`relative rounded-md transition-opacity ${
                  selected ? "" : "opacity-60 hover:opacity-90"
                }`}
              >
                <BookCover book={book} width={88} />
                {selected && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foil text-meta text-leather">
                    {top4.indexOf(book.id) + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Section>

      <div className="mb-4 mt-8 flex gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-xl border border-line bg-card px-5 py-3.5 font-bold text-paperMuted transition-colors hover:text-paper"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={
            saving ||
            usernameCheck.state === "taken" ||
            usernameCheck.state === "invalid" ||
            usernameCheck.state === "checking"
          }
          className="flex-1 rounded-xl bg-foil px-5 py-3.5 font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}
