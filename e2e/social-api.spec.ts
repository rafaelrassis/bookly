import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";

function seedAccount(tag: string) {
  const rand = Math.random().toString(36).slice(2, 8);
  return {
    email: `e2e.${tag}.${rand}@example.com`,
    username: `e2e_${tag}_${rand}`,
    password: "SenhaForte123",
    name: `Leitora ${tag}`,
  };
}

async function register(page: Page, account: ReturnType<typeof seedAccount>) {
  const res = await page.request.post("/api/auth/register", { data: account });
  expect(res.ok()).toBeTruthy();
}

async function login(page: Page, account: ReturnType<typeof seedAccount>) {
  await page.goto("/login");
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL("**/home");
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test("review com título aparece no feed geral e some do feed ao zerar a nota", async ({ page }) => {
  const a = seedAccount("feed_a");
  await register(page, a);
  await login(page, a);

  const rated = await page.request.put("/api/books/duna/review", {
    data: { rating: 4.5, title: "Denso mas incrível", text: "Vale muito a leitura." },
  });
  expect(rated.ok()).toBeTruthy();

  const feed = await (await page.request.get("/api/feed?scope=all")).json();
  const mine = feed.items.find((r: { user: { username: string } }) => r.user.username === a.username);
  expect(mine).toBeTruthy();
  expect(mine.title).toBe("Denso mas incrível");
  expect(mine.likes).toBe(0);
  expect(mine.comments).toBe(0);

  // nota 0 apaga a review — some do feed
  await page.request.put("/api/books/duna/review", { data: { rating: 0 } });
  const feedAfter = await (await page.request.get("/api/feed?scope=all")).json();
  expect(
    feedAfter.items.find((r: { user: { username: string } }) => r.user.username === a.username)
  ).toBeUndefined();
});

test("feed 'seguindo' cai pro geral quando não segue ninguém, e filtra quando segue", async ({
  page,
  browser,
}) => {
  const a = seedAccount("follow_a");
  await register(page, a);
  await login(page, a);
  await page.request.put("/api/books/1984/review", { data: { rating: 4, text: "Marcante." } });

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = seedAccount("follow_b");
  await register(pageB, b);
  await login(pageB, b);
  await pageB.request.put("/api/books/1984/review", { data: { rating: 5, text: "Obra-prima." } });

  const noFollowYet = await (await pageB.request.get("/api/feed?scope=following")).json();
  expect(noFollowYet.fellBackToAll).toBe(true);
  expect(noFollowYet.items.length).toBeGreaterThan(0);

  await pageB.request.post(`/api/users/${a.username}/follow`);
  const followingFeed = await (await pageB.request.get("/api/feed?scope=following")).json();
  expect(followingFeed.fellBackToAll).toBe(false);
  expect(
    followingFeed.items.every((r: { user: { username: string } }) => r.user.username === a.username)
  ).toBe(true);

  await ctxB.close();
});

test("curtir e comentar review: contadores refletem em /api/feed e /api/reviews/[id]", async ({
  page,
  browser,
}) => {
  const a = seedAccount("like_a");
  await register(page, a);
  await login(page, a);
  await page.request.put("/api/books/verity/review", { data: { rating: 4, text: "Assustador." } });
  const feed = await (await page.request.get("/api/feed?scope=all")).json();
  const reviewId = feed.items.find(
    (r: { user: { username: string } }) => r.user.username === a.username
  ).id;

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = seedAccount("like_b");
  await register(pageB, b);
  await login(pageB, b);

  const liked = await pageB.request.post(`/api/reviews/${reviewId}/like`);
  expect(liked.ok()).toBeTruthy();
  expect((await liked.json()).likes).toBe(1);

  const commented = await pageB.request.post(`/api/reviews/${reviewId}/comments`, {
    data: { text: "Também amei esse livro!" },
  });
  expect(commented.ok()).toBeTruthy();

  const detail = await (await page.request.get(`/api/reviews/${reviewId}`)).json();
  expect(detail.likes).toBe(1);
  expect(detail.comments).toBe(1);
  expect(detail.likedByMe).toBe(false);

  const detailAsB = await (await pageB.request.get(`/api/reviews/${reviewId}`)).json();
  expect(detailAsB.likedByMe).toBe(true);

  const unliked = await pageB.request.delete(`/api/reviews/${reviewId}/like`);
  expect((await unliked.json()).likes).toBe(0);

  const comments = await (await page.request.get(`/api/reviews/${reviewId}/comments`)).json();
  expect(comments.items).toHaveLength(1);
  expect(comments.items[0].text).toBe("Também amei esse livro!");

  await ctxB.close();
});

test("listas: cria, adiciona/remove livro, alterna visibilidade e respeita dono", async ({
  page,
  browser,
}) => {
  const a = seedAccount("list_a");
  await register(page, a);
  await login(page, a);

  const created = await page.request.post("/api/lists", {
    data: { name: "Fantasia favorita", visibility: "public" },
  });
  expect(created.ok()).toBeTruthy();
  const list = await created.json();
  expect(list.bookIds).toEqual([]);

  const added = await page.request.post(`/api/lists/${list.id}/books`, {
    data: { bookId: "duna" },
  });
  expect(added.ok()).toBeTruthy();

  const detail = await (await page.request.get(`/api/lists/${list.id}`)).json();
  expect(detail.bookIds).toEqual(["duna"]);
  expect(detail.books[0].id).toBe("duna");

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = seedAccount("list_b");
  await register(pageB, b);
  await login(pageB, b);

  const forbiddenAdd = await pageB.request.post(`/api/lists/${list.id}/books`, {
    data: { bookId: "1984" },
  });
  expect(forbiddenAdd.status()).toBe(403);

  const madePrivate = await page.request.patch(`/api/lists/${list.id}`, {
    data: { visibility: "private" },
  });
  expect((await madePrivate.json()).visibility).toBe("private");

  const forbiddenView = await pageB.request.get(`/api/lists/${list.id}`);
  expect(forbiddenView.status()).toBe(403);

  const removed = await page.request.delete(`/api/lists/${list.id}/books`, {
    data: { bookId: "duna" },
  });
  expect(removed.ok()).toBeTruthy();
  const emptied = await (await page.request.get(`/api/lists/${list.id}`)).json();
  expect(emptied.bookIds).toEqual([]);

  const forbiddenDelete = await pageB.request.delete(`/api/lists/${list.id}`);
  expect(forbiddenDelete.status()).toBe(403);

  const deleted = await page.request.delete(`/api/lists/${list.id}`);
  expect(deleted.ok()).toBeTruthy();
  const gone = await page.request.get(`/api/lists/${list.id}`);
  expect(gone.status()).toBe(404);

  await ctxB.close();
});

test("sugestões de leitores excluem quem já sigo e a mim mesma", async ({ page }) => {
  const a = seedAccount("sugg_a");
  await register(page, a);
  await login(page, a);

  // a lista traz os usuários mais antigos primeiro (LIMIT pequeno), então em
  // vez de assumir que uma conta recém-criada aparece, seguimos quem já
  // aparece e confirmamos que some da lista depois.
  const before = await (await page.request.get("/api/users/suggestions")).json();
  expect(before.items.some((u: { username: string }) => u.username === a.username)).toBe(false);
  expect(before.items.length).toBeGreaterThan(0);

  const target = before.items[0].username;
  await page.request.post(`/api/users/${target}/follow`);
  const after = await (await page.request.get("/api/users/suggestions")).json();
  expect(after.items.some((u: { username: string }) => u.username === target)).toBe(false);
});
