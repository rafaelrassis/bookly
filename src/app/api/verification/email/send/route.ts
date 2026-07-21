import { NextResponse } from "next/server";
import { z } from "zod";
import { CooldownError, sendEmailCode } from "@/lib/verification";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
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
