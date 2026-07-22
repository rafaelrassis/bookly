/**
 * Popula o catálogo (Spec 0/3a) e, além disso, transforma os perfis mocados
 * da comunidade (data/users.ts) em contas reais com reviews/curtidas/
 * comentários (Spec 3b) — assim feed, listas e perfis públicos têm conteúdo
 * de verdade sem depender de cadastro manual. Também semeia um usuário demo
 * (demo@bookly.dev / bookly123) com estante, review e clube pra dev/QA e
 * smoke E2E. Idempotente: upsert por id/username. avg/count de Book nascem
 * zerados e são recalculados no fim a partir das reviews semeadas.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { BOOKS } from "../src/data/books";
import { MOCK_USERS } from "../src/data/users";
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

  for (const [handle, profile] of Object.entries(MOCK_USERS)) {
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
  const handles = Object.keys(MOCK_USERS);
  let i = 0;

  for (const handle of handles) {
    const authorUsername = usernameByHandle[handle];
    const author = await db.user.findUnique({ where: { username: authorUsername }, select: { id: true } });
    if (!author) continue;

    for (const review of MOCK_USERS[handle].reviews) {
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

/** Recomputa avg/count a partir das reviews semeadas — substitui os números
 * decorativos de data/books.ts pelos reais, mesma fórmula da Spec 0. */
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
