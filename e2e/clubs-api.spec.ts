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

test("clube público: criador vira membro; outro usuário entra sem código e 'already' se repetir", async ({
  page,
  browser,
}) => {
  const a = seedAccount("pub_a");
  await register(page, a);
  await login(page, a);

  const created = await page.request.post("/api/clubs", {
    data: { name: "Leitoras de domingo", bookId: "duna", desc: "Um livro por mês", visibility: "public" },
  });
  expect(created.ok()).toBeTruthy();
  const { id, code } = await created.json();
  expect(code).toBeFalsy();

  const list = await (await page.request.get("/api/clubs")).json();
  const mine = list.items.find((c: { id: string }) => c.id === id);
  expect(mine.joined).toBe(true);
  expect(mine.members).toBe(1);

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = seedAccount("pub_b");
  await register(pageB, b);
  await login(pageB, b);

  const joined = await pageB.request.post(`/api/clubs/${id}/join`);
  expect(joined.ok()).toBeTruthy();
  expect((await joined.json()).status).toBe("joined");

  const again = await pageB.request.post(`/api/clubs/${id}/join`);
  expect((await again.json()).status).toBe("already");

  const detailAsB = await (await pageB.request.get(`/api/clubs/${id}`)).json();
  expect(detailAsB.joined).toBe(true);
  expect(detailAsB.isCreator).toBe(false);
  expect(detailAsB.code).toBeUndefined();
  expect(detailAsB.members).toHaveLength(2);

  await ctxB.close();
});

test("clube privado: código de 6 chars só pro criador; 403 sem código; 404 pra não-membro", async ({
  page,
  browser,
}) => {
  const a = seedAccount("priv_a");
  await register(page, a);
  await login(page, a);

  const created = await page.request.post("/api/clubs", {
    data: { name: "Clube fechado", bookId: "1984", desc: "", visibility: "private" },
  });
  const { id, code } = await created.json();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);

  const detailAsCreator = await (await page.request.get(`/api/clubs/${id}`)).json();
  expect(detailAsCreator.code).toBe(code);

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = seedAccount("priv_b");
  await register(pageB, b);
  await login(pageB, b);

  const notMember = await pageB.request.get(`/api/clubs/${id}`);
  expect(notMember.status()).toBe(404);

  const forbiddenJoin = await pageB.request.post(`/api/clubs/${id}/join`);
  expect(forbiddenJoin.status()).toBe(403);

  const wrongCode = await pageB.request.post("/api/clubs/join", { data: { code: "ZZZZZZ" } });
  expect(wrongCode.status()).toBe(404);

  const joinedByCode = await pageB.request.post("/api/clubs/join", { data: { code } });
  expect(joinedByCode.ok()).toBeTruthy();
  expect((await joinedByCode.json()).status).toBe("joined");

  const detailAsB = await (await pageB.request.get(`/api/clubs/${id}`)).json();
  expect(detailAsB.joined).toBe(true);
  expect(detailAsB.code).toBeUndefined();

  await ctxB.close();
});

test("sair do clube: criador é bloqueado, membro sai normalmente", async ({ page, browser }) => {
  const a = seedAccount("leave_a");
  await register(page, a);
  await login(page, a);

  const created = await page.request.post("/api/clubs", {
    data: { name: "Clube de saída", bookId: "duna", desc: "", visibility: "public" },
  });
  const { id } = await created.json();

  const blocked = await page.request.delete(`/api/clubs/${id}/leave`);
  expect(blocked.status()).toBe(400);

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = seedAccount("leave_b");
  await register(pageB, b);
  await login(pageB, b);
  await pageB.request.post(`/api/clubs/${id}/join`);

  const left = await pageB.request.delete(`/api/clubs/${id}/leave`);
  expect(left.ok()).toBeTruthy();

  const list = await (await pageB.request.get("/api/clubs")).json();
  const club = list.items.find((c: { id: string }) => c.id === id);
  expect(club.joined).toBe(false);

  await ctxB.close();
});

test("mural: publica, cita resposta, 403 pra não-membro", async ({ page, browser }) => {
  const a = seedAccount("chat_a");
  await register(page, a);
  await login(page, a);

  const created = await page.request.post("/api/clubs", {
    data: { name: "Clube do mural", bookId: "duna", desc: "", visibility: "public" },
  });
  const { id } = await created.json();

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = seedAccount("chat_b");
  await register(pageB, b);
  await login(pageB, b);
  await pageB.request.post(`/api/clubs/${id}/join`);

  const empty = await (await page.request.get(`/api/clubs/${id}/messages`)).json();
  expect(empty.items).toHaveLength(0);

  const first = await page.request.post(`/api/clubs/${id}/messages`, {
    data: { text: "Gente, capítulo 3 me pegou" },
  });
  expect(first.ok()).toBeTruthy();
  const firstMsg = await first.json();

  const reply = await pageB.request.post(`/api/clubs/${id}/messages`, {
    data: { text: "Concordo total!", replyToId: firstMsg.id },
  });
  expect(reply.ok()).toBeTruthy();
  const replyMsg = await reply.json();
  expect(replyMsg.replyTo.text).toBe("Gente, capítulo 3 me pegou");

  const all = await (await page.request.get(`/api/clubs/${id}/messages`)).json();
  expect(all.items).toHaveLength(2);

  const afterCursor = await (
    await page.request.get(`/api/clubs/${id}/messages?after=${firstMsg.id}`)
  ).json();
  expect(afterCursor.items).toHaveLength(1);
  expect(afterCursor.items[0].id).toBe(replyMsg.id);

  const ctxC = await browser.newContext();
  const pageC = await ctxC.newPage();
  const c = seedAccount("chat_c");
  await register(pageC, c);
  await login(pageC, c);

  const forbiddenGet = await pageC.request.get(`/api/clubs/${id}/messages`);
  expect(forbiddenGet.status()).toBe(403);
  const forbiddenPost = await pageC.request.post(`/api/clubs/${id}/messages`, {
    data: { text: "oi" },
  });
  expect(forbiddenPost.status()).toBe(403);

  await ctxB.close();
  await ctxC.close();
});

