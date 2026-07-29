import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recomputeBookRating } from "@/lib/books";
import { checkRateLimit } from "@/lib/ratelimit";
import { parseGoodreadsCsv, type GoodreadsRow } from "@/lib/import/goodreads";
import { resolveBook } from "@/lib/import/resolve";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_LOOKUPS = 200; // chamadas ao Google por import — protege a cota compartilhada (spec §1)

const STATUS_MAP: Record<GoodreadsRow["shelf"], "WANT_TO_READ" | "READING" | "READ"> = {
  read: "READ",
  "currently-reading": "READING",
  "to-read": "WANT_TO_READ",
};

/** Grava estante + review de uma linha já resolvida. Idempotente via upsert
 * na chave [userId, bookId] — reimportar o mesmo CSV atualiza, não duplica. */
async function applyRow(userId: string, bookId: string, row: GoodreadsRow) {
  const status = STATUS_MAP[row.shelf];

  await db.$transaction(async (tx) => {
    const prev = await tx.shelfEntry.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });

    const startedAt = prev?.startedAt ?? row.dateAdded ?? null;
    const finishedAt = status === "READ" ? (row.dateRead ?? prev?.finishedAt ?? null) : null;

    await tx.shelfEntry.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: { userId, bookId, status, startedAt, finishedAt },
      update: { status, startedAt, finishedAt },
    });

    // Rating é obrigatório no schema (Review.rating: Float não-nulo) — sem
    // nota (myRating === 0) não cria review, mesmo com texto (mesma
    // convenção do PUT /review: nota <= 0 == "sem review").
    if (row.myRating > 0) {
      await tx.review.upsert({
        where: { userId_bookId: { userId, bookId } },
        create: {
          userId,
          bookId,
          rating: row.myRating,
          text: row.review ?? "",
          startedAt,
          finishedAt,
        },
        update: {
          rating: row.myRating,
          text: row.review ?? "",
          startedAt,
          finishedAt,
        },
      });
      await recomputeBookRating(tx, bookId);
    }
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const limited = await checkRateLimit("import", uid);
  if (limited) return limited;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie o arquivo CSV." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Arquivo grande demais (máx 5MB)." }, { status: 413 });
  }

  const rows = parseGoodreadsCsv(await file.text());
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "CSV vazio ou formato não reconhecido." },
      { status: 400 },
    );
  }

  const budget = { googleCalls: 0, max: MAX_LOOKUPS };
  let imported = 0;
  let deferred = 0; // não processado — cap de cota atingido
  let failed = 0; // erro inesperado ao gravar (não impede o resto do import)
  const notFound: { title: string; author: string }[] = [];

  // Sequencial de propósito: paralelizar dispararia várias chamadas
  // simultâneas ao Google Books e ao Postgres. Import é UX de espera, não
  // tempo real — ver spec §1/§5.
  for (const row of rows) {
    const res = await resolveBook(row, budget);
    if ("skipped" in res) {
      deferred++;
      continue;
    }
    if ("notFound" in res) {
      notFound.push({ title: row.title, author: row.author });
      continue;
    }

    try {
      await applyRow(uid, res.book.id, row);
      imported++;
    } catch (err) {
      console.error("goodreads import: falha ao gravar linha", row.title, err);
      failed++;
    }
  }

  return NextResponse.json({
    total: rows.length,
    imported,
    deferred,
    failed,
    notFound,
  });
}
