import { test, expect } from "@playwright/test";
import { createAccount, seedAccount, signInAs } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test("middleware: rota protegida sem sessão redireciona para /login", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/home");
  await page.waitForURL("**/login");
  expect(page.url()).toContain("/login");
  await context.close();
});

test("GET /api/users/me sem sessão retorna 401", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const res = await page.request.get("/api/users/me");
  expect(res.status()).toBe(401);
  await context.close();
});

test("conta autenticada mas não onboarded é redirecionada pro /onboarding", async ({ page }) => {
  const account = seedAccount("gate_pending");
  await createAccount(account, { onboarded: false });
  await signInAs(page, account);

  await page.goto("/home");
  await page.waitForURL("**/onboarding");
});

test("conta onboarded acessa /home normalmente", async ({ page }) => {
  const account = seedAccount("gate_ok");
  await createAccount(account, { onboarded: true });
  await signInAs(page, account);

  await page.goto("/home");
  await expect(page).toHaveURL(/\/home/);
});
