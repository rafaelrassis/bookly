/**
 * Seed de conteúdo social real (Spec 3b): os livros do catálogo mocado viram
 * linhas de `Book`, e os autores mocados do feed (`data/feed.ts`/`data/users.ts`)
 * viram usuários reais com reviews/likes/comments — assim o feed e as listas
 * têm conteúdo de verdade sem depender de uma UI de autoria de review (Spec 3a,
 * ainda não implementada). Idempotente: pode rodar de novo sem duplicar dados.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { BOOKS } from "../src/data/books";
import { FEED_REVIEWS } from "../src/data/feed";
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
        avg: book.avg,
        count: book.count,
        synopsis: book.synopsis,
      },
      update: {
        title: book.title,
        authors: book.authors,
        year: book.year,
        pages: book.pages,
        genre: book.genre,
        gradientFrom,
        gradientTo,
        avg: book.avg,
        count: book.count,
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
    const user = await db.user.upsert({
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
      select: { id: true },
    });
    void user;
    avatarIndex++;
  }
  console.log(`Community users: ${Object.keys(usernameByHandle).length} seeded.`);
  return usernameByHandle;
}

async function seedReviews(usernameByHandle: Record<string, string>) {
  const communityHandles = Object.keys(MOCK_USERS);
  const reviews = FEED_REVIEWS.filter((r) => communityHandles.includes(r.user));

  let i = 0;
  for (const review of reviews) {
    const username = usernameByHandle[review.user];
    const user = await db.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) continue;

    const createdAt = new Date(Date.now() - i * 3 * 60 * 60 * 1000);
    const row = await db.review.upsert({
      where: { userId_bookId: { userId: user.id, bookId: review.bookId } },
      create: {
        userId: user.id,
        bookId: review.bookId,
        rating: review.rating,
        title: review.title,
        text: review.text,
        startedAt: review.startedAt ? new Date(review.startedAt) : undefined,
        finishedAt: review.finishedAt ? new Date(review.finishedAt) : undefined,
        createdAt,
      },
      update: {
        rating: review.rating,
        title: review.title,
        text: review.text,
      },
      select: { id: true },
    });

    // idempotente: zera likes/comments desse review antes de re-semear
    await db.reviewLike.deleteMany({ where: { reviewId: row.id } });
    await db.comment.deleteMany({ where: { reviewId: row.id } });

    const likers = communityHandles
      .filter((h) => h !== review.user)
      .slice(0, Math.max(2, Math.min(5, Math.round(review.likes / 12))));
    for (const likerHandle of likers) {
      const likerUsername = usernameByHandle[likerHandle];
      const liker = await db.user.findUnique({ where: { username: likerUsername }, select: { id: true } });
      if (liker) {
        await db.reviewLike.create({ data: { reviewId: row.id, userId: liker.id } });
      }
    }

    let c = 0;
    for (const comment of review.comments) {
      const commenterUsername = usernameByHandle[comment.user];
      if (!commenterUsername) continue;
      const commenter = await db.user.findUnique({
        where: { username: commenterUsername },
        select: { id: true },
      });
      if (!commenter) continue;
      await db.comment.create({
        data: {
          reviewId: row.id,
          userId: commenter.id,
          text: comment.text,
          createdAt: new Date(createdAt.getTime() + (c + 1) * 15 * 60 * 1000),
        },
      });
      c++;
    }

    i++;
  }
  console.log(`Reviews: ${reviews.length} seeded (com likes e comments).`);
}

async function main() {
  await seedBooks();
  const usernameByHandle = await seedCommunityUsers();
  await seedReviews(usernameByHandle);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
