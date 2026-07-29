import "dotenv/config";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { createAccount, seedAccount, signInAs } from "./helpers/auth";

const BOOK = "ensaio-sobre-a-cegueira"; // fixture semeada em e2e/global-setup.ts
const FIXTURE_JPG = path.join(__dirname, "fixtures", "book.jpg");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

/** Upload real de foto depende de Vercel Blob (fora do alcance do e2e local/CI
 * — sem token configurado). Intercepta só esse POST e mantém o resto do
 * fluxo (form, botões, estado no banco) 100% real. */
async function stubPhotoUpload(page: Page) {
  await page.route("**/api/upload/book-photo", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "https://picsum.photos/seed/e2e-donation/200/200" }),
    }),
  );
}

async function login(page: Page, account: ReturnType<typeof seedAccount>) {
  await createAccount(account);
  await signInAs(page, account);
}

test.describe("Doação de livros — fluxo ponta a ponta", () => {
  test("doador cria, interessado pede, contato só libera após escolha, e some ao ser doado", async ({
    browser,
  }) => {
    const donorCtx = await browser.newContext();
    const userCtx = await browser.newContext();
    const donor = await donorCtx.newPage();
    const user = await userCtx.newPage();

    const donorAccount = seedAccount("ui_donor");
    const userAccount = seedAccount("ui_user");
    await login(donor, donorAccount);
    await login(user, userAccount);

    const city = `Cidade E2E ${Date.now()}`;
    const card = donor.locator("li", { hasText: city });
    const cardOnUser = user.locator("li", { hasText: city });

    // 1. Doador cria a doação pela UI real (foto interceptada, resto real)
    await stubPhotoUpload(donor);
    await donor.goto(`/book/${BOOK}`);
    await donor.waitForSelector("h1");
    await donor.getByRole("button", { name: "+ Doar este livro" }).click();

    const createDialog = donor.getByRole("dialog", { name: "Doar este livro" });
    await createDialog.locator('input[type="file"]').setInputFiles(FIXTURE_JPG);
    await expect(createDialog.getByText("Trocar foto")).toBeVisible();
    await createDialog.getByLabel(/estado \(uf\)/i).selectOption("SP");
    await createDialog.getByLabel(/cidade/i).fill(city);
    await createDialog.getByLabel(/whatsapp/i).fill("5511999998888");
    await createDialog.getByRole("button", { name: "Publicar doação" }).click();
    await expect(createDialog).toBeHidden();
    await expect(card).toBeVisible();
    await expect(card.getByText(/sua doação/i)).toBeVisible();

    // 2. Interessado vê a doação SEM contato e sem o botão de gerenciar
    await user.goto(`/book/${BOOK}`);
    await user.waitForSelector("h1");
    await expect(cardOnUser).toBeVisible();
    await expect(cardOnUser.getByText(/sua doação/i)).toHaveCount(0);
    await expect(cardOnUser.getByRole("link", { name: /whatsapp/i })).toHaveCount(0);

    // 3. Interessado registra interesse
    await cardOnUser.getByRole("button", { name: "Quero este" }).click();
    await expect(cardOnUser.getByText(/interesse enviado/i)).toBeVisible();

    // 4. Doador escolhe o interessado
    await donor.reload();
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /sua doação · gerenciar/i }).click();
    const manageDialog = donor.getByRole("dialog", { name: "Gerenciar doação" });
    await expect(manageDialog.getByText(userAccount.name)).toBeVisible();
    await manageDialog.getByRole("button", { name: "Escolher" }).click();
    await expect(manageDialog.getByRole("button", { name: /marcar como doado/i })).toBeVisible();

    // 5. Agora o interessado vê o contato liberado
    await user.reload();
    await expect(cardOnUser).toBeVisible();
    const whatsappLink = cardOnUser.getByRole("link", { name: /whatsapp/i });
    await expect(whatsappLink).toBeVisible();
    await expect(whatsappLink).toHaveAttribute("href", /^https:\/\/wa\.me\/5511999998888$/);

    // 6. Doador marca como doado → some da lista de ambos
    await manageDialog.getByRole("button", { name: /marcar como doado/i }).click();
    await expect(manageDialog.getByText(/já foi doado/i)).toBeVisible();

    await user.reload();
    await expect(user.locator("li", { hasText: city })).toHaveCount(0);

    await donorCtx.close();
    await userCtx.close();
  });

  test("não é possível pedir a própria doação", async ({ browser }) => {
    const ctx = await browser.newContext();
    const donor = await ctx.newPage();
    const account = seedAccount("ui_self");
    await login(donor, account);

    const city = `Cidade Self E2E ${Date.now()}`;
    await stubPhotoUpload(donor);
    await donor.goto(`/book/${BOOK}`);
    await donor.waitForSelector("h1");
    await donor.getByRole("button", { name: "+ Doar este livro" }).click();

    const createDialog = donor.getByRole("dialog", { name: "Doar este livro" });
    await createDialog.locator('input[type="file"]').setInputFiles(FIXTURE_JPG);
    await expect(createDialog.getByText("Trocar foto")).toBeVisible();
    await createDialog.getByLabel(/estado \(uf\)/i).selectOption("RJ");
    await createDialog.getByLabel(/cidade/i).fill(city);
    await createDialog.getByLabel(/instagram/i).fill("doador_self_teste");
    await createDialog.getByRole("button", { name: "Publicar doação" }).click();
    await expect(createDialog).toBeHidden();

    const card = donor.locator("li", { hasText: city });
    await expect(card).toBeVisible();
    await expect(card.getByText(/sua doação/i)).toBeVisible();
    await expect(card.getByRole("button", { name: "Quero este" })).toHaveCount(0);

    await ctx.close();
  });
});
