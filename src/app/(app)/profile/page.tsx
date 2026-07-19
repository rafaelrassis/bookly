"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { Stars } from "@/components/Stars";
import { formatDecimal } from "@/lib/format";
import { useMyStats, useUser } from "@/lib/store";

export default function ProfilePage() {
  const { user, logout } = useUser();
  const { readCount, reviewCount, avgRating, ratedBooks } = useMyStats();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/");
  }

  const stats = [
    { label: "lidos", value: String(readCount) },
    { label: "reviews", value: String(reviewCount) },
    { label: "sua média", value: avgRating !== null ? formatDecimal(avgRating) : "–" },
  ];

  return (
    <div className="px-5 pt-8">
      <div className="flex flex-col items-center text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-card2 font-display text-3xl font-bold text-foil"
          aria-hidden="true"
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold">{user.name}</h1>
        <p className="text-paperDim">@{user.username}</p>
        {user.genres.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {user.genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-paperDim"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-7 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-line bg-card py-4 text-center"
          >
            <p className="font-display text-2xl font-bold text-foil">{stat.value}</p>
            <p className="mt-0.5 text-xs text-paperDim">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">Livros avaliados</h2>
        {ratedBooks.length === 0 ? (
          <p className="mt-3 text-sm text-paperDim">
            Você ainda não avaliou nenhum livro.{" "}
            <Link href="/search" className="font-bold text-foil">
              Buscar livros
            </Link>
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-4 gap-3">
            {ratedBooks.map(({ book, rating }) => (
              <Link
                key={book.id}
                href={`/book/${book.id}`}
                aria-label={book.title}
                className="flex flex-col items-center gap-1 rounded-md"
              >
                <BookCover book={book} width={88} />
                <Stars rating={rating} className="text-[10px]" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-10 w-full rounded-xl border border-line bg-card px-5 py-3.5 font-bold text-ribbon transition-colors hover:bg-card2"
      >
        Sair
      </button>
    </div>
  );
}
