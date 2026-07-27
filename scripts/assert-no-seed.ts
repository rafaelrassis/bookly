/**
 * Guarda de regressão: falha (exit 1) se o seed legado voltar de qualquer
 * jeito — dado no banco, arquivo de seed recriado, ou referência a "seed"
 * de volta ao build/CI. Roda no CI antes do build pra nunca mais depender
 * de inspeção manual (ver spec "purge-seed-production").
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const ROOT = path.resolve(__dirname, "..");
const failures: string[] = [];

/** Mesmo critério de `scripts/purge-seed.ts` — usernames/emails fixos que
 * prisma/seed.ts criava. */
const SEED_USERNAMES = [
  "ana.estante",
  "leituras.do.vale",
  "thriller.gab",
  "pedro_le",
  "caio_reads",
  "rafa.books",
  "demo",
];

function checkSeedFilesGone() {
  for (const rel of ["prisma/seed.ts", "prisma/seed-data.ts"]) {
    if (existsSync(path.join(ROOT, rel))) {
      failures.push(`${rel} existe — o seed de app não pode voltar ao repo.`);
    }
  }
}

function checkNoSeedReferenceInBuild() {
  const targets = [
    "package.json",
    "vercel.json",
    "next.config.mjs",
    "next.config.js",
    "prisma.config.ts",
  ];
  for (const rel of targets) {
    const file = path.join(ROOT, rel);
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/seed/i.test(line) && !/purge-seed|assert-no-seed/i.test(line)) {
        failures.push(`${rel}:${i + 1} referencia "seed": ${line.trim()}`);
      }
    });
  }

  let grepOut = "";
  try {
    grepOut = execFileSync(
      "grep",
      ["-rniE", "seed", ".github"],
      { cwd: ROOT, encoding: "utf8" }
    );
  } catch (err: any) {
    // grep sai com status 1 quando não acha nada — não é erro.
    if (err.status !== 1) throw err;
  }
  for (const line of grepOut.split("\n").filter(Boolean)) {
    if (/purge-seed|assert-no-seed|guard:no-seed/i.test(line)) continue;
    failures.push(`referencia "seed" no CI: ${line.trim()}`);
  }
}

async function checkNoSeedUsersInDb() {
  if (!process.env.DATABASE_URL) return;
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });
  try {
    const found = await db.user.findMany({
      where: {
        OR: [
          { username: { in: SEED_USERNAMES } },
          { email: { endsWith: "@seed.bookly.local" } },
          { email: "demo@bookly.dev" },
        ],
      },
      select: { username: true, email: true },
    });
    for (const u of found) {
      failures.push(`usuário de seed no banco: ${u.username} <${u.email}>`);
    }
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  checkSeedFilesGone();
  checkNoSeedReferenceInBuild();
  await checkNoSeedUsersInDb();

  if (failures.length > 0) {
    console.error("❌ Guarda de seed falhou:\n");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("✅ Nenhum vestígio de seed encontrado (arquivos, build/CI, banco).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
