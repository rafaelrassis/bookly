"use client";

import Link from "next/link";
import { getBook } from "@/data/books";
import { BookCover } from "@/components/BookCover";
import { SectionTitle } from "@/components/SectionTitle";
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
        <h3 className="font-display text-base font-bold">{club.name}</h3>
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
  const showToast = useStore((s) => s.showToast);

  const mine = clubs.filter((c) => c.joined);
  const discover = clubs.filter((c) => !c.joined);

  return (
    <div className="px-5 pt-5">
      <h1 className="text-2xl font-extrabold">Clubes</h1>

      {mine.length > 0 && (
        <section className="mt-5">
          <SectionTitle>Seus clubes</SectionTitle>
          <div className="mt-3 flex flex-col gap-3">
            {mine.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        </section>
      )}

      {discover.length > 0 && (
        <section className="mt-6">
          <SectionTitle>Descubra clubes</SectionTitle>
          <div className="mt-3 flex flex-col gap-3">
            {discover.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => showToast("Criar clube entra na próxima fase ✦")}
        className="mt-6 w-full rounded-xl border border-dashed border-line px-5 py-3.5 font-bold text-paperDim transition-colors hover:text-paper"
      >
        + Criar um clube
      </button>
    </div>
  );
}
