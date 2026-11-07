// Itens do "Pronta pro Google" que dá para conferir no código.
// Não muda com o tamanho da tela, então roda só no computador.
import { test, expect } from "@playwright/test";
import { todasAsPaginas } from "./apoio";

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "computador", "não depende do tamanho da tela");
});

for (const pagina of todasAsPaginas()) {
  test(`${pagina} · idioma, título, descrição e um único h1`, async ({ page }) => {
    await page.goto("/" + pagina);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    expect((await page.title()).trim().length, "título").toBeGreaterThan(10);

    if (pagina !== "404.html") {
      const descricao = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
      expect(descricao.length, "tamanho da descrição (o Google corta perto de 160)").toBeGreaterThanOrEqual(50);
      expect(descricao.length, "tamanho da descrição (o Google corta perto de 160)").toBeLessThanOrEqual(170);
    }
    await expect(page.locator("h1"), "páginas devem ter um único h1").toHaveCount(1);

    // Vitrines são fictícias: não podem aparecer no Google. As páginas do Arthur, sim.
    const robots = page.locator('meta[name="robots"]');
    if (pagina.startsWith("modelos/")) await expect(robots).toHaveAttribute("content", /noindex/);
    else if (pagina !== "404.html") await expect(robots).toHaveCount(0);
  });
}

test("cada página tem um título só dela", async ({ page }) => {
  const vistos = new Map<string, string>();
  const repetidos: string[] = [];
  for (const pagina of todasAsPaginas()) {
    await page.goto("/" + pagina);
    const titulo = await page.title();
    if (vistos.has(titulo)) repetidos.push(`"${titulo}" em ${vistos.get(titulo)} e ${pagina}`);
    vistos.set(titulo, pagina);
  }
  expect(repetidos).toEqual([]);
});
