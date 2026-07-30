import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeWeeklyStreak } from "@/lib/streak";

/** Streak semanal de leitura de cada membro do clube (Spec streaks) — conta
 * ProgressLog de todos os livros do usuário, não só o do clube: quem
 * terminou cedo e está lendo outra coisa não deve ser subestimado. Sem
 * ranking — o front mantém a ordem de sempre, não ordena por streak. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const club = await db.club.findUnique({
    where: { id: params.id },
    select: { visibility: true, members: { select: { userId: true } } },
  });
  if (!club) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  const isMember = club.members.some((m) => m.userId === uid);
  if (club.visibility === "private" && !isMember) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  const memberIds = club.members.map((m) => m.userId);
  const logs = await db.progressLog.findMany({
    where: { userId: { in: memberIds } },
    select: { userId: true, loggedAt: true },
  });
  const byUser = new Map<string, Date[]>();
  for (const log of logs) {
    const dates = byUser.get(log.userId) ?? [];
    dates.push(log.loggedAt);
    byUser.set(log.userId, dates);
  }

  const streaks = memberIds.map((userId) => ({
    userId,
    streak: computeWeeklyStreak(byUser.get(userId) ?? []),
  }));

  return NextResponse.json({ streaks });
}
