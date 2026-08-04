import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida");

const schema = z
  .object({
    startedAt: dateSchema.optional(),
    finishedAt: dateSchema.optional(),
  })
  .refine((d) => d.startedAt !== undefined || d.finishedAt !== undefined, {
    message: "informe startedAt ou finishedAt",
  });

/** Meio-dia evita que o fuso do servidor empurre a data pro dia anterior/seguinte. */
function toDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

/** Edição manual das datas de início/fim de leitura — mantém o ReadingEvent
 * mais recente da entry em sincronia pra Wrapped/stats não ficarem
 * inconsistentes com o que aparece na tela do livro. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;
  const bookId = params.id;

  const limited = await checkRateLimit("write", uid);
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { startedAt, finishedAt } = parsed.data;

  const entry = await db.shelfEntry.findUnique({
    where: { userId_bookId: { userId: uid, bookId } },
  });
  if (!entry) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const startedAtDate = startedAt ? toDate(startedAt) : undefined;
  const finishedAtDate = finishedAt ? toDate(finishedAt) : undefined;

  const effectiveStart = startedAtDate ?? entry.startedAt;
  const effectiveFinish = finishedAtDate ?? entry.finishedAt;
  if (effectiveStart && effectiveFinish && effectiveFinish < effectiveStart) {
    return NextResponse.json({ error: "data de fim não pode ser antes da data de início" }, { status: 400 });
  }

  const dateData = {
    ...(startedAtDate && { startedAt: startedAtDate }),
    ...(finishedAtDate && { finishedAt: finishedAtDate }),
  };

  const updated = await db.$transaction(async (tx) => {
    const entryUpdate = await tx.shelfEntry.update({ where: { id: entry.id }, data: dateData });
    const lastEvent = await tx.readingEvent.findFirst({
      where: { shelfEntryId: entry.id },
      orderBy: { finishedAt: "desc" },
    });
    if (lastEvent) {
      await tx.readingEvent.update({ where: { id: lastEvent.id }, data: dateData });
    }
    return entryUpdate;
  });

  return NextResponse.json({ entry: updated });
}
