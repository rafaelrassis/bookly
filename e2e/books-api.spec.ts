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

test("estante: status aplica datas e null remove", async ({ page }) => {
  const a = seedAccount("shelf");
  await register(page, a);
  await login(page, a);

  const reading = await page.request.put("/api/books/duna/shelf", {
    data: { status: "READING" },
  });
  expect(reading.ok()).toBeTruthy();
  const readingBody = await reading.json();
  expect(readingBody.entry.status).toBe("READING");
  expect(readingBody.entry.startedAt).toBeTruthy();
  expect(readingBody.entry.finishedAt).toBeNull();

  const read = await page.request.put("/api/books/duna/shelf", { data: { status: "READ" } });
  const readBody = await read.json();
  expect(readBody.entry.status).toBe("READ");
  expect(readBody.entry.finishedAt).toBeTruthy();

  const removed = await page.request.put("/api/books/duna/shelf", { data: { status: null } });
  const removedBody = await removed.json();
  expect(removedBody.entry).toBeNull();

  const bookRes = await page.request.get("/api/books/duna");
  const bookBody = await bookRes.json();
  expect(bookBody.entry).toBeNull();
});

test("progresso: retorna delta, atualiza lastPage e garante READING", async ({ page }) => {
  const a = seedAccount("progress");
  await register(page, a);
  await login(page, a);

  const first = await page.request.put("/api/books/duna/progress", { data: { page: 100 } });
  expect(first.ok()).toBeTruthy();
  const firstBody = await first.json();
  expect(firstBody.delta).toBe(100);

  const second = await page.request.put("/api/books/duna/progress", { data: { page: 250 } });
  const secondBody = await second.json();
  expect(secondBody.delta).toBe(150);

  const bookRes = await page.request.get("/api/books/duna");
  const bookBody = await bookRes.json();
  expect(bookBody.entry.status).toBe("READING");
  expect(bookBody.entry.currentPage).toBe(250);
  expect(bookBody.entry.lastPage).toBe(100);

  const overflow = await page.request.put("/api/books/duna/progress", { data: { page: 99999 } });
  expect(overflow.status()).toBe(400);
});

test("avaliar marca como Lido e recalcula avg/count; nota 0 apaga a review", async ({ page }) => {
  const a = seedAccount("review");
  await register(page, a);
  await login(page, a);

  // recomputeBookRating substitui o count decorativo do seed pelo real assim
  // que a primeira review de verdade é gravada — comparamos por delta, já
  // que outras execuções do teste podem ter deixado reviews reais no banco.
  const before = await (await page.request.get("/api/books/1984")).json();
  const countBefore = before.book.count;

  const rated = await page.request.put("/api/books/1984/review", {
    data: { rating: 4.5, text: "Sufocante e atual." },
  });
  expect(rated.ok()).toBeTruthy();
  const ratedBody = await rated.json();
  expect(ratedBody.rating).toBe(4.5);
  expect(ratedBody.entry.status).toBe("READ");
  expect(ratedBody.entry.finishedAt).toBeTruthy();

  const after = await (await page.request.get("/api/books/1984")).json();
  expect(after.book.count).toBe(countBefore + 1);
  expect(after.rating).toBe(4.5);
  expect(after.myReview).toBe("Sufocante e atual.");

  const removed = await page.request.put("/api/books/1984/review", {
    data: { rating: 0 },
  });
  const removedBody = await removed.json();
  expect(removedBody.rating).toBeNull();

  const afterRemoval = await (await page.request.get("/api/books/1984")).json();
  expect(afterRemoval.book.count).toBe(countBefore);
  expect(afterRemoval.rating).toBeNull();
  expect(afterRemoval.myReview).toBeNull();
});

test("tags persistem por usuário e filtram a estante", async ({ page }) => {
  const a = seedAccount("tags");
  await register(page, a);
  await login(page, a);

  await page.request.put("/api/books/verity/shelf", { data: { status: "WANT_TO_READ" } });

  const added = await page.request.post("/api/books/verity/tags", {
    data: { tag: "Emprestado" },
  });
  const addedBody = await added.json();
  expect(addedBody.tags).toEqual(["emprestado"]);

  const shelfFiltered = await (await page.request.get("/api/shelf?tag=emprestado")).json();
  expect(shelfFiltered.items.map((i: { book: { id: string } }) => i.book.id)).toContain("verity");

  const removed = await page.request.delete("/api/books/verity/tags", {
    data: { tag: "emprestado" },
  });
  const removedBody = await removed.json();
  expect(removedBody.tags).toEqual([]);
});

test("citações: cria e remove por id", async ({ page }) => {
  const a = seedAccount("quotes");
  await register(page, a);
  await login(page, a);

  const created = await page.request.post("/api/books/1984/quotes", {
    data: { text: "Guerra é paz.", page: 29 },
  });
  expect(created.ok()).toBeTruthy();
  const quote = await created.json();
  expect(quote.text).toBe("Guerra é paz.");

  const list = await (await page.request.get("/api/books/1984/quotes")).json();
  expect(list.quotes).toHaveLength(1);

  const deleted = await page.request.delete(`/api/quotes/${quote.id}`);
  expect(deleted.ok()).toBeTruthy();

  const listAfter = await (await page.request.get("/api/books/1984/quotes")).json();
  expect(listAfter.quotes).toHaveLength(0);
});

test("busca de livros por título/autor (ILIKE)", async ({ page }) => {
  const a = seedAccount("search");
  await register(page, a);
  await login(page, a);

  const res = await page.request.get("/api/books?q=duna");
  const body = await res.json();
  expect(body.items.some((b: { id: string }) => b.id === "duna")).toBeTruthy();

  const byAuthor = await page.request.get("/api/books?q=orwell");
  const byAuthorBody = await byAuthor.json();
  expect(byAuthorBody.items.some((b: { id: string }) => b.id === "1984")).toBeTruthy();

  const empty = await page.request.get("/api/books?q=");
  const emptyBody = await empty.json();
  expect(emptyBody.items).toEqual([]);
});
