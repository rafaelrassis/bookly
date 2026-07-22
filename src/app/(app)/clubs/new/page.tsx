"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/BackHeader";
import { BookPicker } from "@/components/BookPicker";
import { LockIcon } from "@/components/icons";
import { SectionTitle } from "@/components/SectionTitle";
import { useStore } from "@/lib/store";
import type { Book, Visibility } from "@/lib/types";

export default function NewClubPage() {
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [book, setBook] = useState<Book | null>(null);
  const [saving, setSaving] = useState(false);

  const valid = name.trim().length > 0 && book !== null;

  async function create() {
    if (!valid || !book || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), bookId: book.id, desc: desc.trim(), visibility }),
      });
      if (!res.ok) {
        showToast("Não foi possível criar o clube");
        return;
      }
      const { id, code } = await res.json();
      showToast(visibility === "private" ? `Clube criado! Código: ${code}` : "Clube criado! 🎉");
      router.push(`/clubs/${id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Criar clube</h1>
      </BackHeader>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
          Nome do clube
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Leitoras de domingo"
            className="rounded-xl border border-line bg-card px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-paperDim">
          Descrição
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            placeholder="Sobre o que é o clube?"
            className="resize-none rounded-xl border border-line bg-card px-4 py-3 text-base text-paper placeholder:text-paperDim/60"
          />
        </label>
      </div>

      <section className="mt-6">
        <SectionTitle>Leitura do clube</SectionTitle>
        <div className="mt-3">
          <BookPicker selected={book} onSelect={setBook} onClear={() => setBook(null)} />
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle>Visibilidade</SectionTitle>
        <div className="mt-3 flex gap-2">
          {(
            [
              { key: "public", label: "Público" },
              { key: "private", label: "Privado" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={visibility === key}
              onClick={() => setVisibility(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-bold transition-colors ${
                visibility === key
                  ? "bg-foil text-leather"
                  : "border border-line bg-card text-paperDim hover:text-paper"
              }`}
            >
              {key === "private" && <LockIcon />}
              {label}
            </button>
          ))}
        </div>
        {visibility === "private" && (
          <p className="mt-2 text-xs text-paperDim">
            Clubes privados geram um código de 6 caracteres para convidar quem você quiser.
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={create}
        disabled={!valid || saving}
        className="mb-4 mt-8 w-full rounded-xl bg-foil px-5 py-3.5 font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Criar clube
      </button>
    </div>
  );
}
