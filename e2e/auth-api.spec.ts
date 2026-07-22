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
  return res;
}

async function login(page: Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL("**/home");
}

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function latestCode(email: string, type: "email" | "password") {
  return withDb(async (client) => {
    const res = await client.query<{ code: string }>(
      'SELECT code FROM "VerificationCode" WHERE email = $1 AND type = $2 ORDER BY "createdAt" DESC LIMIT 1',
      [email, type]
    );
    return res.rows[0]?.code;
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test("registro: cria User com hash bcrypt e VerificationCode com TTL ~15min", async ({ page }) => {
  const a = seedAccount("reg_hash");
  await register(page, a);

  const row = await withDb(async (client) => {
    const res = await client.query<{ passwordHash: string; emailVerified: Date | null }>(
      'SELECT "passwordHash", "emailVerified" FROM "User" WHERE email = $1',
      [a.email]
    );
    return res.rows[0];
  });
  expect(row).toBeTruthy();
  expect(row.passwordHash).toMatch(/^\$2[aby]?\$/);
  expect(row.passwordHash.length).toBeGreaterThanOrEqual(59);
  expect(row.emailVerified).toBeNull();

  const code = await withDb(async (client) => {
    const res = await client.query<{ code: string; expiresAt: Date; createdAt: Date }>(
      'SELECT code, "expiresAt", "createdAt" FROM "VerificationCode" WHERE email = $1 AND type = $2 ORDER BY "createdAt" DESC LIMIT 1',
      [a.email, "email"]
    );
    return res.rows[0];
  });
  expect(code).toBeTruthy();
  expect(code.code).toMatch(/^\d{6}$/);
  const ttlMinutes =
    (new Date(code.expiresAt).getTime() - new Date(code.createdAt).getTime()) / 60_000;
  expect(ttlMinutes).toBeGreaterThan(14);
  expect(ttlMinutes).toBeLessThan(16);
});

test("registro: e-mail ou username já usados retornam 409", async ({ page }) => {
  const a = seedAccount("reg_dupe");
  await register(page, a);

  const dupeEmail = await page.request.post("/api/auth/register", {
    data: { ...seedAccount("reg_dupe2"), email: a.email },
  });
  expect(dupeEmail.status()).toBe(409);

  const dupeUsername = await page.request.post("/api/auth/register", {
    data: { ...seedAccount("reg_dupe3"), username: a.username },
  });
  expect(dupeUsername.status()).toBe(409);
});

test("registro: payload inválido (senha curta, username fora do regex) retorna 400", async ({
  page,
}) => {
  const shortPassword = await page.request.post("/api/auth/register", {
    data: { ...seedAccount("reg_bad1"), password: "curta1" },
  });
  expect(shortPassword.status()).toBe(400);

  const badUsername = await page.request.post("/api/auth/register", {
    data: { ...seedAccount("reg_bad2"), username: "Nome Com Espaço!" },
  });
  expect(badUsername.status()).toBe(400);
});

test("login: senha errada e e-mail inexistente falham com a mesma mensagem genérica", async ({
  page,
}) => {
  const a = seedAccount("logingen");
  await register(page, a);

  await page.goto("/login");
  await page.fill('input[type="email"]', a.email);
  await page.fill('input[type="password"]', "senhaErrada123");
  await page.click('button:has-text("Entrar")');
  const wrongPasswordError = await page.locator("text=Credenciais inválidas.").textContent();

  await page.reload();
  await page.fill('input[type="email"]', `naoexiste.${Date.now()}@example.com`);
  await page.fill('input[type="password"]', "qualquerSenha123");
  await page.click('button:has-text("Entrar")');
  const unknownEmailError = await page.locator("text=Credenciais inválidas.").textContent();

  expect(wrongPasswordError).toBe(unknownEmailError);
  expect(page.url()).toContain("/login");
});

test("login correto abre sessão e resposta de /api/users/me nunca expõe passwordHash", async ({
  page,
}) => {
  const a = seedAccount("login_ok");
  await register(page, a);
  await login(page, a);

  const me = await page.request.get("/api/users/me");
  expect(me.ok()).toBeTruthy();
  const body = await me.json();
  expect(body).not.toHaveProperty("passwordHash");
  expect(JSON.stringify(body)).not.toContain("passwordHash");
});

test("GET /api/users/me sem sessão retorna 401", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const res = await page.request.get("/api/users/me");
  expect(res.status()).toBe(401);
  await context.close();
});

test("verificação de e-mail: reenvio antes de 60s retorna 429 (cooldown)", async ({ page }) => {
  const a = seedAccount("vercool");
  await register(page, a);

  const resend = await page.request.post("/api/verification/email/send", {
    data: { email: a.email },
  });
  expect(resend.status()).toBe(429);
});

test("verificação de e-mail: código errado não verifica; código certo seta emailVerified", async ({
  page,
}) => {
  const a = seedAccount("verflow");
  await register(page, a);

  const wrong = await page.request.post("/api/verification/email/verify", {
    data: { email: a.email, code: "000000" },
  });
  expect(wrong.status()).toBe(400);

  const stillUnverified = await withDb(async (client) => {
    const res = await client.query<{ emailVerified: Date | null }>(
      'SELECT "emailVerified" FROM "User" WHERE email = $1',
      [a.email]
    );
    return res.rows[0].emailVerified;
  });
  expect(stillUnverified).toBeNull();

  const code = await latestCode(a.email, "email");
  const ok = await page.request.post("/api/verification/email/verify", {
    data: { email: a.email, code },
  });
  expect(ok.ok()).toBeTruthy();

  const verified = await withDb(async (client) => {
    const res = await client.query<{ emailVerified: Date | null }>(
      'SELECT "emailVerified" FROM "User" WHERE email = $1',
      [a.email]
    );
    return res.rows[0].emailVerified;
  });
  expect(verified).not.toBeNull();
});

test("forgot/reset: troca a senha, marca o código usado e bloqueia reuso", async ({ page }) => {
  const a = seedAccount("resetpw");
  await register(page, a);

  const forgot = await page.request.post("/api/auth/forgot", { data: { email: a.email } });
  expect(forgot.ok()).toBeTruthy();

  const code = await latestCode(a.email, "password");
  expect(code).toBeTruthy();

  const newPassword = "NovaSenhaForte123";
  const reset = await page.request.post("/api/auth/reset", {
    data: { email: a.email, code, password: newPassword },
  });
  expect(reset.ok()).toBeTruthy();

  const reused = await page.request.post("/api/auth/reset", {
    data: { email: a.email, code, password: "OutraSenha123" },
  });
  expect(reused.status()).toBe(400);

  await login(page, { email: a.email, password: newPassword });
});

test("forgot: e-mail inexistente responde 200 sem revelar se existe", async ({ page }) => {
  const res = await page.request.post("/api/auth/forgot", {
    data: { email: `naoexiste.${Date.now()}@example.com` },
  });
  expect(res.ok()).toBeTruthy();
});

test("middleware: rota protegida sem sessão redireciona para /login", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/home");
  await page.waitForURL("**/login");
  expect(page.url()).toContain("/login");
  await context.close();
});
