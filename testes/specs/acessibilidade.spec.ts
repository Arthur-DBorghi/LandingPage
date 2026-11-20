// Acessibilidade com o axe-core, nas regras WCAG 2.1 níveis A e AA.
// Roda com "reduzir movimento" ligado, para não pegar textos no meio da animação.
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { todasAsPaginas } from "./apoio";

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "tablet", "computador e celular bastam");
});

for (const pagina of todasAsPaginas()) {
  test(`${pagina} · WCAG 2.1 AA`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/" + pagina);

    const resultado = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const problemas = resultado.violations.map(
      (v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}${v.nodes.length > 3 ? ` (+${v.nodes.length - 3})` : ""}`,
    );
    expect(problemas).toEqual([]);
  });
}

// Títulos em ordem (h1 → h2 → h3), sem pular nível. É "boa prática" no axe
// (fora das tags WCAG acima), mas o Lighthouse cobra e leitores de tela usam.
test("títulos em ordem em todas as páginas", async ({ page }, info) => {
  test.skip(info.project.name !== "computador", "não depende do tamanho da tela");
  const fora: string[] = [];
  for (const pagina of todasAsPaginas()) {
    await page.goto("/" + pagina);
    const r = await new AxeBuilder({ page }).withRules(["heading-order"]).analyze();
    for (const v of r.violations) fora.push(`${pagina}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  }
  expect(fora).toEqual([]);
});
