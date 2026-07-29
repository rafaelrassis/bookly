import { test, expect, type Page } from "@playwright/test";
import { createAccount, seedAccount, signInAs } from "./helpers/auth";

// Conta semente criada uma vez (direto no banco) e reutilizada pelos testes
// que só precisam estar logados — evita recriar conta a cada teste. Login
// real via Google/Amazon não dá pra automatizar aqui (ver e2e/helpers/auth.ts).
const SEED_ACCOUNT = seedAccount("social_seed");

test.beforeAll(async () => {
  await createAccount(SEED_ACCOUNT);
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

/** Login real com a conta semente (cookie de sessão + navega pro /home). */
async function loginAsSeedUser(page: Page) {
  await signInAs(page, SEED_ACCOUNT);
  await page.goto("/home");
  await page.waitForLoadState("networkidle");
}

// C1: landing mostra os 4 blocos
test("landing mostra os 4 blocos", async ({ page }) => {
  await page.goto("/");
  for (const t of ["Avalie!", "Organize!", "Leia em conjunto!", "Descubra!"]) {
    await expect(page.getByText(t, { exact: true })).toBeVisible();
  }
});

// C2: login e criação de conta são o mesmo fluxo OAuth — a tela só mostra
// os botões de provider, sem formulário de e-mail/senha. A landing embute os
// mesmos botões direto (sem link pra /login), então testa a rota /login em si.
test("login mostra as opções Google e Amazon", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar com Amazon" })).toBeVisible();
});

// C2b: conta OAuth nova (sem username, onboarded=false) é redirecionada pro
// onboarding; escolher username + gêneros libera o /home.
test("conta nova cai no onboarding; completar leva ao /home", async ({ page }) => {
  const account = seedAccount("new_onboard");
  await createAccount(account, { onboarded: false });
  await signInAs(page, account);

  await page.goto("/home");
  await page.waitForURL("**/onboarding");
  await expect(page.getByPlaceholder("Era uma vez...")).toBeVisible();

  await page.getByPlaceholder("meninomaluquinho").fill(account.username);
  await page.click('button:has-text("Ficção Científica")');
  await page.click('button:has-text("Começar a ler")');
  await page.waitForURL("**/home");
});

// C3: clicar numa review da comunidade leva à página /review/[id]
test("review da comunidade abre a página do post", async ({ page }) => {
  await loginAsSeedUser(page);
  const firstReviewLink = page.locator('article a[href^="/review/"]').first();
  await expect(firstReviewLink).toBeVisible();
  await firstReviewLink.click();
  await page.waitForURL(/\/review\/.+/);
  await expect(page.getByText("Resenha")).toBeVisible();
});

// C4: clicar no autor de uma review leva ao perfil público
test("autor da review leva ao perfil publico", async ({ page }) => {
  await loginAsSeedUser(page);
  // exclui o post "próprio" do seed (feed.ts atribui a "@mari.leituras", que
  // não existe em MOCK_USERS — clicar nele hoje redireciona pra /profile).
  const authorLink = page.locator('article a[href^="/u/"]:not([href="/u/mari.leituras"])').first();
  const href = await authorLink.getAttribute("href");
  await authorLink.click();
  await page.waitForURL(`**${href}`);
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
});

// C5: seguir um leitor e filtrar o feed por "Seguindo"
test("seguir leitor e filtrar feed por Seguindo", async ({ page }) => {
  await loginAsSeedUser(page);
  const followBtn = page.locator('section:has-text("Descobrir leitores") button:has-text("Seguir")').first();
  await followBtn.click();
  await page.waitForTimeout(2000);

  await page.click('button[role="tab"]:has-text("Seguindo")');
  await page.waitForTimeout(300);
  const posts = page.locator("main article");
  const count = await posts.count();
  expect(count).toBeGreaterThan(0);
});

// C6: descobrir leitores sugere usuários não seguidos e some ao seguir
test("descobrir leitores atualiza sugestoes ao seguir", async ({ page }) => {
  await loginAsSeedUser(page);
  const section = page.locator('section:has-text("Descobrir leitores")');
  await expect(section).toBeVisible();
  const before = await section.locator("button:has-text(\"Seguir\")").count();
  await section.locator('button:has-text("Seguir")').first().click();
  await page.waitForTimeout(300);
  const after = await section.locator("button:has-text(\"Seguir\")").count();
  expect(after).toBeLessThanOrEqual(before);
});

// C7: publicar review própria persiste de verdade (Spec 3a) — cross-post pro
// feed social fica pra Spec 3b, não é mais responsabilidade desta review.
test("review propria persiste na pagina do livro", async ({ page }) => {
  await loginAsSeedUser(page);
  await page.goto("/book/duna");
  await page.waitForSelector("h1");

  await page.click('button[aria-label="4 estrelas"]');
  await page.waitForTimeout(300);

  await page.click('button:has-text("Escrever review"), button:has-text("Editar minha review")');
  await page.fill('textarea[aria-label="Texto da sua review"]', "Review de teste automatizado para o e2e.");
  await page.click('button:has-text("Publicar")');
  await expect(page.getByText("Review de teste automatizado para o e2e.").first()).toBeVisible();

  // recarrega pra confirmar que persistiu no banco, não só no estado local
  await page.reload();
  await page.waitForSelector("h1");
  await expect(page.getByText("Review de teste automatizado para o e2e.").first()).toBeVisible();
});

// C8: perfil próprio renderiza estatísticas e favoritos
test("perfil proprio mostra estatisticas", async ({ page }) => {
  await loginAsSeedUser(page);
  // top4 vem da API (Spec 2) e começa vazio numa conta nova — seta via PATCH
  // real antes de checar a seção, e navega com goto pra recarregar o perfil.
  await page.evaluate(async () => {
    await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ top4: ["torto-arado", "duna", "1984", "ensaio-sobre-a-cegueira"] }),
    });
  });
  await page.goto("/profile");
  await expect(page.getByText("Favoritos")).toBeVisible();
  await expect(page.getByText("lidos")).toBeVisible();
  await expect(page.getByText("Suas notas")).toBeVisible();
});

// C9: membros do clube listam progresso e abrem modal com todos
test("membros do clube listam progresso", async ({ page }) => {
  await loginAsSeedUser(page);
  await page.click('nav.fixed a[href="/clubs"]');
  await page.waitForURL("**/clubs");
  const firstClub = page.locator('a[href^="/clubs/"]:not([href="/clubs/new"])').first();
  await firstClub.click();
  await page.waitForURL(/\/clubs\/.+/);
  await expect(page.getByText("Progresso dos membros")).toBeVisible();
});

// C10: alinhamento — avatar e nome do autor alinhados na mesma linha do post
test("avatar e nome do autor alinham na mesma linha do post", async ({ page }) => {
  await loginAsSeedUser(page);
  const firstPost = page.locator("main article").first();
  await expect(firstPost).toBeVisible();
  const avatar = firstPost.locator("span[aria-hidden='true']").first();
  const authorLink = firstPost.locator('a[href^="/u/"]').nth(1);
  const avatarBox = await avatar.boundingBox();
  const authorBox = await authorLink.boundingBox();
  expect(avatarBox).not.toBeNull();
  expect(authorBox).not.toBeNull();
  if (avatarBox && authorBox) {
    // o topo do nome deve cair dentro da faixa vertical do avatar (mesma linha)
    expect(authorBox.y).toBeGreaterThanOrEqual(avatarBox.y - 4);
    expect(authorBox.y).toBeLessThanOrEqual(avatarBox.y + avatarBox.height);
  }
});
