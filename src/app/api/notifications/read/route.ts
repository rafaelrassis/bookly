import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ ids: z.array(z.string()).optional() }); // ausente = todas

/** Marca notificações como lidas. O `userId` no `where` garante que ninguém
 * marca notificação alheia como lida. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const { ids } = parsed.data;
  await db.notification.updateMany({
    where: { userId: session.user.id, read: false, ...(ids ? { id: { in: ids } } : {}) },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
