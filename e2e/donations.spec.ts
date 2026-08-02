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
  test("doador cria, interessado pede, contato só libera após escolha (na negociação), e some ao ser doado", async ({
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

    const city = "São Paulo"; // município real do IBGE (src/data/br-cities.ts)
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
    await createDialog.getByLabel(/cidade/i).fill("São Pau");
    await createDialog.getByRole("option", { name: new RegExp(city) }).click();
    await createDialog.getByLabel(/whatsapp/i).fill("5511999998888");
    await createDialog.getByRole("button", { name: "Publicar doação" }).click();
    await expect(createDialog).toBeHidden();
    await expect(card).toBeVisible();
    await expect(card.getByText(/sua doação/i)).toBeVisible();

    // 2. Interessado vê a doação SEM contato e sem o link de gerenciar
    await user.goto(`/book/${BOOK}`);
    await user.waitForSelector("h1");
    await expect(cardOnUser).toBeVisible();
    await expect(cardOnUser.getByText(/sua doação/i)).toHaveCount(0);
    await expect(cardOnUser.getByRole("link", { name: /whatsapp/i })).toHaveCount(0);

    // 3. Interessado registra interesse
    await cardOnUser.getByRole("button", { name: "Quero este" }).click();
    await expect(cardOnUser.getByText(/interesse enviado/i)).toBeVisible();

    // 4. Doador abre a tela de negociação (Proposta 3: nada mais de sheet
    // "Gerenciar doação" — cada doação vira uma tela própria em /donations/[id])
    await donor.reload();
    await expect(card).toBeVisible();
    await card.getByRole("link", { name: /sua doação · gerenciar/i }).click();
    await donor.waitForURL(/\/donations\//);

    // Filtra pela li que tem o botão "Escolher" (não qualquer li com o nome —
    // a linha do tempo logo abaixo também menciona o interessado, o que
    // duplicaria o locator em modo estrito).
    const candidateRow = donor.locator("li").filter({ has: donor.getByRole("button", { name: "Escolher" }) });
    await expect(candidateRow.getByText(userAccount.name, { exact: true })).toBeVisible();
    await candidateRow.getByRole("button", { name: "Escolher" }).click();

    // Depois de escolher, a doação virou RESERVADO: bloco "Sua vez" do doador
    // agora oferece "Confirmar entrega".
    await expect(donor.getByRole("button", { name: /confirmar entrega/i })).toBeVisible();

    // 5. Agora o interessado, na negociação, vê o contato liberado
    await user.reload();
    await expect(cardOnUser).toBeVisible();
    await cardOnUser.getByRole("link", { name: /você foi escolhido/i }).click();
    await user.waitForURL(/\/donations\//);

    const whatsappLink = user.getByRole("link", { name: /abrir conversa/i });
    await expect(whatsappLink).toBeVisible();
    await expect(whatsappLink).toHaveAttribute("href", /^https:\/\/wa\.me\/5511999998888$/);

    // 6. Doador confirma a entrega (Sheet de confirmação nomeando a
    // consequência) → some da lista pública de ambos
    await donor.getByRole("button", { name: /confirmar entrega/i }).click();
    const confirmDialog = donor.getByRole("dialog", { name: "Confirmar entrega" });
    await confirmDialog.getByRole("button", { name: /confirmar entrega/i }).click();
    await expect(donor.getByText(/doação concluída/i)).toBeVisible();

    // O usuário estava na tela de negociação (navegou pra lá no passo
    // anterior) — volta pra página do livro pra checar a lista pública.
    await user.goto(`/book/${BOOK}`);
    await expect(user.locator("li", { hasText: city })).toHaveCount(0);

    await donorCtx.close();
    await userCtx.close();
  });

  test("estender prazo e cancelar reserva pela tela de negociação", async ({ browser }) => {
    const donorCtx = await browser.newContext();
    const userCtx = await browser.newContext();
    const donor = await donorCtx.newPage();
    const user = await userCtx.newPage();

    const donorAccount = seedAccount("ui_donor_ext");
    const userAccount = seedAccount("ui_user_ext");
    await login(donor, donorAccount);
    await login(user, userAccount);

    const city = "São Paulo"; // município real do IBGE (src/data/br-cities.ts)

    await stubPhotoUpload(donor);
    await donor.goto(`/book/${BOOK}`);
    await donor.waitForSelector("h1");
    await donor.getByRole("button", { name: "+ Doar este livro" }).click();

    const createDialog = donor.getByRole("dialog", { name: "Doar este livro" });
    await createDialog.locator('input[type="file"]').setInputFiles(FIXTURE_JPG);
    await expect(createDialog.getByText("Trocar foto")).toBeVisible();
    await createDialog.getByLabel(/estado \(uf\)/i).selectOption("SP");
    await createDialog.getByLabel(/cidade/i).fill("São Pau");
    await createDialog.getByRole("option", { name: new RegExp(city) }).click();
    await createDialog.getByLabel(/whatsapp/i).fill("5511999997777");
    await createDialog.getByRole("button", { name: "Publicar doação" }).click();
    await expect(createDialog).toBeHidden();

    const card = donor.locator("li", { hasText: city }).filter({ hasText: /sua doação/i });
    await expect(card).toBeVisible();

    await user.goto(`/book/${BOOK}`);
    await user.waitForSelector("h1");
    const cardOnUser = user.locator("li", { hasText: city }).filter({ hasText: /quero este|interesse enviado/i });
    await cardOnUser.getByRole("button", { name: "Quero este" }).click();
    await expect(cardOnUser.getByText(/interesse enviado/i)).toBeVisible();

    await donor.reload();
    await donor.locator("li", { hasText: city }).filter({ hasText: /sua doação/i }).getByRole("link", { name: /sua doação · gerenciar/i }).click();
    await donor.waitForURL(/\/donations\//);

    const candidateRow = donor.locator("li", { hasText: userAccount.name });
    await candidateRow.getByRole("button", { name: "Escolher" }).click();
    await expect(donor.getByRole("button", { name: /confirmar entrega/i })).toBeVisible();

    // Estender prazo: fica na mesma tela, reserva continua RESERVADO.
    await donor.getByRole("button", { name: /estender prazo em 7 dias/i }).click();
    await expect(donor.getByText(/prazo renovado por mais 7 dias/i)).toBeVisible();
    await expect(donor.getByRole("button", { name: /confirmar entrega/i })).toBeVisible();

    // Cancelar reserva: abre Sheet de confirmação nomeando a consequência,
    // e — ao contrário de "Remover doação" — NÃO apaga a doação: ela volta
    // pra DISPONIVEL e o interessado cancelado volta pra fila (PENDENTE),
    // então "Escolher" reaparece pro mesmo interessado.
    await donor.getByRole("button", { name: /cancelar reserva/i }).click();
    const cancelDialog = donor.getByRole("dialog", { name: "Cancelar reserva" });
    await expect(cancelDialog.getByText(/volta a ficar dispon[íi]vel/i)).toBeVisible();
    await cancelDialog.getByRole("button", { name: "Cancelar reserva" }).click();
    await expect(donor.getByText(/reserva cancelada/i)).toBeVisible();
    await expect(donor.getByRole("button", { name: /estender prazo em 7 dias/i })).toHaveCount(0);
    await expect(candidateRow.getByRole("button", { name: "Escolher" })).toBeVisible();

    // A doação continua listada (não sumiu) e o livro voltou a poder ser
    // pedido — a diferença central entre "cancelar reserva" e "remover".
    await user.reload();
    await expect(user.locator("li", { hasText: city }).filter({ hasText: /interesse enviado/i })).toBeVisible();

    await donorCtx.close();
    await userCtx.close();
  });

  test("não é possível pedir a própria doação", async ({ browser }) => {
    const ctx = await browser.newContext();
    const donor = await ctx.newPage();
    const account = seedAccount("ui_self");
    await login(donor, account);

    const city = "Rio de Janeiro"; // município real do IBGE (src/data/br-cities.ts)
    await stubPhotoUpload(donor);
    await donor.goto(`/book/${BOOK}`);
    await donor.waitForSelector("h1");
    await donor.getByRole("button", { name: "+ Doar este livro" }).click();

    const createDialog = donor.getByRole("dialog", { name: "Doar este livro" });
    await createDialog.locator('input[type="file"]').setInputFiles(FIXTURE_JPG);
    await expect(createDialog.getByText("Trocar foto")).toBeVisible();
    await createDialog.getByLabel(/estado \(uf\)/i).selectOption("RJ");
    await createDialog.getByLabel(/cidade/i).fill("Rio de Jan");
    await createDialog.getByRole("option", { name: new RegExp(city) }).click();
    await createDialog.getByLabel(/instagram/i).fill("doador_self_teste");
    await createDialog.getByRole("button", { name: "Publicar doação" }).click();
    await expect(createDialog).toBeHidden();

    // Filtra também por "sua doação" (não só a cidade): em reruns locais contra
    // um Postgres reaproveitado (fora do CI, que sempre nasce vazio), pode
    // haver doações antigas na mesma cidade fixture de outras contas — só a
    // do doador atual mostra esse texto, o que mantém o locator único.
    const card = donor.locator("li", { hasText: city }).filter({ hasText: /sua doação/i });
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: "Quero este" })).toHaveCount(0);

    await ctx.close();
  });
});
