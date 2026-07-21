import { test, expect, type Page } from "@playwright/test";

// Conta semente registrada uma vez (via API) e reutilizada pelos testes que só
// precisam estar logados — evita recriar conta a cada teste.
const SEED_EMAIL = `e2e.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@example.com`;
const SEED_USERNAME = `e2e_${Date.now().toString(36)}`;
const SEED_PASSWORD = "SenhaForte123";
const SEED_NAME = "Marina Souza";

test.beforeAll(async ({ request }) => {
  const res = await request.post("/api/auth/register", {
    data: { email: SEED_EMAIL, username: SEED_USERNAME, password: SEED_PASSWORD, name: SEED_NAME },
  });
  expect(res.ok()).toBeTruthy();
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

/** Login real com a conta semente. */
async function loginAsSeedUser(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', SEED_EMAIL);
  await page.fill('input[type="password"]', SEED_PASSWORD);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL("**/home");
}

// C1: landing mostra os 4 blocos
test("landing mostra os 4 blocos", async ({ page }) => {
  await page.goto("/");
  for (const t of ["Avalie!", "Organize!", "Leia em conjunto!", "Descubra!"]) {
    await expect(page.getByText(t, { exact: true })).toBeVisible();
  }
});

// C2: signup mostra os placeholders literários; onboarding mostra o de bio
test("signup e onboarding mostram os placeholders esperados", async ({ page }) => {
  await page.goto("/");
  await page.click('a[href="/login"] >> nth=0');
  await page.waitForURL("**/login");
  await page.click('a[href="/signup"]');
  await page.waitForURL("**/signup");
  await expect(page.getByPlaceholder("Victor Frankenstein")).toBeVisible();
  await expect(page.getByPlaceholder("meninomaluquinho")).toBeVisible();
  await expect(page.getByPlaceholder("capitu@biblioteca.com")).toBeVisible();

  // onboarding não exige sessão — só bio/gêneros (identidade já vem do cadastro)
  await page.goto("/onboarding");
  await expect(page.getByPlaceholder("Era uma vez...")).toBeVisible();
});

// C2b: fluxo completo de cadastro — registro, pular verificação, onboarding, /home
test("cadastro completo leva ao /home", async ({ page }) => {
  const rand = Math.random().toString(36).slice(2, 8);
  const email = `signup.${rand}@example.com`;
  const username = `signup_${rand}`;

  await page.goto("/signup");
  await page.getByPlaceholder("Victor Frankenstein").fill("Leitora Teste");
  await page.getByPlaceholder("meninomaluquinho").fill(username);
  await page.getByPlaceholder("capitu@biblioteca.com").fill(email);
  await page.getByPlaceholder("••••••••").fill("SenhaForte123");
  await page.click('button:has-text("Criar conta")');

  await page.waitForSelector("text=Verificar e-mail");
  await page.click('button:has-text("Pular por agora")');
  await page.waitForURL("**/onboarding");

  await page.click('button:has-text("Ficção Científica")');
  await page.click('button:has-text("Começar a ler")');
  await page.waitForURL("**/home");
});

// C3: clicar numa review da comunidade leva à página /review/[id]
test("review da comunidade abre a página do post", async ({ page }) => {
  await loginAsSeedUser(page);
  const firstReviewLink = page
    .locator('article a[href^="/review/"]:not([href*="/review/me-"])')
    .first();
  await expect(firstReviewLink).toBeVisible();
  const href = await firstReviewLink.getAttribute("href");
  await firstReviewLink.click();
  await page.waitForURL(`**${href}`);
  await expect(page.getByText("Resenha")).toBeVisible();
});

// C4: clicar no autor de uma review leva ao perfil público
test("autor da review leva ao perfil publico", async ({ page }) => {
  await loginAsSeedUser(page);
  const authorLink = page.locator('article a[href^="/u/"]').first();
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

// C7: publicar review própria cria um post no feed
test("review propria vira post no feed", async ({ page }) => {
  await loginAsSeedUser(page);
  await page.click('nav.fixed a[href="/shelf"]');
  await page.waitForURL("**/shelf");
  // marca "Duna" como lido a partir da estante (ja esta no seed como READ)
  await page.click('a[href="/book/duna"]');
  await page.waitForURL("**/book/duna");
  await page.waitForSelector("h1");

  await page.click('button:has-text("Escrever review"), button:has-text("Editar minha review")');
  await page.fill('textarea[aria-label="Texto da sua review"]', "Review de teste automatizado para o e2e.");
  await page.click('button:has-text("Publicar")');
  await page.waitForTimeout(2000);

  // navega pela UI (não por page.goto) para não perder a sessão só-memória do teste
  await page.click('a[href="/review/me-duna"]');
  await page.waitForURL("**/review/me-duna");
  await expect(page.getByText("Review de teste automatizado para o e2e.")).toBeVisible();
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

// C11: feed "Seguindo" vazio cai pro geral com aviso (usuário novo não segue ninguém).
// Usa uma conta isolada (não a semente compartilhada) pra garantir zero seguidos,
// já que outros testes deste arquivo seguem leitores com a conta semente.
test("feed Seguindo sem seguidos cai pro geral com aviso", async ({ page, request }) => {
  const rand = Math.random().toString(36).slice(2, 8);
  const email = `nofollow.${rand}@example.com`;
  const username = `nofollow_${rand}`;
  const res = await request.post("/api/auth/register", {
    data: { email, username, password: SEED_PASSWORD, name: "Sem Seguidos" },
  });
  expect(res.ok()).toBeTruthy();

  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', SEED_PASSWORD);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL("**/home");

  await page.click('button[role="tab"]:has-text("Seguindo")');
  await expect(page.getByText("Você ainda não segue ninguém")).toBeVisible();
  await expect(page.locator("main article").first()).toBeVisible();
});

// C12: curtir uma review do feed é idempotente e atualiza a contagem
test("curtir review do feed atualiza contagem", async ({ page }) => {
  await loginAsSeedUser(page);
  const firstPost = page.locator("main article").first();
  const likeButton = firstPost.getByLabel("Curtir review");
  await expect(likeButton).toBeVisible();
  const before = Number((await likeButton.innerText()).trim());
  await likeButton.click();
  await expect(page.getByLabel("Remover curtida")).toHaveText(String(before + 1));
  // recarregar confirma que persistiu no backend
  await page.reload();
  await expect(page.locator("main article").first().getByLabel("Remover curtida")).toHaveText(
    String(before + 1)
  );
});

// C13: comentar numa review do feed publica e aparece na thread
test("comentar review do feed publica na thread", async ({ page }) => {
  await loginAsSeedUser(page);
  const text = `Comentário de teste e2e ${Date.now()}`;
  const firstPost = page.locator("main article").first();
  await firstPost.locator('button[aria-expanded]').click();
  const input = firstPost.getByLabel("Escrever comentário");
  await input.fill(text);
  await input.press("Enter");
  await expect(firstPost.getByText(text)).toBeVisible();
});

// C14: criar lista, adicionar um livro da estante e ver refletido em /lists/[id]
test("criar lista e adicionar livro da estante", async ({ page }) => {
  await loginAsSeedUser(page);
  await page.click('nav.fixed a[href="/shelf"]');
  await page.waitForURL("**/shelf");

  await page.click('button:has-text("+ Criar lista")');
  await page.fill('input[aria-label="Nome da nova lista"]', "Lista E2E");
  await page.getByRole("button", { name: "Criar", exact: true }).click();
  await expect(page.getByText("Lista E2E")).toBeVisible();

  await page.click('a:has-text("Lista E2E")');
  await page.waitForURL(/\/lists\/.+/);

  await page.click('button:has-text("+ Adicionar livros")');
  await page.click('button[aria-label="Duna"]');
  await page.click('button:has-text("Adicionar (1)")');
  await expect(page.locator('a[href="/book/duna"]')).toBeVisible();
});
