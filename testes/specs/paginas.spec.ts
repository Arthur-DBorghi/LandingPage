// Todas as páginas, nos três tamanhos de tela: carregam sem erro,
// não têm rolagem lateral e todo elemento animado termina visível.
import { test, expect } from "@playwright/test";
import { todasAsPaginas, vigiarErros, rolarAteOFim, esperarAnimacoes } from "./apoio";

for (const pagina of todasAsPaginas()) {
  test(`${pagina} · carrega limpa e sem rolagem lateral`, async ({ page }) => {
    const erros = vigiarErros(page);
    await page.goto("/" + pagina);
    await rolarAteOFim(page);
    await esperarAnimacoes(page);

    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(sobra, "pixels de rolagem lateral").toBeLessThanOrEqual(0);
    expect(erros, "erros no console ou arquivos que não carregaram").toEqual([]);
  });
}
