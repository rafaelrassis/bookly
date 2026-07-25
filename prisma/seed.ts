/**
 * Popula o catálogo e os perfis da comunidade (./seed-data.ts) como contas
 * reais com reviews/curtidas/comentários/listas — assim feed, listas e
 * perfis públicos têm conteúdo de verdade sem depender de cadastro manual.
 * Também semeia um usuário demo (demo@bookly.dev / bookly123) com estante,
 * review e clube pra dev/QA e smoke E2E. Idempotente: upsert por id/username.
 * avg/count de Book nascem zerados e são recalculados no fim a partir das
 * reviews semeadas.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { BOOKS, COMMUNITY_PROFILES, SEED_LISTS } from "./seed-data";
import { withoutAt } from "../src/lib/handle";
import { recomputeBookRating } from "../src/lib/books";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function seedBooks() {
  for (const book of BOOKS) {
    const [gradientFrom, gradientTo] = book.gradient;
    await db.book.upsert({
      where: { id: book.id },
      create: {
        id: book.id,
        title: book.title,
        authors: book.authors,
        year: book.year,
        pages: book.pages,
        genre: book.genre,
        gradientFrom,
        gradientTo,
        synopsis: book.synopsis,
        // avg / count: NÃO setar aqui — recalculado a partir das reviews no fim do seed.
      },
      update: {
        title: book.title,
        authors: book.authors,
        year: book.year,
        pages: book.pages,
        genre: book.genre,
        gradientFrom,
        gradientTo,
        synopsis: book.synopsis,
      },
    });
  }
  console.log(`Books: ${BOOKS.length} seeded.`);
}

/** Mapeia handles mocados ("@pedro_lê") pra usernames reais (regex `^[a-z0-9._]+$`). */
const USERNAME_OVERRIDES: Record<string, string> = {
  "pedro_lê": "pedro_le",
};

function realUsername(handle: string): string {
  const bare = withoutAt(handle);
  return USERNAME_OVERRIDES[bare] ?? bare;
}

async function seedCommunityUsers(): Promise<Record<string, string>> {
  const passwordHash = await bcrypt.hash(`seed-${Date.now()}-not-a-real-login`, 10);
  const usernameByHandle: Record<string, string> = {};
  let avatarIndex = 0;

  for (const [handle, profile] of Object.entries(COMMUNITY_PROFILES)) {
    const username = realUsername(handle);
    usernameByHandle[handle] = username;
    await db.user.upsert({
      where: { username },
      create: {
        email: `${username}@seed.bookly.local`,
        username,
        name: profile.name,
        passwordHash,
        bio: profile.bio,
        avatar: avatarIndex % 6,
        top4: profile.top4,
        emailVerified: new Date(),
      },
      update: {
        name: profile.name,
        bio: profile.bio,
        top4: profile.top4,
      },
    });
    avatarIndex++;
  }
  console.log(`Community users: ${Object.keys(usernameByHandle).length} seeded.`);
  return usernameByHandle;
}

/** Reviews reais dos perfis mocados (rating/título/texto), com curtidas e
 * um comentário cruzado entre os próprios usuários da comunidade — dá
 * conteúdo de verdade pro feed/listas sem depender de autoria manual. */
async function seedReviews(usernameByHandle: Record<string, string>) {
  const handles = Object.keys(COMMUNITY_PROFILES);
  let i = 0;

  for (const handle of handles) {
    const authorUsername = usernameByHandle[handle];
    const author = await db.user.findUnique({ where: { username: authorUsername }, select: { id: true } });
    if (!author) continue;

    for (const review of COMMUNITY_PROFILES[handle].reviews) {
      const createdAt = new Date(Date.now() - i * 3 * 60 * 60 * 1000);
      const row = await db.review.upsert({
        where: { userId_bookId: { userId: author.id, bookId: review.bookId } },
        create: {
          userId: author.id,
          bookId: review.bookId,
          rating: review.rating,
          title: review.title,
          text: review.text,
          createdAt,
        },
        update: { rating: review.rating, title: review.title, text: review.text },
      });

      // idempotente: zera curtidas/comentários desse review antes de re-semear
      await db.reviewLike.deleteMany({ where: { reviewId: row.id } });
      await db.comment.deleteMany({ where: { reviewId: row.id } });

      const likerHandles = handles.filter((h) => h !== handle).slice(0, 3);
      for (const likerHandle of likerHandles) {
        const liker = await db.user.findUnique({
          where: { username: usernameByHandle[likerHandle] },
          select: { id: true },
        });
        if (liker) await db.reviewLike.create({ data: { reviewId: row.id, userId: liker.id } });
      }

      const commenterHandle = handles.find((h) => h !== handle);
      if (commenterHandle) {
        const commenter = await db.user.findUnique({
          where: { username: usernameByHandle[commenterHandle] },
          select: { id: true },
        });
        if (commenter) {
          await db.comment.create({
            data: {
              reviewId: row.id,
              userId: commenter.id,
              text: "Concordo muito com essa review!",
              createdAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
            },
          });
        }
      }

      i++;
    }
  }
  console.log(`Reviews da comunidade: ${i} seeded (com curtidas e comentários).`);
}

