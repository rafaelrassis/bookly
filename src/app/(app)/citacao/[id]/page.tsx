import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ogTruncate } from "@/lib/og";
import { CitacaoPageClient } from "./CitacaoPageClient";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const quote = await db.quote.findUnique({
    where: { id: params.id },
    include: { user: { select: { name: true } }, book: { select: { title: true } } },
  });
  if (!quote) return { title: "Citação não encontrada" };

  const title = quote.book.title;
  const description = `“${ogTruncate(quote.text, 160)}” — ${quote.user.name} destacou em ${quote.book.title} no Bookly.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default function CitacaoPage({ params }: { params: { id: string } }) {
  return <CitacaoPageClient params={params} />;
}
