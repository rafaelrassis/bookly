/**
 * Purga os registros de seed (usuários da comunidade + demo, e os livros do
 * catálogo semeado sem uso real) do banco apontado por DATABASE_URL.
 *
 * Critério de seed = exatamente os registros que `prisma/seed.ts` /
 * `prisma/seed-data.ts` criavam (usernames/emails/ids fixos abaixo,
 * capturados antes desses arquivos serem removidos — ver histórico do git).
 *
 * Dry-run por padrão (só SELECT + contagem, nada é apagado). Passe --apply
 * pra executar as deleções de verdade.
 *
 *   npx tsx scripts/purge-seed.ts           # DEV — dry-run
 *   npx tsx scripts/purge-seed.ts --apply   # DEV — apaga de verdade
 *
 *   # PROD (só depois de criar backup/branch no Neon):
 *   DATABASE_URL="<prod>" DIRECT_URL="<prod-direct>" npx tsx scripts/purge-seed.ts
 *   DATABASE_URL="<prod>" DIRECT_URL="<prod-direct>" npx tsx scripts/purge-seed.ts --apply
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { recomputeBookRating } from "../src/lib/books";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");

/** Usuários criados por prisma/seed.ts (comunidade + demo). Username E
 * email precisam bater — evita apagar um usuário real que por acaso tenha
 * escolhido um desses usernames com o próprio e-mail. */
const SEED_USERS = [
  { username: "ana.estante", email: "ana.estante@seed.bookly.local" },
  { username: "leituras.do.vale", email: "leituras.do.vale@seed.bookly.local" },
  { username: "thriller.gab", email: "thriller.gab@seed.bookly.local" },
  { username: "pedro_le", email: "pedro_le@seed.bookly.local" },
  { username: "caio_reads", email: "caio_reads@seed.bookly.local" },
  { username: "rafa.books", email: "rafa.books@seed.bookly.local" },
  { username: "demo", email: "demo@bookly.dev" },
];

/** Livros do catálogo semeado por prisma/seed-data.ts. Só são apagados se
 * não sobrar nenhuma referência real (estante/review/tag/citação/lista/
 * clube) depois de remover os usuários de seed. */
const SEED_BOOK_IDS = [
  "o-nome-do-vento",
  "torto-arado",
  "a-paciente-silenciosa",
  "duna",
  "o-homem-de-giz",
  "verity",
  "1984",
  "ensaio-sobre-a-cegueira",
];

