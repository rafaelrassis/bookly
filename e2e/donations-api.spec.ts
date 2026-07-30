import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { createAccount, seedAccount, signInAs, withDb } from "./helpers/auth";

async function register(_page: Page, account: ReturnType<typeof seedAccount>) {
  await createAccount(account);
}

async function login(page: Page, account: ReturnType<typeof seedAccount>) {
  await signInAs(page, account);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

async function criarDoacao(page: Page, overrides: Record<string, unknown> = {}) {
  const res = await page.request.post("/api/donations", {
    data: {
      bookId: "duna",
      photoUrl: "https://picsum.photos/seed/donation/200/200",
      city: "São Paulo",
      state: "SP",
      whatsapp: "5511999998888",
      instagram: "doador_teste",
      ...overrides,
    },
  });
  expect(res.status()).toBe(201);
  const { id } = await res.json();
  return id as string;
}

async function verDoacao(page: Page, bookId: string, donationId: string) {
  const res = await page.request.get(`/api/books/${bookId}/donations`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.donations.find((d: { id: string }) => d.id === donationId);
}

// A regra mais crítica da feature: contato do doador só aparece pro próprio
// doador e pro interessado ESCOLHIDO — nunca antes disso, nunca pra fila
// inteira, e nunca de novo pra quem ficou de fora depois da escolha.
test("exposição de contato: oculto até doador escolher; outro interessado nunca vê", async ({
  page,
  browser,
}) => {
  const donor = seedAccount("don_owner");
  await register(page, donor);
  await login(page, donor);
  const donationId = await criarDoacao(page);

  // doador vê o próprio contato
  const asDonor = await verDoacao(page, "duna", donationId);
  expect(asDonor.isDonor).toBe(true);
  expect(asDonor.contact).toEqual({ whatsapp: "5511999998888", instagram: "doador_teste" });

  // visitante anônimo (sem sessão) não vê contato nem sinal de pedido
  const anonCtx = await browser.newContext();
  const anonPage = await anonCtx.newPage();
  const asAnon = await verDoacao(anonPage, "duna", donationId);
  expect(asAnon.contact).toBeNull();
  expect(asAnon.myRequest).toBeNull();
  await anonCtx.close();

  // dois interessados pedem o livro
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = seedAccount("don_b");
  await register(pageB, b);
  await login(pageB, b);
  const reqB = await pageB.request.post(`/api/donations/${donationId}/requests`);
  expect(reqB.status()).toBe(201);

  const ctxC = await browser.newContext();
  const pageC = await ctxC.newPage();
  const c = seedAccount("don_c");
  await register(pageC, c);
  await login(pageC, c);
  const reqC = await pageC.request.post(`/api/donations/${donationId}/requests`);
  expect(reqC.status()).toBe(201);

  // pendente: sem contato, mas myRequest reflete o próprio pedido
  const bPending = await verDoacao(pageB, "duna", donationId);
  expect(bPending.contact).toBeNull();
  expect(bPending.myRequest.status).toBe("PENDENTE");

  // fila de interessados só é visível pro doador
  const queueForB = await pageB.request.get(`/api/donations/${donationId}/requests`);
  expect(queueForB.status()).toBe(403);
  const queueForDonor = await page.request.get(`/api/donations/${donationId}/requests`);
  expect(queueForDonor.ok()).toBeTruthy();
  const queueBody = await queueForDonor.json();
  expect(queueBody.requests).toHaveLength(2);

  // doador escolhe B
  const escolherRes = await page.request.patch(
    `/api/donations/${donationId}/requests/${queueBody.requests.find((r: { requesterId: string }) => r.requesterId === b.id).id}`,
    { data: { action: "escolher" } },
  );
  expect(escolherRes.ok()).toBeTruthy();

  // B agora vê o contato
  const bChosen = await verDoacao(pageB, "duna", donationId);
  expect(bChosen.myRequest.status).toBe("ESCOLHIDO");
  expect(bChosen.contact).toEqual({ whatsapp: "5511999998888", instagram: "doador_teste" });

  // C continua sem contato, mesmo com o próprio pedido pendente
  const cStillPending = await verDoacao(pageC, "duna", donationId);
  expect(cStillPending.contact).toBeNull();
  expect(cStillPending.myRequest.status).toBe("PENDENTE");
  expect(cStillPending.status).toBe("RESERVADO");

  await ctxB.close();
  await ctxC.close();
});

test("não é possível pedir a própria doação", async ({ page }) => {
  const donor = seedAccount("don_self");
  await register(page, donor);
  await login(page, donor);
  const donationId = await criarDoacao(page);

  const res = await page.request.post(`/api/donations/${donationId}/requests`);
  expect(res.status()).toBe(400);
});

test("pedido duplicado é bloqueado (unique donationId+requesterId)", async ({ page, browser }) => {
  const donor = seedAccount("don_dup");
  await register(page, donor);
  await login(page, donor);
  const donationId = await criarDoacao(page);

  const ctx = await browser.newContext();
  const interested = await ctx.newPage();
  const u = seedAccount("don_dup_u");
  await register(interested, u);
  await login(interested, u);

  const first = await interested.request.post(`/api/donations/${donationId}/requests`);
  expect(first.status()).toBe(201);

  const second = await interested.request.post(`/api/donations/${donationId}/requests`);
  expect(second.status()).toBe(409);

  await ctx.close();
});

test("escolher reserva a doação; pedir uma doação reservada falha", async ({ page, browser }) => {
  const donor = seedAccount("don_reserve");
  await register(page, donor);
  await login(page, donor);
  const donationId = await criarDoacao(page);

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = seedAccount("don_reserve_b");
  await register(pageB, b);
  await login(pageB, b);
  const reqBRes = await pageB.request.post(`/api/donations/${donationId}/requests`);
  expect(reqBRes.status()).toBe(201);

  const queue = await (await page.request.get(`/api/donations/${donationId}/requests`)).json();
  const requestId = queue.requests[0].id;
  const escolher = await page.request.patch(`/api/donations/${donationId}/requests/${requestId}`, {
    data: { action: "escolher" },
  });
  expect(escolher.ok()).toBeTruthy();

  const asDonor = await verDoacao(page, "duna", donationId);
  expect(asDonor.status).toBe("RESERVADO");

  const ctxC = await browser.newContext();
  const pageC = await ctxC.newPage();
  const c = seedAccount("don_reserve_c");
  await register(pageC, c);
  await login(pageC, c);
  const tooLate = await pageC.request.post(`/api/donations/${donationId}/requests`);
  expect(tooLate.status()).toBe(409);

  await ctxB.close();
  await ctxC.close();
});

test("marcar como doado preenche donatedAt e some da lista disponível", async ({ page }) => {
  const donor = seedAccount("don_doado");
  await register(page, donor);
  await login(page, donor);
  const donationId = await criarDoacao(page);

  const marcar = await page.request.patch(`/api/donations/${donationId}`, {
    data: { action: "doado" },
  });
  expect(marcar.ok()).toBeTruthy();

  const minhas = await (await page.request.get("/api/donations")).json();
  const mine = minhas.donations.find((d: { id: string }) => d.id === donationId);
  expect(mine.status).toBe("DOADO");

  // lista pública do livro só traz DISPONIVEL/RESERVADO
  const publicList = await (await page.request.get("/api/books/duna/donations")).json();
  expect(publicList.donations.find((d: { id: string }) => d.id === donationId)).toBeUndefined();

  const row = await withDb((client) =>
    client.query('SELECT status, "donatedAt" FROM "Donation" WHERE id = $1', [donationId]),
  );
  expect(row.rows[0].status).toBe("DOADO");
  expect(row.rows[0].donatedAt).toBeTruthy();
});

test("apagar doação faz cascade nos pedidos", async ({ page, browser }) => {
  const donor = seedAccount("don_cascade");
  await register(page, donor);
  await login(page, donor);
  const donationId = await criarDoacao(page);

  const ctx = await browser.newContext();
  const interested = await ctx.newPage();
  const u = seedAccount("don_cascade_u");
  await register(interested, u);
  await login(interested, u);
  await interested.request.post(`/api/donations/${donationId}/requests`);

  const del = await page.request.delete(`/api/donations/${donationId}`);
  expect(del.ok()).toBeTruthy();

  const left = await withDb((client) =>
    client.query('SELECT count(*)::int AS n FROM "DonationRequest" WHERE "donationId" = $1', [
      donationId,
    ]),
  );
  expect(left.rows[0].n).toBe(0);

  await ctx.close();
});

test("autorização: só o doador marca como doado, remove ou escolhe/recusa interessados", async ({
  page,
  browser,
}) => {
  const donor = seedAccount("don_authz");
  await register(page, donor);
  await login(page, donor);
  const donationId = await criarDoacao(page);

  const ctx = await browser.newContext();
  const stranger = await ctx.newPage();
  const s = seedAccount("don_authz_s");
  await register(stranger, s);
  await login(stranger, s);

  expect((await stranger.request.patch(`/api/donations/${donationId}`, { data: { action: "doado" } })).status()).toBe(
    403,
  );
  expect((await stranger.request.delete(`/api/donations/${donationId}`)).status()).toBe(403);
  expect(
    (
      await stranger.request.patch(`/api/donations/${donationId}/requests/nonexistent`, {
        data: { action: "escolher" },
      })
    ).status(),
  ).toBe(403);

  await ctx.close();
});

test("criar doação exige ao menos um contato e UF válida", async ({ page }) => {
  const donor = seedAccount("don_validation");
  await register(page, donor);
  await login(page, donor);

  const semContato = await page.request.post("/api/donations", {
    data: {
      bookId: "duna",
      photoUrl: "https://picsum.photos/seed/x/200/200",
      city: "São Paulo",
      state: "SP",
    },
  });
  expect(semContato.status()).toBe(400);

  const ufInvalida = await page.request.post("/api/donations", {
    data: {
      bookId: "duna",
      photoUrl: "https://picsum.photos/seed/y/200/200",
      city: "São Paulo",
      state: "XX",
      whatsapp: "5511999998888",
    },
  });
  expect(ufInvalida.status()).toBe(400);
});

test("criar/gerenciar doação exige sessão autenticada", async ({ page }) => {
  const post = await page.request.post("/api/donations", {
    data: {
      bookId: "duna",
      photoUrl: "https://picsum.photos/seed/anon/200/200",
      city: "São Paulo",
      state: "SP",
      whatsapp: "5511999998888",
    },
  });
  expect(post.status()).toBe(401);
});

async function escolher(page: Page, donationId: string, requesterId: string) {
  const queue = await (await page.request.get(`/api/donations/${donationId}/requests`)).json();
  const requestId = queue.requests.find((r: { requesterId: string }) => r.requesterId === requesterId).id;
  const res = await page.request.patch(`/api/donations/${donationId}/requests/${requestId}`, {
    data: { action: "escolher" },
  });
  expect(res.ok()).toBeTruthy();
}

test("recebedor confirma recebimento de doação ainda RESERVADO: finaliza a doação e notifica o doador", async ({
  page,
  browser,
}) => {
  const donor = seedAccount("don_confirm_a");
  await register(page, donor);
  await login(page, donor);
  const donationId = await criarDoacao(page);

  const ctx = await browser.newContext();
  const receiver = await ctx.newPage();
  const r = seedAccount("don_confirm_a_r");
  await register(receiver, r);
  await login(receiver, r);
  await receiver.request.post(`/api/donations/${donationId}/requests`);
  await escolher(page, donationId, r.id);

  const confirm = await receiver.request.patch(`/api/donations/${donationId}/confirm-receipt`);
  expect(confirm.ok()).toBeTruthy();
  expect(await confirm.json()).toEqual({ ok: true, finalized: true });

  const row = await withDb((client) =>
    client.query(
      'SELECT status, "donatedAt", "receiverConfirmedAt" FROM "Donation" WHERE id = $1',
      [donationId],
    ),
  );
  expect(row.rows[0].status).toBe("DOADO");
  expect(row.rows[0].donatedAt).toBeTruthy();
  expect(row.rows[0].receiverConfirmedAt).toBeTruthy();

  const notifs = await (await page.request.get("/api/notifications")).json();
  expect(
    notifs.notifications.some(
      (n: { type: string; actor: { id: string } | null }) =>
        n.type === "DONATION_RECEIPT_CONFIRMED" && n.actor?.id === r.id,
    ),
  ).toBe(true);

  await ctx.close();
});

test("doador marca doado primeiro; recebedor confirma depois só grava receiverConfirmedAt", async ({
  page,
  browser,
}) => {
  const donor = seedAccount("don_confirm_b");
  await register(page, donor);
  await login(page, donor);
  const donationId = await criarDoacao(page);

  const ctx = await browser.newContext();
  const receiver = await ctx.newPage();
  const r = seedAccount("don_confirm_b_r");
  await register(receiver, r);
  await login(receiver, r);
  await receiver.request.post(`/api/donations/${donationId}/requests`);
  await escolher(page, donationId, r.id);

  const marcar = await page.request.patch(`/api/donations/${donationId}`, { data: { action: "doado" } });
  expect(marcar.ok()).toBeTruthy();

  const confirm = await receiver.request.patch(`/api/donations/${donationId}/confirm-receipt`);
  expect(confirm.ok()).toBeTruthy();
  expect(await confirm.json()).toEqual({ ok: true, finalized: false });

  const row = await withDb((client) =>
    client.query('SELECT status, "receiverConfirmedAt" FROM "Donation" WHERE id = $1', [donationId]),
  );
  expect(row.rows[0].status).toBe("DOADO");
  expect(row.rows[0].receiverConfirmedAt).toBeTruthy();

  await ctx.close();
});

test("confirmar recebimento: só o escolhido pode, e não dá pra confirmar duas vezes", async ({
  page,
  browser,
}) => {
  const donor = seedAccount("don_confirm_c");
  await register(page, donor);
  await login(page, donor);
  const donationId = await criarDoacao(page);

  const ctx = await browser.newContext();
  const receiver = await ctx.newPage();
  const r = seedAccount("don_confirm_c_r");
  await register(receiver, r);
  await login(receiver, r);
  await receiver.request.post(`/api/donations/${donationId}/requests`);

  const ctxOther = await browser.newContext();
  const other = await ctxOther.newPage();
  const o = seedAccount("don_confirm_c_o");
  await register(other, o);
  await login(other, o);

  // ainda não escolhido: qualquer interessado é rejeitado (não é o ESCOLHIDO)
  expect((await receiver.request.patch(`/api/donations/${donationId}/confirm-receipt`)).status()).toBe(
    403,
  );

  await escolher(page, donationId, r.id);

  expect((await other.request.patch(`/api/donations/${donationId}/confirm-receipt`)).status()).toBe(403);

  const first = await receiver.request.patch(`/api/donations/${donationId}/confirm-receipt`);
  expect(first.ok()).toBeTruthy();

  const second = await receiver.request.patch(`/api/donations/${donationId}/confirm-receipt`);
  expect(second.status()).toBe(409);

  await ctx.close();
  await ctxOther.close();
});

test("estender reserva renova reservedAt, limpa reserveWarnedAt e notifica o recebedor", async ({
  page,
  browser,
}) => {
  const donor = seedAccount("don_extend_a");
  await register(page, donor);
  await login(page, donor);
  const donationId = await criarDoacao(page);

  const ctx = await browser.newContext();
  const receiver = await ctx.newPage();
  const r = seedAccount("don_extend_a_r");
  await register(receiver, r);
  await login(receiver, r);
  await receiver.request.post(`/api/donations/${donationId}/requests`);
  await escolher(page, donationId, r.id);

  // simula reserva parada há dias, com aviso já disparado
  await withDb((client) =>
    client.query(
      `UPDATE "Donation" SET "reservedAt" = now() - interval '6 days', "reserveWarnedAt" = now() - interval '1 day' WHERE id = $1`,
      [donationId],
    ),
  );

  const extend = await page.request.patch(`/api/donations/${donationId}/extend-reserve`);
  expect(extend.ok()).toBeTruthy();

  const row = await withDb((client) =>
    client.query('SELECT "reservedAt", "reserveWarnedAt" FROM "Donation" WHERE id = $1', [donationId]),
  );
  expect(row.rows[0].reserveWarnedAt).toBeNull();
  const ageMs = Date.now() - new Date(row.rows[0].reservedAt).getTime();
  expect(ageMs).toBeLessThan(60_000);

  const notifs = await (await receiver.request.get("/api/notifications")).json();
  expect(
    notifs.notifications.some((n: { type: string }) => n.type === "DONATION_RESERVE_EXTENDED"),
  ).toBe(true);

  await ctx.close();
});

test("estender reserva: só o doador, e só doação RESERVADO", async ({ page, browser }) => {
  const donor = seedAccount("don_extend_b");
  await register(page, donor);
  await login(page, donor);
  const donationId = await criarDoacao(page);

  const ctx = await browser.newContext();
  const stranger = await ctx.newPage();
  const s = seedAccount("don_extend_b_s");
  await register(stranger, s);
  await login(stranger, s);

  // ainda DISPONIVEL: doador não pode estender
  expect((await page.request.patch(`/api/donations/${donationId}/extend-reserve`)).status()).toBe(409);
  // estranho nunca pode, mesmo que a doação vire RESERVADO depois
  expect((await stranger.request.patch(`/api/donations/${donationId}/extend-reserve`)).status()).toBe(
    403,
  );

  await ctx.close();
});
