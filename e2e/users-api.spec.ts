import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";

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

async function latestCode(email: string, type: "email" | "password") {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query<{ code: string }>(
      'SELECT code FROM "VerificationCode" WHERE email = $1 AND type = $2 ORDER BY "createdAt" DESC LIMIT 1',
      [email, type]
    );
    return res.rows[0]?.code;
  } finally {
    await client.end();
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test("PATCH /api/users/me rejeita username em uso e top4 inexistente", async ({ page }) => {
  const a = seedAccount("patch_a");
  const b = seedAccount("patch_b");
  await register(page, a);
  await register(page, b);
  await login(page, a);

  const taken = await page.request.patch("/api/users/me", { data: { username: b.username } });
  expect(taken.status()).toBe(409);

  const badTop4 = await page.request.patch("/api/users/me", {
    data: { top4: ["livro-que-nao-existe"] },
  });
  expect(badTop4.status()).toBe(400);

  const ok = await page.request.patch("/api/users/me", {
    data: { bio: "Bio de teste", top4: ["duna", "1984"] },
  });
  expect(ok.ok()).toBeTruthy();
  const body = await ok.json();
  expect(body.bio).toBe("Bio de teste");
  expect(body.top4).toEqual(["duna", "1984"]);
});

test("follow/unfollow real refletem em followers/following e isFollowing", async ({ page }) => {
  const a = seedAccount("follow_a");
  const b = seedAccount("follow_b");
  await register(page, a);
  await register(page, b);
  await login(page, a);

  const follow = await page.request.post(`/api/users/${b.username}/follow`);
  expect(follow.ok()).toBeTruthy();

  const profile = await page.request.get(`/api/users/${b.username}`);
  const profileBody = await profile.json();
  expect(profileBody.followers).toBe(1);
  expect(profileBody.isFollowing).toBe(true);

  const followersList = await page.request.get(`/api/users/${b.username}/followers`);
  const followersBody = await followersList.json();
  expect(followersBody.items.map((u: { username: string }) => u.username)).toContain(a.username);

  const unfollow = await page.request.delete(`/api/users/${b.username}/follow`);
  expect(unfollow.ok()).toBeTruthy();

  const profileAfter = await page.request.get(`/api/users/${b.username}`);
  const profileAfterBody = await profileAfter.json();
  expect(profileAfterBody.followers).toBe(0);
  expect(profileAfterBody.isFollowing).toBe(false);
});

test("não é possível seguir a si mesmo", async ({ page }) => {
  const a = seedAccount("self");
  await register(page, a);
  await login(page, a);

  const res = await page.request.post(`/api/users/${a.username}/follow`);
  expect(res.status()).toBe(400);
});

test("troca de e-mail exige código enviado ao endereço novo", async ({ page }) => {
  const a = seedAccount("mail");
  await register(page, a);
  await login(page, a);

  const newEmail = `novo.${Math.random().toString(36).slice(2, 8)}@example.com`;

  const wrongCode = await page.request.post("/api/users/me/email/confirm", {
    data: { newEmail, code: "000000" },
  });
  expect(wrongCode.status()).toBe(400);

  const request = await page.request.post("/api/users/me/email/request", {
    data: { newEmail },
  });
  expect(request.ok()).toBeTruthy();

  const code = await latestCode(newEmail, "email");
  expect(code).toBeTruthy();

  const confirm = await page.request.post("/api/users/me/email/confirm", {
    data: { newEmail, code },
  });
  expect(confirm.ok()).toBeTruthy();

  // login com o e-mail antigo não funciona mais; com o novo, funciona
  await page.goto("/login");
  await page.fill('input[type="email"]', newEmail);
  await page.fill('input[type="password"]', a.password);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL("**/home");
});

test("troca de senha exige a senha atual correta", async ({ page }) => {
  const a = seedAccount("pass");
  await register(page, a);
  await login(page, a);

  const wrongCurrent = await page.request.post("/api/users/me/password", {
    data: { current: "senhaErrada123", next: "NovaSenha123" },
  });
  expect(wrongCurrent.status()).toBe(400);

  const ok = await page.request.post("/api/users/me/password", {
    data: { current: a.password, next: "NovaSenha123" },
  });
  expect(ok.ok()).toBeTruthy();

  await page.context().clearCookies();
  await page.goto("/login");
  await page.fill('input[type="email"]', a.email);
  await page.fill('input[type="password"]', "NovaSenha123");
  await page.click('button:has-text("Entrar")');
  await page.waitForURL("**/home");
});
