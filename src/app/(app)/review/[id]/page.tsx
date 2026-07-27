import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ogTruncate } from "@/lib/og";
import { ReviewPageClient } from "./ReviewPageClient";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const review = await db.review.findUnique({
    where: { id: params.id },
    include: { user: { select: { username: true, name: true } }, book: { select: { title: true } } },
  });
  if (!review) return { title: "Review não encontrada" };

  const title = review.title || `Resenha de ${review.book.title}`;
  const description = review.text
    ? ogTruncate(review.text, 200)
    : `${review.user.name} avaliou ${review.book.title} no Bookly.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default function ReviewPage({ params }: { params: { id: string } }) {
  return <ReviewPageClient params={params} />;
}
