import "dotenv/config";
import { test, expect } from "@playwright/test";
import { createAndSignIn, seedAccount } from "./helpers/auth";

/** Livro do mês definido aparece no feed de quem é membro do clube, mesmo
 * sem seguir o admin — e a mesma regra generalizada vale pra CLUB_JOINED
 * (ver spec Atividade do clube no feed). */
test("livro do mês no feed: visível pra membro do clube, invisível pra quem não é membro nem segue", async ({
  browser,
}) => {
  const ctxAdmin = await browser.newContext();
  const pageAdmin = await ctxAdmin.newPage();
  const admin = seedAccount("bom_admin");
  await createAndSignIn(pageAdmin, admin);

  const created = await pageAdmin.request.post("/api/clubs", {
    data: { name: "Clube do feed", desc: "", visibility: "public" },
  });
  expect(created.ok()).toBeTruthy();
  const { id: clubId } = await created.json();

  // membro do clube, não segue o admin
  const ctxMember = await browser.newContext();
  const pageMember = await ctxMember.newPage();
  const member = seedAccount("bom_member");
  await createAndSignIn(pageMember, member);
  const joined = await pageMember.request.post(`/api/clubs/${clubId}/join`);
  expect(joined.ok()).toBeTruthy();

  // nem membro, nem segue o admin
  const ctxOutsider = await browser.newContext();
  const pageOutsider = await ctxOutsider.newPage();
  const outsider = seedAccount("bom_outsider");
  await createAndSignIn(pageOutsider, outsider);

  const bom = await pageAdmin.request.put(`/api/clubs/${clubId}/book-of-month`, {
    data: { bookId: "duna" },
  });
  expect(bom.ok()).toBeTruthy();

  const memberFeed = await (await pageMember.request.get("/api/feed?scope=following")).json();
  const memberEvent = memberFeed.items.find(
    (i: { type: string; club?: { id: string } }) => i.type === "CLUB_BOOK_OF_MONTH_SET" && i.club?.id === clubId
  );
  expect(memberEvent).toBeTruthy();
  expect(memberEvent.book.id).toBe("duna");

  const outsiderFeed = await (await pageOutsider.request.get("/api/feed?scope=following")).json();
  const outsiderEvent = outsiderFeed.items.find(
    (i: { type: string; club?: { id: string } }) => i.type === "CLUB_BOOK_OF_MONTH_SET" && i.club?.id === clubId
  );
  expect(outsiderEvent).toBeFalsy();

  await ctxAdmin.close();
  await ctxMember.close();
  await ctxOutsider.close();
});

test("CLUB_JOINED passa a ser visível pra outros membros do clube (regra generalizada por clubId)", async ({
  browser,
}) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  const a = seedAccount("bom_joined_a");
  await createAndSignIn(pageA, a);

  const created = await pageA.request.post("/api/clubs", {
    data: { name: "Clube generalizado", desc: "", visibility: "public" },
  });
  const { id: clubId } = await created.json();

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const b = seedAccount("bom_joined_b");
  await createAndSignIn(pageB, b);
  // B não segue A, mas entra no mesmo clube
  const joinedB = await pageB.request.post(`/api/clubs/${clubId}/join`);
  expect(joinedB.ok()).toBeTruthy();

  // A não segue B, mas é membro do mesmo clube: deve ver o CLUB_JOINED de B
  const feedA = await (await pageA.request.get("/api/feed?scope=following")).json();
  const clubJoinedEvent = feedA.items.find(
    (i: { type: string; club?: { id: string }; user: { username: string } }) =>
      i.type === "CLUB_JOINED" && i.club?.id === clubId && i.user.username === b.username
  );
  expect(clubJoinedEvent).toBeTruthy();

  await ctxA.close();
  await ctxB.close();
});

test("trocar o livro do mês no mesmo mês gera um segundo evento (upsert não deduplica)", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const admin = seedAccount("bom_retry");
  await createAndSignIn(page, admin);

  const created = await page.request.post("/api/clubs", {
    data: { name: "Clube indeciso", desc: "", visibility: "public" },
  });
  const { id: clubId } = await created.json();

  const first = await page.request.put(`/api/clubs/${clubId}/book-of-month`, { data: { bookId: "duna" } });
  expect(first.ok()).toBeTruthy();
  const second = await page.request.put(`/api/clubs/${clubId}/book-of-month`, { data: { bookId: "1984" } });
  expect(second.ok()).toBeTruthy();

  const feed = await (await page.request.get("/api/feed?scope=following")).json();
  const events = feed.items.filter(
    (i: { type: string; club?: { id: string } }) => i.type === "CLUB_BOOK_OF_MONTH_SET" && i.club?.id === clubId
  );
  expect(events).toHaveLength(2);
  expect(events.map((e: { book: { id: string } }) => e.book.id).sort()).toEqual(["1984", "duna"]);

  await ctx.close();
});
