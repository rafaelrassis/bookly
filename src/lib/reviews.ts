import type { Book } from "@/generated/prisma/client";

/** Formato de `Book` consumido pelo front (mesmo shape do catálogo mocado em data/books.ts). */
export function serializeBook(book: Book) {
  return {
    id: book.id,
    title: book.title,
    authors: book.authors,
    year: book.year,
    pages: book.pages,
    genre: book.genre,
    gradient: [book.gradientFrom, book.gradientTo] as [string, string],
    avg: book.avg,
    count: book.count,
    synopsis: book.synopsis,
  };
}