async function main() {
  console.log(`Modo: ${APPLY ? "APPLY (vai deletar)" : "DRY-RUN (só leitura, nada é apagado)"}`);

  const seedUsers = await db.user.findMany({
    where: { OR: SEED_USERS.map((u) => ({ username: u.username, email: u.email })) },
    select: { id: true, username: true, email: true },
  });

  console.log(`\nUsuários de seed encontrados: ${seedUsers.length}/${SEED_USERS.length}`);
  for (const u of seedUsers) console.log(`  - ${u.username} <${u.email}> (${u.id})`);

  if (seedUsers.length === 0) {
    console.log("\nNenhum usuário de seed no banco. Nada a purgar.");
    console.log("\nEstado atual do catálogo semeado:");
    await reportBooks();
    await db.$disconnect();
    return;
  }
  if (seedUsers.length > SEED_USERS.length) {
    console.error(
      `\n⚠️  Encontrados MAIS usuários (${seedUsers.length}) do que o esperado (${SEED_USERS.length}) pro critério de seed.` +
        " Abortando sem deletar nada — revise a query/critério antes de continuar."
    );
    await db.$disconnect();
    process.exit(1);
  }

  const seedUserIds = seedUsers.map((u) => u.id);

  // Guarda: clube(s) criado(s) por usuário de seed com membro/mensagem de
  // gente FORA do seed não pode ser apagado sem revisão — apagar o criador
  // (seed) cascateia o clube inteiro e levaria junto participação real.
  const seedClubs = await db.club.findMany({
    where: { creatorId: { in: seedUserIds } },
    select: { id: true, name: true },
  });
  const realMembersInSeedClubs = seedClubs.length
    ? await db.clubMember.count({
        where: { clubId: { in: seedClubs.map((c) => c.id) }, userId: { notIn: seedUserIds } },
      })
    : 0;
  const realMessagesInSeedClubs = seedClubs.length
    ? await db.message.count({
        where: { clubId: { in: seedClubs.map((c) => c.id) }, userId: { notIn: seedUserIds } },
      })
    : 0;
  if (realMembersInSeedClubs > 0 || realMessagesInSeedClubs > 0) {
    console.error(
      `\n⚠️  Clube(s) de seed (${seedClubs.map((c) => c.name).join(", ") || "?"}) têm ` +
        `${realMembersInSeedClubs} membro(s) e ${realMessagesInSeedClubs} mensagem(ns) de usuário(s) real(is).` +
        " Apagar o(s) criador(es) de seed cascatearia e apagaria essa participação real." +
        " Abortando sem deletar nada — revise manualmente (ex.: transferir o clube pra outro dono) antes de rodar de novo."
    );
    await db.$disconnect();
    process.exit(1);
  }

  // Contagens ligadas aos usuários de seed (antes de deletar) — tudo cai em
  // cascata (onDelete: Cascade no schema) quando os usuários forem apagados.
  const [shelfCount, reviewCount, listCount, clubCount, likeCount, commentCount, followCount] = await Promise.all([
    db.shelfEntry.count({ where: { userId: { in: seedUserIds } } }),
    db.review.count({ where: { userId: { in: seedUserIds } } }),
    db.list.count({ where: { userId: { in: seedUserIds } } }),
    db.club.count({ where: { creatorId: { in: seedUserIds } } }),
    db.reviewLike.count({ where: { userId: { in: seedUserIds } } }),
    db.comment.count({ where: { userId: { in: seedUserIds } } }),
    db.follow.count({ where: { OR: [{ followerId: { in: seedUserIds } }, { followingId: { in: seedUserIds } }] } }),
  ]);
  console.log("\nRegistros ligados aos usuários de seed (serão removidos em cascata):");
  console.log(`  shelfEntries=${shelfCount}  reviews=${reviewCount}  lists=${listCount}  clubs=${clubCount}`);
  console.log(`  reviewLikes=${likeCount}  comments=${commentCount}  follows=${followCount}`);

  console.log("\nEstado do catálogo semeado ANTES da deleção:");
  await reportBooks();

  if (!APPLY) {
    console.log("\nDry-run — nada foi deletado. Revise a lista acima e rode de novo com --apply pra executar.");
    await db.$disconnect();
    return;
  }

  const { count: deletedUsers } = await db.user.deleteMany({ where: { id: { in: seedUserIds } } });
  console.log(`\n✅ Usuários de seed deletados: ${deletedUsers} (cascata removeu estante/reviews/listas/clubes/curtidas/comentários/follows).`);

  await purgeOrphanBooks();

  console.log("\nEstado do catálogo semeado DEPOIS da deleção:");
  await reportBooks();
  await db.$disconnect();
}

/** Deleta cada livro do catálogo semeado que não tenha sobrado nenhuma
 * referência real (usuários de seed já foram removidos nesse ponto — toda
 * referência restante é, por definição, de um usuário real). Livros
 * mantidos têm a nota (avg/count) recomputada, já que reviews de seed podem
 * ter sido removidas. */
async function purgeOrphanBooks() {
  for (const bookId of SEED_BOOK_IDS) {
    const book = await db.book.findUnique({ where: { id: bookId }, select: { id: true } });
    if (!book) continue;

    const [shelf, review, tag, quote, listBook, club] = await Promise.all([
      db.shelfEntry.count({ where: { bookId } }),
      db.review.count({ where: { bookId } }),
      db.bookTag.count({ where: { bookId } }),
      db.quote.count({ where: { bookId } }),
      db.listBook.count({ where: { bookId } }),
      db.club.count({ where: { bookId } }),
    ]);
    const totalRefs = shelf + review + tag + quote + listBook + club;

    if (totalRefs > 0) {
      console.log(
        `  livro "${bookId}": MANTIDO — ${totalRefs} referência(s) real(is) (shelf=${shelf} review=${review} tag=${tag} quote=${quote} listBook=${listBook} club=${club})`
      );
      await recomputeBookRating(db, bookId);
      continue;
    }

    await db.book.delete({ where: { id: bookId } });
    console.log(`  livro "${bookId}": deletado (nenhuma referência real).`);
  }
}

async function reportBooks() {
  for (const bookId of SEED_BOOK_IDS) {
    const book = await db.book.findUnique({ where: { id: bookId }, select: { avg: true, count: true } });
    console.log(`  livro "${bookId}": ${book ? `existe (avg=${book.avg} count=${book.count})` : "não existe"}`);
  }
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
