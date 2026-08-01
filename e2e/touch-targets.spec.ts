import { test, expect } from "@playwright/test";
import { createAndSignIn, seedAccount } from "./helpers/auth";

// Trava de acessibilidade: nenhum controle interativo pode ter caixa menor
// que 44x44 no mobile. Mede a caixa REAL (getBoundingClientRect via
// boundingBox), então também pega os `.tap` cuja área estendida foi cortada
// por um ancestral com overflow-hidden — o modo silencioso de o utilitário
// falhar.
const MIN = 44;

// 375px = iPhone SE/13 mini, o menor aparelho corrente. 320px fica de fora
// aqui porque é coberto pelo layout.spec (overflow) e alguns controles
// legitimamente encolhem nessa largura.
const VIEWPORT = { width: 375, height: 812 };

const ROUTES = [
  "/home",
  "/shelf",
  "/clubs",
  "/search",
  "/profile",
  "/profile/atividade",
  "/profile/doacoes",
  "/profile/estatisticas",
  "/notifications",
  "/settings",
  "/book/duna",
];

// Links inline dentro de um parágrafo de texto corrido são exceção na WCAG
// 2.5.8 (Target Size Minimum) — não se espera 44px de um link no meio de uma
// frase. Tudo que é controle de UI (botão, aba, item de lista, card) conta.
const INLINE_EXCEPTION = `(el) => {
  const p = el.closest("p, li");
  if (!p) return false;
  const text = (p.textContent ?? "").trim();
  return text.length > (el.textContent ?? "").trim().length + 12;
}`;

test.describe("alvos de toque >= 44px no mobile", () => {
  const account = seedAccount("tap");

  for (const route of ROUTES) {
    test(`${route}: nenhum controle abaixo de ${MIN}px`, async ({ page }) => {
      await page.setViewportSize(VIEWPORT);
      await createAndSignIn(page, account);
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const offenders = await page.evaluate(
        ({ min, inlineExceptionSrc }) => {
          const isInlineException = eval(inlineExceptionSrc) as (el: Element) => boolean;
          const selector = 'button, a[href], [role="button"], [role="tab"], input:not([type="hidden"]), select, textarea';
          const found: { tag: string; label: string; w: number; h: number; cls: string }[] = [];

          for (const el of Array.from(document.querySelectorAll(selector))) {
            const style = getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") continue;
            if ((el as HTMLElement).offsetParent === null && style.position !== "fixed") continue;
            if ((el as HTMLButtonElement).disabled) continue;
            if (isInlineException(el)) continue;

            // Considera a área estendida pelo utilitário `.tap` (::after), que
            // não entra no rect do próprio elemento.
            const rect = el.getBoundingClientRect();
            let { width, height } = rect;
            if (el.classList.contains("tap")) {
              const after = getComputedStyle(el, "::after");
              if (after.content !== "none") {
                width = Math.max(width, parseFloat(after.minWidth) || 0);
                height = Math.max(height, parseFloat(after.minHeight) || 0);
                // ...mas só se nenhum ancestral recortar o transbordo.
                for (let p = el.parentElement; p; p = p.parentElement) {
                  const o = getComputedStyle(p).overflow;
                  if (o === "hidden" || o === "clip" || o === "auto" || o === "scroll") {
                    const pr = p.getBoundingClientRect();
                    width = Math.min(width, pr.width);
                    height = Math.min(height, pr.height);
                    break;
                  }
                }
              }
            }

            if (width + 0.5 < min || height + 0.5 < min) {
              found.push({
                tag: el.tagName.toLowerCase(),
                label:
                  el.getAttribute("aria-label") ??
                  (el.textContent ?? "").trim().slice(0, 40) ??
                  "",
                w: Math.round(width),
                h: Math.round(height),
                cls: (el.getAttribute("class") ?? "").slice(0, 90),
              });
            }
          }
          return found;
        },
        { min: MIN, inlineExceptionSrc: INLINE_EXCEPTION }
      );

      expect(
        offenders,
        `${route}: ${offenders.length} controle(s) abaixo de ${MIN}px\n` +
          offenders.map((o) => `  <${o.tag}> ${o.w}x${o.h} "${o.label}" — ${o.cls}`).join("\n")
      ).toEqual([]);
    });
  }
});
