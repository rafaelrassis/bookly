import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type DbClient = typeof db | Prisma.TransactionClient;

/** Grava 1 ReadingEvent pra cada conclusão real de leitura (transição pra
 * READ) — chamado nos 3 pontos que setam status=READ (progresso por página,
 * troca manual de status e avaliar/dar nota). Reler (POST reread) reseta o
 * ShelfEntry sem apagar os eventos já gravados. */
export async function recordReadingEvent(
  tx: DbClient,
  shelfEntry: { id: string; userId: string; bookId: string; startedAt: Date | null }
) {
  await tx.readingEvent.create({
    data: {
      userId: shelfEntry.userId,
      bookId: shelfEntry.bookId,
      shelfEntryId: shelfEntry.id,
      startedAt: shelfEntry.startedAt ?? new Date(),
      finishedAt: new Date(),
    },
  });
}
