import { db } from "@/lib/db";

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Código de convite de clube privado: 6 caracteres A–Z0–9 (mesmo formato
 * do randomCode do store antigo e do skill de verificação). */
export function generateClubCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

/** Percentual de leitura derivado da estante: 100 se lido, currentPage/pages
 * se lendo, 0 caso contrário (sem estante, quero ler, etc). */
export function shelfPercent(
  entry: { status: string; currentPage: number | null } | null | undefined,
  pages: number
): number {
  if (!entry) return 0;
  if (entry.status === "READ") return 100;
  if (entry.status === "READING" && entry.currentPage != null && pages > 0) {
    return Math.min(100, Math.round((entry.currentPage / pages) * 100));
  }
  return 0;
}

/** Progresso médio do clube: média do percentual derivado de cada membro. */
export async function averageClubProgress(bookId: string, pages: number, memberIds: string[]) {
  if (memberIds.length === 0) return 0;
  const entries = await db.shelfEntry.findMany({
    where: { bookId, userId: { in: memberIds } },
    select: { userId: true, status: true, currentPage: true },
  });
  const byUser = new Map(entries.map((e) => [e.userId, e]));
  const total = memberIds.reduce((sum, id) => sum + shelfPercent(byUser.get(id), pages), 0);
  return Math.round(total / memberIds.length);
}

/** Chamado pelo endpoint de progresso (Spec 3a) sempre que a página atual
 * muda. Publica uma mensagem de sistema nos clubes do usuário cujo tema é
 * este livro — só quando o percentual publicado antes muda, pra não duplicar
 * "avançou para X%" se o usuário reenviar a mesma página. */
export async function publishProgressToClubs(userId: string, bookId: string, percent: number) {
  const memberships = await db.clubMember.findMany({
    where: { userId, club: { bookId } },
    select: { clubId: true, progress: true },
  });
  if (memberships.length === 0) return;

  const user = await db.user.findUnique({ where: { id: userId }, select: { username: true } });
  if (!user) return;

  for (const m of memberships) {
    if (m.progress === percent) continue;
    await db.$transaction([
      db.clubMember.update({
        where: { clubId_userId: { clubId: m.clubId, userId } },
        data: { progress: percent },
      }),
      db.message.create({
        data: {
          clubId: m.clubId,
          userId,
          system: true,
          text: `@${user.username} avançou para ${percent}%`,
        },
      }),
    ]);
  }
}