test("progresso publica mensagem de sistema uma vez por mudança de %", async ({ page, browser }) => {
  const a = seedAccount("prog_a");
  await register(page, a);
  await login(page, a);

  const created = await page.request.post("/api/clubs", {
    data: { name: "Clube de progresso", bookId: "duna", desc: "", visibility: "public" },
  });
  const { id } = await created.json();

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = seedAccount("prog_b");
  await register(pageB, b);
  await login(pageB, b);
  await pageB.request.post(`/api/clubs/${id}/join`);

  // duna tem 680 páginas; página 340 = 50%
  const progress = await pageB.request.put("/api/books/duna/progress", { data: { page: 340 } });
  expect((await progress.json()).percent).toBe(50);

  const afterProgress = await (await page.request.get(`/api/clubs/${id}/messages`)).json();
  const systemMsgs = afterProgress.items.filter((m: { system: boolean }) => m.system);
  expect(systemMsgs).toHaveLength(1);
  expect(systemMsgs[0].text).toContain("avançou para 50%");
  const lastId = afterProgress.items[afterProgress.items.length - 1].id;

  // reenviar a mesma página não deve duplicar a mensagem de sistema
  await pageB.request.put("/api/books/duna/progress", { data: { page: 340 } });
  const noDuplicate = await (
    await page.request.get(`/api/clubs/${id}/messages?after=${lastId}`)
  ).json();
  expect(noDuplicate.items).toHaveLength(0);

  // avançar mais gera uma nova mensagem
  await pageB.request.put("/api/books/duna/progress", { data: { page: 680 } });
  const advanced = await (
    await page.request.get(`/api/clubs/${id}/messages?after=${lastId}`)
  ).json();
  expect(advanced.items).toHaveLength(1);
  expect(advanced.items[0].text).toContain("avançou para 100%");

  await ctxB.close();
});

test("gerenciamento: só o criador edita, remove membros, regenera código e exclui", async ({
  page,
  browser,
}) => {
  const a = seedAccount("mgmt_a");
  await register(page, a);
  await login(page, a);

  const created = await page.request.post("/api/clubs", {
    data: { name: "Clube original", bookId: "duna", desc: "", visibility: "private" },
  });
  const { id, code } = await created.json();

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = seedAccount("mgmt_b");
  await register(pageB, b);
  await login(pageB, b);
  await pageB.request.post("/api/clubs/join", { data: { code } });

  const forbiddenPatch = await pageB.request.patch(`/api/clubs/${id}`, {
    data: { name: "Hackeado" },
  });
  expect(forbiddenPatch.status()).toBe(403);

  const patch = await page.request.patch(`/api/clubs/${id}`, { data: { name: "Clube renomeado" } });
  expect(patch.ok()).toBeTruthy();
  expect((await patch.json()).name).toBe("Clube renomeado");

  const detail = await (await page.request.get(`/api/clubs/${id}`)).json();
  const memberB = detail.members.find((m: { role: string }) => m.role === "member");
  expect(memberB).toBeTruthy();

  const forbiddenRemove = await pageB.request.delete(`/api/clubs/${id}/members/${memberB.userId}`);
  expect(forbiddenRemove.status()).toBe(403);

  const removed = await page.request.delete(`/api/clubs/${id}/members/${memberB.userId}`);
  expect(removed.ok()).toBeTruthy();

  const detailAfterRemoval = await (await page.request.get(`/api/clubs/${id}`)).json();
  expect(detailAfterRemoval.members).toHaveLength(1);

  const forbiddenRegenerate = await pageB.request.post(`/api/clubs/${id}/code/regenerate`);
  expect(forbiddenRegenerate.status()).toBe(403);

  const regenerated = await page.request.post(`/api/clubs/${id}/code/regenerate`);
  expect(regenerated.ok()).toBeTruthy();
  const { code: newCode } = await regenerated.json();
  expect(newCode).toMatch(/^[A-Z0-9]{6}$/);
  expect(newCode).not.toBe(code);

  const forbiddenDelete = await pageB.request.delete(`/api/clubs/${id}`);
  expect(forbiddenDelete.status()).toBe(403);

  const deleted = await page.request.delete(`/api/clubs/${id}`);
  expect(deleted.ok()).toBeTruthy();

  const gone = await page.request.get(`/api/clubs/${id}`);
  expect(gone.status()).toBe(404);

  await ctxB.close();
});
