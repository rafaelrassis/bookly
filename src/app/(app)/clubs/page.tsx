"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBook } from "@/data/books";
import { BookCover } from "@/components/BookCover";
import { SectionTitle } from "@/components/SectionTitle";
import { LockIcon } from "@/components/icons";
import { useStore } from "@/lib/store";
import type { Club } from "@/lib/types";

function ClubCard({ club }: { club: Club }) {
  const book = getBook(club.bookId);
  return (
    <Link
      href={`/clubs/${club.id}`}
      className="flex gap-4 rounded-2xl border border-line bg-card p-4 transition-colors hover:bg-card2"
    >
      {book && <BookCover book={book} width={56} />}
      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-1.5 font-display text-base font-bold">
          {club.visibility === "private" && (
            <span className="text-paperDim" aria-label="Clube privado">
              <LockIcon />
            </span>
          )}
          {club.name}
        </h3>
        <p className="text-xs text-paperDim">{club.members} membros</p>
        <p className="mt-1.5 line-clamp-2 text-sm text-paperDim">{club.desc}</p>
        <p className={`mt-2 text-xs font-bold ${club.joined ? "text-foil" : "text-paperDim"}`}>
          {club.joined ? "Participando ✓" : "Ver clube →"}
        </p>
      </div>
    </Link>
  );
}

export default function ClubsPage() {
  const clubs = useStore((s) => s.clubs);
  const joinClubByCode = useStore((s) => s.joinClubByCode);
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();

  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");

  const minePublic = clubs.filter((c) => c.joined && c.visibility === "public");
  const minePrivate = clubs.filter((c) => c.joined && c.visibility === "private");
  const discover = clubs.filter((c) => !c.joined && c.visibility === "public");

  function submitCode() {
    const result = joinClubByCode(code);
    if (result === null) {
      showToast("Código inválido 😕");
      return;
    }
    if (result === "already") {
      showToast("Você já participa desse clube");
      return;
    }
    setCode("");
    setCodeOpen(false);
    showToast("Você entrou no clube! 🎉");
    router.push(`/clubs/${result}`);
  }

  return (
    <div className="px-5 pt-5">
      <h1 className="text-2xl font-extrabold">Clubes</h1>

      <div className="mt-4 flex gap-2">
        <Link
          href="/clubs/new"
          className="flex-1 rounded-xl bg-foil px-4 py-3 text-center text-sm font-bold text-leather transition-opacity hover:opacity-90"
        >
          + Criar um clube
        </Link>
        <button
          type="button"
          onClick={() => setCodeOpen((o) => !o)}
          aria-expanded={codeOpen}
          className="flex-1 rounded-xl border border-line bg-card px-4 py-3 text-sm font-bold text-paper transition-colors hover:bg-card2"
        >
          Entrar com código
        </button>
      </div>

      {codeOpen && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-card p-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && code.length === 6) submitCode();
            }}
            placeholder="ABC123"
            aria-label="Código do clube"
            className="min-w-0 flex-1 rounded-xl border border-line bg-card2 px-4 py-2.5 font-mono text-base uppercase tracking-[0.3em] text-paper placeholder:tracking-[0.3em] placeholder:text-paperDim/40"
          />
          <button
            type="button"
            onClick={submitCode}
            disabled={code.length !== 6}
            className="rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather disabled:opacity-40"
          >
            Entrar
          </button>
        </div>
      )}

      {(minePublic.length > 0 || minePrivate.length > 0) && (
        <section className="mt-6">
          <SectionTitle>Seus clubes</SectionTitle>
          {minePublic.length > 0 && (
            <>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-paperDim/70">
                Públicos
              </p>
              <div className="mt-2 flex flex-col gap-3">
                {minePublic.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            </>
          )}
          {minePrivate.length > 0 && (
            <>
              <p className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-paperDim/70">
                <LockIcon size={10} /> Privados
              </p>
              <div className="mt-2 flex flex-col gap-3">
                {minePrivate.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {discover.length > 0 && (
        <section className="mb-4 mt-6">
          <SectionTitle>Descubra clubes</SectionTitle>
          <div className="mt-3 flex flex-col gap-3">
            {discover.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
