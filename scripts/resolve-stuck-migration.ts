/**
 * Guarda de build: destrava o `prisma migrate deploy` se a migração
 * `20260728015418_oauth_google_amazon` ficou marcada como "failed" em
 * produção (P3009). O commit 2ef13f8 corrigiu o SQL da migração, mas a
 * correção de código sozinha não limpa o estado já persistido em
 * `_prisma_migrations` — sem acesso interativo ao banco de produção pra
 * rodar `prisma migrate resolve` manualmente, este script faz o mesmo
 * resolve de forma automática e idempotente antes de cada `migrate deploy`.
 *
 * Só age se a migração está mesmo "started sem terminar" (finished_at
 * nulo e ainda não rolled back) — em qualquer outro estado (nunca rodou,
 * já aplicada, já resolvida) é um no-op. Seguro reaplicar em todo build.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const STUCK_MIGRATION = "20260728015418_oauth_google_amazon";

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("resolve-stuck-migration: sem DATABASE_URL/DIRECT_URL, pulando.");
    return;
  }

  const adapter = new PrismaPg({ connectionString });
  const db = new PrismaClient({ adapter });

  try {
    const rows = await db.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE migration_name = ${STUCK_MIGRATION}
        AND finished_at IS NULL
        AND rolled_back_at IS NULL
    `;

    if (rows.length === 0) {
      console.log(`resolve-stuck-migration: ${STUCK_MIGRATION} não está travada, nada a fazer.`);
      return;
    }

    console.log(`resolve-stuck-migration: ${STUCK_MIGRATION} travada (P3009), resolvendo como rolled-back...`);
    execFileSync("npx", ["prisma", "migrate", "resolve", "--rolled-back", STUCK_MIGRATION], {
      stdio: "inherit",
    });
    console.log("resolve-stuck-migration: resolvida, migrate deploy vai reaplicar a versão corrigida.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("resolve-stuck-migration: falhou:", err);
  process.exit(1);
});
