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

test("domínio próprio: canonical, prévia de link, robots.txt e sitemap.xml", async ({ page, request }) => {
  const DOMINIO = "https://arthurborghi.com.br";
  for (const [pagina, endereco] of [["index.html", `${DOMINIO}/`], ["orcamento.html", `${DOMINIO}/orcamento.html`], ["politicas.html", `${DOMINIO}/politicas.html`]]) {
    await page.goto("/" + pagina);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", endereco);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", endereco);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `${DOMINIO}/assets/img/og.png`);
  }
  const dados = JSON.parse((await page.goto("/").then(() => page.locator('script[type="application/ld+json"]').textContent())) ?? "{}");
  expect(dados["@type"]).toBe("ProfessionalService");
  expect(dados.url).toBe(`${DOMINIO}/`);

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`Sitemap: ${DOMINIO}/sitemap.xml`);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  // Só as páginas do Arthur: vitrines (noindex), painel e 404 ficam de fora
  expect([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])).toEqual([`${DOMINIO}/`, `${DOMINIO}/orcamento.html`, `${DOMINIO}/politicas.html`]);
});
