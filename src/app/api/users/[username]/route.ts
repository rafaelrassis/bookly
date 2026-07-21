import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeProfile } from "@/lib/users";

export async function GET(_req: Request, { params }: { params: { username: string } }) {
  const target = await db.user.findUnique({
    where: { username: params.username },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const session = await auth();
  const profile = await serializeProfile(target.id, session?.user?.id);
  return NextResponse.json(profile);
}
