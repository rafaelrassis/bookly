import "dotenv/config";
import { test, expect } from "@playwright/test";
import { createAccount, seedAccount, signInAs, withDb } from "./helpers/auth";

const TOTAL = 65; // > LIMIT (60) na Estante — força uma segunda página

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

/** Semeia TOTAL livros + ShelfEntry (WANT_TO_READ) pra uma conta, direto no
 * banco — a estante paginada precisa de mais livros do que o catálogo
 * fixture (5) tem, e criar isso pela UI real seria lento/frágil (busca
 * externa por livro). Títulos com zero à esquerda ("Livro 00".."Livro 64")
 * ordenam igual por texto e por número, o que simplifica as asserções de
 * ordem sem depender do sort default ("title") ter algum comportamento
 * especial. */
async function seedPaginatedShelf(userId: string) {
  await withDb(async (client) => {
    for (let i = 0; i < TOTAL; i++) {
      const n = String(i).padStart(2, "0");
      const bookId = `${userId}-book-${n}`;
      await client.query(
        `INSERT INTO "Book" (id, title, authors, year, pages, genre, "gradientFrom", "gradientTo", synopsis, "updatedAt")
         VALUES ($1, $2, 'Autora E2E', 2020, 200, 'Ficção', '#111111', '#222222', 'Fixture e2e — não é dado real de produto.', now())
         ON CONFLICT (id) DO NOTHING`,
        [bookId, `Estante Paginada Livro ${n}`]
      );
      await client.query(
        `INSERT INTO "ShelfEntry" (id, "userId", "bookId", status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'WANT_TO_READ', now(), now())
         ON CONFLICT (id) DO NOTHING`,
        [`${bookId}-entry`, userId, bookId]
      );
    }
  });
}

test("estante pagina no servidor (60 + carregar mais), facetas batem, e o filtro sobrevive ao voltar do livro", async ({
  page,
}) => {
  const account = seedAccount("shelf_pg");
  await createAccount(account);
  await seedPaginatedShelf(account.id);
  await signInAs(page, account);

  await page.goto("/shelf");
  await page.waitForLoadState("networkidle");

  // Primeira página: 60 dos 65, faceta "Quero ler" já soma os 65 (não só a
  // página carregada) — vem pronta no mesmo request, sem 2ª chamada.
  await expect(page.getByText("60 de 65", { exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Status" }).getByText("Quero ler · 65")).toBeVisible();
  await expect(page.getByText("Estante Paginada Livro 00").first()).toBeVisible();
  await expect(page.getByText("Estante Paginada Livro 64")).toHaveCount(0);

  // Carregar mais: cursor, não offset — pega exatamente os 5 restantes e o
  // botão some (não há mais nada pra carregar).
  await page.getByRole("button", { name: /carregar mais 5/i }).click();
  await expect(page.getByText("65 de 65", { exact: true })).toBeVisible();
  await expect(page.getByText("Estante Paginada Livro 64").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /carregar mais/i })).toHaveCount(0);

  // Busca filtra na URL (?q=), com debounce — não é client-side puro.
  const search = page.getByLabel("Buscar na estante por título ou autor");
  await search.fill("Livro 07");
  await expect(page).toHaveURL(/[?&]q=Livro/);
  await expect(page.getByText("Estante Paginada Livro 07").first()).toBeVisible();
  await expect(page.getByText("Estante Paginada Livro 00")).toHaveCount(0);

  // O ponto central da proposta: o filtro não pode se perder ao voltar do
  // detalhe do livro (hoje, antes desta mudança, se perdia).
  await page.getByText("Estante Paginada Livro 07").first().click();
  await page.waitForURL(/\/book\//);
  await page.goBack();
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/[?&]q=Livro/);
  await expect(page.getByText("Estante Paginada Livro 07").first()).toBeVisible();
  await expect(page.getByText("Estante Paginada Livro 00")).toHaveCount(0);

  // Limpar a busca e filtrar por status: chip "Lendo" não tem nenhum item
  // desta conta (tudo foi semeado como Quero ler) — cai no empty state de
  // filtro, não no de estante vazia.
  await search.fill("");
  await expect(page).not.toHaveURL(/[?&]q=/);
  await page.getByRole("group", { name: "Status" }).getByText("Lendo", { exact: false }).click();
  await expect(page).toHaveURL(/[?&]status=READING/);
  await expect(page.getByText("Nada por aqui")).toBeVisible();
});
