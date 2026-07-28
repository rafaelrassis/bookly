import { encode } from "next-auth/jwt";
import { Client } from "pg";
import type { Page } from "@playwright/test";

/** Nome do cookie de sessão do Auth.js v5 em http (dev/e2e) — teria prefixo
 * "__Secure-" se a suíte rodasse sob https. */
const SESSION_COOKIE = "authjs.session-token";

export type SeedAccount = {
  id: string;
  email: string;
  username: string;
  name: string;
};

export function seedAccount(tag: string): SeedAccount {
  const rand = Math.random().toString(36).slice(2, 8);
  return {
    id: `e2e-${tag}-${rand}`,
    email: `e2e.${tag}.${rand}@example.com`,
    username: `e2e_${tag}_${rand}`,
    name: `Leitora ${tag}`,
  };
}

export async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Cria a conta direto no banco — equivalente ao que o PrismaAdapter faria no
 * primeiro login OAuth real, que não dá pra automatizar aqui (não temos
 * credenciais de um provider de verdade). Por padrão já sai onboarded, pra
 * suíte não precisar passar pelo onboarding em todo teste; passe
 * `onboarded: false` pra testar o gate (a conta nasce sem username). */
export async function createAccount(account: SeedAccount, opts?: { onboarded?: boolean }) {
  const onboarded = opts?.onboarded ?? true;
  await withDb((client) =>
    client.query(
      `INSERT INTO "User" (id, email, username, name, onboarded, "updatedAt")
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (id) DO NOTHING`,
      [account.id, account.email, onboarded ? account.username : null, account.name, onboarded]
    )
  );
}

/** Injeta um cookie de sessão Auth.js (JWT) válido pra conta, dispensando a
 * UI de login OAuth real dentro do Playwright. */
export async function signInAs(page: Page, account: SeedAccount) {
  const token = await encode({
    secret: process.env.AUTH_SECRET!,
    salt: SESSION_COOKIE,
    token: { sub: account.id, uid: account.id, email: account.email, name: account.name },
  });
  await page.context().addCookies([
    {
      name: SESSION_COOKIE,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/** Atalho pros specs que só precisam de "uma conta logada" — cria e injeta o
 * cookie de sessão numa chamada. */
export async function createAndSignIn(page: Page, account: SeedAccount, opts?: { onboarded?: boolean }) {
  await createAccount(account, opts);
  await signInAs(page, account);
}
