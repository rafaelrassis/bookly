import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";

export async function DELETE(_req: Request, { params }: { params: { quoteId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const limited = await checkRateLimit("write", session.user.id);
  if (limited) return limited;

  await db.quote.deleteMany({ where: { id: params.quoteId, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
