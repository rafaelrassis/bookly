import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailLoginEnabled } from "@/lib/featureFlags";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { CooldownError, sendPasswordResetCode } from "@/lib/verification";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  if (!emailLoginEnabled) return NextResponse.json({ error: "not found" }, { status: 404 });

  const limited = await checkRateLimit("write", clientIp(req));
  if (limited) return limited;

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
