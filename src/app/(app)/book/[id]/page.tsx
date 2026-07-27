import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ogTruncate } from "@/lib/og";
import { BookPageClient } from "./BookPageClient";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const book = await db.book.findUnique({ where: { id: params.id } });
  if (!book) return { title: "Livro não encontrado" };

  const meta = [book.authors, book.year > 0 ? String(book.year) : null].filter(Boolean).join(" · ");
  const description = book.synopsis ? `${meta} — ${ogTruncate(book.synopsis, 200)}` : meta;

  return {
    title: book.title,
    description,
    openGraph: { title: book.title, description },
    twitter: { title: book.title, description },
  };
}

export default function BookPage({ params }: { params: { id: string } }) {
  return <BookPageClient params={params} />;
}
