import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";

function parseYear(yearStr: string): number | null {
  const year = Number(yearStr);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  return year;
}

/** Dia do ano (1-indexado) e total de dias no ano, em UTC. */
function yearProgress(year: number) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
  const daysInYear = Math.floor((end.getTime() - start.getTime()) / 86400000);
  return { start, end, dayOfYear: Math.max(1, Math.min(dayOfYear, daysInYear)), daysInYear };
}

/** Meta anual + progresso derivado de ReadingEvent (conclusões de leitura no
 * ano, inclusive releituras — cada uma conta). */
export async function GET(_req: Request, { params }: { params: { year: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const year = parseYear(params.year);
  if (year === null) return NextResponse.json({ error: "ano inválido" }, { status: 400 });

  const { start, end, dayOfYear, daysInYear } = yearProgress(year);

  const [goal, read] = await Promise.all([
    db.readingGoal.findUnique({
      where: { userId_year: { userId: session.user.id, year } },
    }),
    db.readingEvent.count({
      where: {
        userId: session.user.id,
        finishedAt: { gte: start, lt: end },
      },
    }),
  ]);

  const target = goal?.targetBooks ?? null;
  const percent = target && target > 0 ? Math.min(100, Math.round((read / target) * 100)) : null;
  const expected = target ? Math.round(target * (dayOfYear / daysInYear)) : null;
  const pace = expected != null ? read - expected : null;

  return NextResponse.json({ year, target, read, percent, pace });
}

const putSchema = z.object({
  targetBooks: z.number().int().min(1).max(1000),
});

export async function PUT(req: Request, { params }: { params: { year: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const limited = await checkRateLimit("write", session.user.id);
  if (limited) return limited;

  const year = parseYear(params.year);
  if (year === null) return NextResponse.json({ error: "ano inválido" }, { status: 400 });

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "targetBooks deve ser inteiro entre 1 e 1000" }, { status: 400 });
  }
  const { targetBooks } = parsed.data;

  const goal = await db.readingGoal.upsert({
    where: { userId_year: { userId: session.user.id, year } },
    create: { userId: session.user.id, year, targetBooks },
    update: { targetBooks },
  });

  return NextResponse.json({ goal });
}

export async function DELETE(_req: Request, { params }: { params: { year: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const limited = await checkRateLimit("write", session.user.id);
  if (limited) return limited;

  const year = parseYear(params.year);
  if (year === null) return NextResponse.json({ error: "ano inválido" }, { status: 400 });

  await db.readingGoal
    .delete({ where: { userId_year: { userId: session.user.id, year } } })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
