import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";

const CATEGORY_LABEL = {
  erro: "🐞 Erro",
  sugestao: "💡 Sugestão",
  outro: "✉️ Outro",
} as const;

const schema = z.object({
  message: z.string().trim().min(5).max(2000),
  category: z.enum(["erro", "sugestao", "outro"]).default("outro"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const limited = await checkRateLimit("feedback", session.user.id);
  if (limited) return limited;

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { message, category } = parsed.data;

  const from = session.user.email ?? "desconhecido";

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Bookly <onboarding@resend.dev>",
      to: process.env.FEEDBACK_TO_EMAIL!,
      replyTo: session.user.email ?? undefined,
      subject: `[Bookly] ${CATEGORY_LABEL[category]} — ${session.user.name ?? from}`,
      text:
        `Categoria: ${category}\n` +
        `De: ${session.user.name ?? "—"} <${from}> (id: ${session.user.id})\n\n` +
        `${message}\n`,
    });
  } catch (err) {
    console.error("feedback email falhou", err);
    return NextResponse.json({ error: "não foi possível enviar" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
