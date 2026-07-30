import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getYearStats } from "@/lib/stats";
import { withoutAt } from "@/lib/handle";
import { YearInBooksPageClient } from "./YearInBooksPageClient";

export async function generateMetadata({
  params,
}: {
  params: { username: string; year: string };
}): Promise<Metadata> {
  const username = withoutAt(decodeURIComponent(params.username));
  const year = Number(params.year);
  const user = await db.user.findUnique({ where: { username }, select: { id: true, name: true } });
  if (!user) return { title: "Perfil não encontrado" };

  const stats = await getYearStats(user.id, year);
  const title = `${user.name} · ${year} em livros`;
  const description =
    stats.booksRead > 0
      ? `${stats.booksRead} ${stats.booksRead === 1 ? "livro lido" : "livros lidos"} em ${year} no Bookly.`
      : `O ano de ${year} de ${user.name} no Bookly.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default function YearInBooksPage({
  params,
}: {
  params: { username: string; year: string };
}) {
  return <YearInBooksPageClient params={params} />;
}