/** Listas públicas da comunidade (Spec 3b/Fase 6), pra "Listas da comunidade"
 * na busca sem query não nascer vazia. Idempotente: recria os livros da
 * lista a cada seed. */
async function seedLists(usernameByHandle: Record<string, string>) {
  const handleByUsername = new Map(Object.entries(usernameByHandle).map(([h, u]) => [u, h]));
  let count = 0;

  for (const list of SEED_LISTS) {
    const username = realUsername(list.by);
    if (!handleByUsername.has(username)) continue;
    const owner = await db.user.findUnique({ where: { username }, select: { id: true } });
    if (!owner) continue;

    const existing = await db.list.findFirst({ where: { userId: owner.id, name: list.name } });
    const row = existing
      ? existing
      : await db.list.create({ data: { userId: owner.id, name: list.name, visibility: "public" } });

    await db.listBook.deleteMany({ where: { listId: row.id } });
    for (let order = 0; order < list.bookIds.length; order++) {
      await db.listBook.create({ data: { listId: row.id, bookId: list.bookIds[order], order } });
    }
    count++;
  }
  console.log(`Listas da comunidade: ${count} seeded.`);
}

/** Usuário demo pra dev/QA e pro smoke E2E rodarem com dados reais
 * (estante, review e clube com mensagem) sem depender de cadastro manual. */
async function seedDemoUser() {
  const demo = await db.user.upsert({
    where: { email: "demo@bookly.dev" },
    create: {
      email: "demo@bookly.dev",
      username: "demo",
      name: "Leitor Demo",
      passwordHash: await bcrypt.hash("bookly123", 10),
      emailVerified: new Date(),
      bio: "Conta de demonstração.",
      genres: ["Fantasia", "Thriller"],
    },
    update: {},
  });

  await db.shelfEntry.upsert({
    where: { userId_bookId: { userId: demo.id, bookId: "o-nome-do-vento" } },
    create: {
      userId: demo.id,
      bookId: "o-nome-do-vento",
      status: "READING",
      currentPage: 200,
      lastPage: 0,
      startedAt: new Date(),
    },
    update: {},
  });
  await db.shelfEntry.upsert({
    where: { userId_bookId: { userId: demo.id, bookId: "duna" } },
    create: {
      userId: demo.id,
      bookId: "duna",
      status: "READ",
      startedAt: new Date("2026-03-01"),
      finishedAt: new Date("2026-04-06"),
    },
    update: {},
  });

  await db.review.upsert({
    where: { userId_bookId: { userId: demo.id, bookId: "duna" } },
    create: {
      userId: demo.id,
      bookId: "duna",
      rating: 4.5,
      text: "Épico. A construção de mundo é impecável.",
    },
    update: {},
  });

  const club = await db.club.upsert({
    where: { id: "demo-o-nome-do-vento" },
    create: {
      id: "demo-o-nome-do-vento",
      name: "Quem lê O Nome do Vento",
      bookId: "o-nome-do-vento",
      desc: "Clube demo.",
      visibility: "public",
      creatorId: demo.id,
      members: { create: { userId: demo.id, role: "creator" } },
    },
    update: {},
  });
  await db.message.upsert({
    where: { id: "demo-welcome-message" },
    create: {
      id: "demo-welcome-message",
      clubId: club.id,
      userId: demo.id,
      text: "Bem-vindos! Onde vocês estão na leitura?",
    },
    update: {},
  });

  console.log("🌱 demo user + shelf + club seeded (demo@bookly.dev / bookly123)");
}

/** Recomputa avg/count a partir das reviews semeadas — mesma fórmula usada
 * em tempo real quando reviews são criadas/removidas pelo app. */
async function recomputeAllBookRatings() {
  const seededBooks = await db.book.findMany({ select: { id: true } });
  for (const { id } of seededBooks) {
    await recomputeBookRating(db, id);
  }
  console.log(`↻ recomputed avg/count for ${seededBooks.length} books`);
}

async function main() {
  await seedBooks();
  const usernameByHandle = await seedCommunityUsers();
  await seedReviews(usernameByHandle);
  await seedLists(usernameByHandle);
  await seedDemoUser();
  await recomputeAllBookRatings();
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
