import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumePasswordResetCode } from "@/lib/verification";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, code, password } = parsed.data;
  const ok = await consumePasswordResetCode(email, code);
  if (!ok) {
    return NextResponse.json({ error: "código inválido ou expirado" }, { status: 400 });
  }

  await db.user.update({
    where: { email },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });

  return NextResponse.json({ ok: true });
}
