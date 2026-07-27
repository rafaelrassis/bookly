import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ProfilePageClient } from "./ProfilePageClient";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const username = decodeURIComponent(params.username).replace(/^@/, "");
  const user = await db.user.findUnique({
    where: { username },
    select: { name: true, bio: true, username: true },
  });
  if (!user) return { title: "Perfil não encontrado" };

  const title = user.name;
  const description = user.bio || `@${user.username} no Bookly.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default function PublicProfilePage({ params }: { params: { username: string } }) {
  return <ProfilePageClient params={params} />;
}
