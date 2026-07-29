import { NextResponse } from "next/server";
import { z } from "zod";
import { emailLoginEnabled } from "@/lib/featureFlags";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { CooldownError, sendEmailCode } from "@/lib/verification";

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

  try {
    await sendEmailCode(parsed.data.email);
  } catch (err) {
    if (err instanceof CooldownError) {
      return NextResponse.json({ error: "aguarde antes de reenviar" }, { status: 429 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
