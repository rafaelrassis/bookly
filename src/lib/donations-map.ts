import { db } from "@/lib/db";

/** Dado uma lista de bookIds, retorna o subconjunto com doação DISPONIVEL —
 * usado pra marcar o selo "Doação disponível" nos cards de busca/estante. */
export async function idsWithDonations(bookIds: string[]): Promise<Set<string>> {
  if (bookIds.length === 0) return new Set();
  const rows = await db.donation.findMany({
    where: { bookId: { in: bookIds }, status: "DISPONIVEL" },
    select: { bookId: true },
    distinct: ["bookId"],
  });
  return new Set(rows.map((r) => r.bookId));
}
