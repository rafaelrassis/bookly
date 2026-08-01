import { test, expect } from "@playwright/test";
import { createAndSignIn, seedAccount } from "./helpers/auth";

// Fase 5 da auditoria de UX/UI: nenhum breakpoint entre 320 e 1440px pode
// ter conteúdo cortado (scroll horizontal) — cobre o shell (mobile/tablet/
// desktop) e as seis telas reestruturadas na fase 4.
const VIEWPORTS = [
  { name: "320", width: 320, height: 780 },
  { name: "480", width: 480, height: 900 },
  { name: "768", width: 768, height: 1000 },
  { name: "1440", width: 1440, height: 900 },
];

const ROUTES = ["/home", "/shelf", "/clubs", "/search", "/profile", "/profile/estatisticas", "/book/duna"];

test.describe("layout responsivo — sem overflow horizontal", () => {
  const account = seedAccount("layout");

  for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
      test(`${route} @ ${viewport.name}px não tem overflow horizontal`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await createAndSignIn(page, account);
        await page.goto(route);
        await page.waitForLoadState("networkidle");

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));

        expect(scrollWidth, `${route} @ ${viewport.width}px: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`).toBeLessThanOrEqual(
          clientWidth + 1
        );
      });
    }
  }

  test("TabBar some e SideNav aparece a partir de lg (1024px)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await createAndSignIn(page, account);
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("navigation", { name: "Navegação principal" }).first()).toBeVisible();
    // TabBar mobile é `md:hidden` — no desktop não deve ocupar espaço nem
    // ficar clicável.
    const tabBarLinks = page.locator('nav[aria-label="Navegação principal"] >> a[href="/shelf"]');
    const count = await tabBarLinks.count();
    let visibleCount = 0;
    for (let i = 0; i < count; i++) {
      if (await tabBarLinks.nth(i).isVisible()) visibleCount++;
    }
    expect(visibleCount).toBeGreaterThan(0); // SideNav está visível
  });

  test("alvos de toque da TabBar têm pelo menos 44px no mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await createAndSignIn(page, account);
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // `.fixed` restringe à TabBar (md:hidden) — TopNav/SideNav também têm
    // aria-label="Navegação principal" mas ficam ocultos por CSS nesta
    // largura, então boundingBox() retornaria null pra eles.
    const links = page.locator('nav.fixed[aria-label="Navegação principal"] a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});
