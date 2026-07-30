import "dotenv/config";
import { test, expect } from "@playwright/test";
import { createAndSignIn, seedAccount } from "./helpers/auth";

/** Discussão do livro do mês travada por progresso (Duna, 680 páginas
 * segundo a fixture do global-setup). */
test("discussão do livro do mês: filtro por página, validação de spoiler e CTA sem estante", async ({
  browser,
}) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  const a = seedAccount("disc_a");
  await createAndSignIn(pageA, a);

  const created = await pageA.request.post("/api/clubs", {
    data: { name: "Clube da discussão", bookId: "duna", desc: "", visibility: "public" },
  });
  expect(created.ok()).toBeTruthy();
  const { id: clubId } = await created.json();

  const bom = await pageA.request.put(`/api/clubs/${clubId}/book-of-month`, {
    data: { bookId: "duna" },
  });
  expect(bom.ok()).toBeTruthy();

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = seedAccount("disc_b");
  await createAndSignIn(pageB, b);
  await pageB.request.post(`/api/clubs/${clubId}/join`);

  const ctxC = await browser.newContext();
  const pageC = await ctxC.newPage();
  const c = seedAccount("disc_c");
  await createAndSignIn(pageC, c);
  await pageC.request.post(`/api/clubs/${clubId}/join`);

  const ctxD = await browser.newContext();
  const pageD = await ctxD.newPage();
  const d = seedAccount("disc_d");
  await createAndSignIn(pageD, d);
  // D nunca entra no clube — usado só pra checar 403.

  // B está lendo até a página 100.
  await pageB.request.put("/api/books/duna/shelf", { data: { status: "READING" } });
  await pageB.request.put("/api/books/duna/progress", { data: { page: 100 } });

  // A terminou o livro.
  await pageA.request.put("/api/books/duna/shelf", { data: { status: "READ" } });

  // 1) comentário além do próprio progresso é rejeitado.
  const beyond = await pageB.request.post(`/api/clubs/${clubId}/discussion`, {
    data: { content: "Spoiler acidental", page: 150 },
  });
  expect(beyond.status()).toBe(400);
  expect((await beyond.json()).error).toBe("PAGE_BEYOND_YOUR_PROGRESS");

  // B comenta dentro do seu progresso (página 50).
  const bComment = await pageB.request.post(`/api/clubs/${clubId}/discussion`, {
    data: { content: "Comentário da B até a página 50", page: 50 },
  });
  expect(bComment.status()).toBe(201);

  // A (READ) pode comentar em qualquer página, mesmo além do que "leu".
  const aComment1 = await pageA.request.post(`/api/clubs/${clubId}/discussion`, {
    data: { content: "Comentário da A na página 300", page: 300 },
  });
  expect(aComment1.status()).toBe(201);
  const aComment2 = await pageA.request.post(`/api/clubs/${clubId}/discussion`, {
    data: { content: "Comentário da A na página 600", page: 600 },
  });
  expect(aComment2.status()).toBe(201);

  // 2) leitor na página 100 só vê comentários com page <= 100.
  const bView = await (await pageB.request.get(`/api/clubs/${clubId}/discussion`)).json();
  expect(bView.comments).toHaveLength(1);
  expect(bView.comments[0].content).toBe("Comentário da B até a página 50");
  // 5) lockedCount bate com o total de comentários acima do progresso (2 da A).
  expect(bView.lockedCount).toBe(2);

  // 3) leitor com status READ vê todos os comentários, mesmo os de página alta.
  const aView = await (await pageA.request.get(`/api/clubs/${clubId}/discussion`)).json();
  expect(aView.comments).toHaveLength(3);
  expect(aView.lockedCount).toBe(0);

  // 4) leitor sem estante pro livro: área bloqueada, zero comentário vazado.
  const cView = await (await pageC.request.get(`/api/clubs/${clubId}/discussion`)).json();
  expect(cView.mine).toBeNull();
  expect(cView.comments).toHaveLength(0);
  expect(cView.lockedCount).toBeUndefined();

  const cPost = await pageC.request.post(`/api/clubs/${clubId}/discussion`, {
    data: { content: "Não deveria conseguir postar", page: 0 },
  });
  expect(cPost.status()).toBe(400);
  expect((await cPost.json()).error).toBe("NO_PROGRESS");

  // 6) filtragem confirmada no servidor: quem não é membro nem enxerga o endpoint.
  const dView = await pageD.request.get(`/api/clubs/${clubId}/discussion`);
  expect(dView.status()).toBe(403);

  await ctxB.close();
  await ctxC.close();
  await ctxD.close();
  await ctxA.close();
});
