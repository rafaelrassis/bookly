/**
 * Popula o catálogo (Spec 0/3a) e, além disso, transforma os perfis mocados
 * da comunidade (data/users.ts) em contas reais com reviews/curtidas/
 * comentários (Spec 3b) — assim feed, listas e perfis públicos têm conteúdo
 * de verdade sem depender de cadastro manual. Idempotente: upsert por id/
 * username, sem sobrescrever avg/count reais de Book.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { BOOKS } from "../src/data/books";
import { MOCK_USERS } from "../src/data/users";
import { withoutAt } from "../src/lib/handle";

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
        avg: book.avg,
        count: book.count,
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

async function main() {
  await seedBooks();
  const usernameByHandle = await seedCommunityUsers();
  await seedReviews(usernameByHandle);
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
