/**
 * Backfill único (não roda automaticamente no build) pra criar 1 ReadingEvent
 * por ShelfEntry já concluído (status=READ + finishedAt) antes da feature de
 * releituras existir. Idempotente: pula ShelfEntry que já tem ReadingEvent.
 * PASSO OBRIGATÓRIO antes de trocar /api/goals/[year] e /api/stats/[year]
 * pra contar por ReadingEvent (ver spec releituras, Seção 4) — sem isso todo
 * histórico de leituras concluídas antes desta feature some das metas e
 * estatísticas. Rodar manualmente: `npx tsx scripts/backfill-reading-events.ts`.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("backfill-reading-events: sem DATABASE_URL, abortando.");
    return;
  }

  const adapter = new PrismaPg({ connectionString });
  const db = new PrismaClient({ adapter });

  try {
    const entries = await db.shelfEntry.findMany({
      where: { status: "READ", finishedAt: { not: null } },
    });
    console.log(`backfill-reading-events: ${entries.length} ShelfEntry lidos encontrados.`);

    let created = 0;
    let skipped = 0;
    for (const entry of entries) {
      const existing = await db.readingEvent.findFirst({
        where: { shelfEntryId: entry.id },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await db.readingEvent.create({
        data: {
          userId: entry.userId,
          bookId: entry.bookId,
          shelfEntryId: entry.id,
          startedAt: entry.startedAt ?? entry.finishedAt!,
          finishedAt: entry.finishedAt!,
        },
      });
      created++;
    }

    console.log(`backfill-reading-events: ${created} criados, ${skipped} já existiam.`);

    const [eventCount, shelfCount] = await Promise.all([
      db.readingEvent.count(),
      db.shelfEntry.count({ where: { status: "READ", finishedAt: { not: null } } }),
    ]);
    if (eventCount !== shelfCount) {
      console.error(
        `backfill-reading-events: DIVERGÊNCIA — ${eventCount} ReadingEvent vs ${shelfCount} ShelfEntry lidos. Não prossiga pra Seção 4 (troca das queries de metas/estatísticas) sem investigar.`
      );
      process.exit(1);
    }
    console.log(`backfill-reading-events: OK — contagens batem (${eventCount}).`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("backfill-reading-events: falhou:", err);
  process.exit(1);
});
