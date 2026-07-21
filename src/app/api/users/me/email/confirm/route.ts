import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { consumeEmailChangeCode } from "@/lib/verification";

const schema = z.object({ newEmail: z.string().email(), code: z.string().length(6) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { newEmail, code } = parsed.data;

  const taken = await db.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  if (taken) return NextResponse.json({ error: "e-mail em uso" }, { status: 409 });

  const ok = await consumeEmailChangeCode(newEmail, code);
  if (!ok) return NextResponse.json({ error: "código inválido ou expirado" }, { status: 400 });

  try {
    const user = await db.user.update({
      where: { id: session.user.id },
      data: { email: newEmail, emailVerified: new Date() },
    });
    return NextResponse.json({ ok: true, email: user.email });
  } catch {
    return NextResponse.json({ error: "e-mail em uso" }, { status: 409 });
  }
}
