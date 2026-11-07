// Links internos, âncoras (#secao) e redirecionamentos do arquivo _redirects.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { RAIZ, todasAsPaginas } from "./apoio";

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "computador", "não depende do tamanho da tela");
});

test("todo link interno abre e toda âncora existe", async ({ page, request, baseURL }) => {
  const destinos = new Map<string, string>(); // endereço → página onde o link apareceu
  for (const pagina of todasAsPaginas()) {
    await page.goto("/" + pagina);
    const enderecos = await page.$$eval("a[href], [data-lp], [data-site]", (els) =>
      els.flatMap((el) => {
        const a = el as HTMLAnchorElement;
        const extras = [a.dataset.lp, a.dataset.site].filter(Boolean).map((h) => new URL(h!, location.href).href);
        return a.href ? [a.href, ...extras] : extras;
      }),
    );
    for (const e of enderecos) if (e.startsWith(baseURL!) && !destinos.has(e)) destinos.set(e, pagina);
  }

  const problemas: string[] = [];
  for (const [endereco, origem] of destinos) {
    const [semAncora, ancora] = endereco.split("#");
    const resposta = await request.get(semAncora);
    if (!resposta.ok()) {
      problemas.push(`${origem} → ${endereco}: ${resposta.status()}`);
      continue;
    }
    if (ancora) {
      await page.goto(semAncora);
      if ((await page.locator(`[id="${ancora}"]`).count()) === 0) problemas.push(`${origem} → ${endereco}: âncora não existe`);
    }
  }
  expect(destinos.size, "quantidade de links conferidos").toBeGreaterThan(50);
  expect(problemas).toEqual([]);
});

test("redirecionamentos de endereços antigos levam a páginas que existem", async ({ request }) => {
  const regras = readFileSync(join(RAIZ, "_redirects"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(/\s+/));
  expect(regras.length).toBeGreaterThan(0);

  for (const [de, para, codigo] of regras) {
    const resposta = await request.get(de, { maxRedirects: 0 });
    expect(resposta.status(), de).toBe(Number(codigo));
    expect(resposta.headers()["location"], de).toBe(para);
    const destino = await request.get(para.split("#")[0]);
    expect(destino.ok(), `${de} → ${para}`).toBe(true);
  }
});

test("endereço que não existe mostra a página 404", async ({ page }) => {
  const resposta = await page.goto("/uma-pagina-que-nao-existe");
  expect(resposta?.status()).toBe(404);
  await expect(page.locator("h1")).toBeVisible();
});
