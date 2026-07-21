import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailCode } from "@/lib/verification";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ok = await verifyEmailCode(parsed.data.email, parsed.data.code);
  if (!ok) {
    return NextResponse.json({ error: "código inválido ou expirado" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
