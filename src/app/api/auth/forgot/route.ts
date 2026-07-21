import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { CooldownError, sendPasswordResetCode } from "@/lib/verification";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email } = parsed.data;
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    try {
      await sendPasswordResetCode(email);
    } catch (err) {
      if (!(err instanceof CooldownError)) throw err;
    }
  }

  // sempre 200: não revela se o e-mail existe
  return NextResponse.json({ ok: true });
}
