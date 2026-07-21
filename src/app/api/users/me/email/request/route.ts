import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CooldownError, sendEmailCode } from "@/lib/verification";

const schema = z.object({ newEmail: z.string().email() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { newEmail } = parsed.data;

  const taken = await db.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  if (taken) return NextResponse.json({ error: "e-mail em uso" }, { status: 409 });

  try {
    await sendEmailCode(newEmail);
  } catch (err) {
    if (err instanceof CooldownError) {
      return NextResponse.json({ error: "aguarde antes de reenviar" }, { status: 429 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
