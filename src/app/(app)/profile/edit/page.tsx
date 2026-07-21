"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_CHOICES } from "@/data/users";
import { getBook } from "@/data/books";
import { BackHeader } from "@/components/BackHeader";
import { BookCover } from "@/components/BookCover";
import { SectionTitle } from "@/components/SectionTitle";
import { useStore } from "@/lib/store";

export default function EditProfilePage() {
  const user = useStore((s) => s.user);
  const updateProfile = useStore((s) => s.updateProfile);
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatar);
  const [avatarImage, setAvatarImage] = useState(user.avatarImage);
  const [bio, setBio] = useState(user.bio);
  const [top4, setTop4] = useState<string[]>(user.top4);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Escolha um arquivo de imagem");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  // favoritos escolhidos entre os livros lidos (+ os já favoritos)
  const readBooks = Array.from(
    new Set([
      ...Object.entries(user.shelf)
        .filter(([, e]) => e.status === "READ")
        .map(([id]) => id),
      ...user.top4,
    ])
  )
    .map((id) => getBook(id))
    .filter((b): b is NonNullable<ReturnType<typeof getBook>> => Boolean(b));

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

  function save() {
    const name = username.trim().replace(/^@/, "");
    if (!name) {
      showToast("Escolha um nome de usuário");
      return;
    }
    updateProfile(name, avatar, bio.trim(), top4, avatarImage);
    showToast("Perfil atualizado ✦");
    router.push("/profile");
  }

  return (
    <div className="pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Editar perfil</h1>
      </BackHeader>

      <section className="mt-4">
        <SectionTitle>Foto</SectionTitle>
        <div className="mt-3 flex items-center gap-4">
          {avatarImage ? (
            <img
              src={avatarImage}
              alt=""
              aria-hidden="true"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="h-16 w-16 rounded-full"
              style={{
                backgroundImage: `linear-gradient(135deg, ${AVATAR_CHOICES[avatar][0]}, ${AVATAR_CHOICES[avatar][1]})`,
              }}
            />
          )}
          <div className="flex flex-col gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-line bg-card px-4 py-2 text-xs font-bold text-paper transition-colors hover:bg-card2"
            >
              Enviar foto
            </button>
            {avatarImage && (
              <button
                type="button"
                onClick={() => setAvatarImage(undefined)}
                className="text-xs font-bold text-paperDim hover:text-ribbon"
              >
                Remover foto
              </button>
            )}
          </div>
        </div>

        {!avatarImage && (
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
      </section>

      <section className="mt-6 flex flex-col gap-3">
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
        <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
          Bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="resize-none rounded-xl border border-line bg-card px-4 py-3 text-base text-paper"
          />
        </label>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <SectionTitle>Favoritos</SectionTitle>
          <span className="text-xs font-bold text-paperDim">{top4.length}/4</span>
        </div>
        <p className="mt-1 text-xs text-paperDim">Escolha até 4 entre os livros que você leu.</p>
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
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foil text-[10px] font-bold text-leather">
                    {top4.indexOf(book.id) + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mb-4 mt-8 flex gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-xl border border-line bg-card px-5 py-3.5 font-bold text-paperDim transition-colors hover:text-paper"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          className="flex-1 rounded-xl bg-foil px-5 py-3.5 font-bold text-leather transition-opacity hover:opacity-90"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
