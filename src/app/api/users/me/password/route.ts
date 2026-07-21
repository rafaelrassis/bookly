import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ current: z.string().min(1), next: z.string().min(8) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { current, next } = parsed.data;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "senha atual incorreta" }, { status: 400 });

  if (current === next) {
    return NextResponse.json(
      { error: "a nova senha deve ser diferente da atual" },
      { status: 400 }
    );
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(next, 10) },
  });

  return NextResponse.json({ ok: true });
}
