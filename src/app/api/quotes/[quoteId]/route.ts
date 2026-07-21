import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: { quoteId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  await db.quote.deleteMany({ where: { id: params.quoteId, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
