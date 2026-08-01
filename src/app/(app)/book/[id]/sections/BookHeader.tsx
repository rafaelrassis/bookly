import { BookCover } from "@/components/BookCover";
import { Stars } from "@/components/Stars";
import { formatCount, formatDecimal } from "@/lib/format";
import type { Book } from "@/lib/types";

/** Capa + título + metadados + média — coluna fixa à esquerda no desktop. */
export function BookHeader({ book }: { book: Book }) {
  return (
    <section className="flex gap-5 lg:flex-col lg:items-center lg:text-center">
      <BookCover book={book} width={108} className="lg:h-auto lg:w-40" />
      <div className="min-w-0 self-center lg:self-auto">
        <h1 className="font-display text-xl font-bold leading-snug">{book.title}</h1>
        <p className="mt-1 text-sm text-paperMuted">
          {book.authors} · {book.year}
          {book.pages > 0 ? ` · ${book.pages} pág.` : ""} · {book.genre}
        </p>
        <div className="mt-3 flex items-center gap-2 lg:justify-center">
          <span className="font-display text-4xl font-black text-foil">{formatDecimal(book.avg)}</span>
          <Stars rating={book.avg} className="text-sm" />
        </div>
        <p className="mt-1 text-xs text-paperMuted">média · {formatCount(book.count)} avaliações</p>
      </div>
    </section>
  );
}
