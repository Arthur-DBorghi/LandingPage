// Funções de apoio usadas pelos testes.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page } from "@playwright/test";

export const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

/** Todas as páginas do site: as principais e todas as vitrines (landing pages e sites completos). */
export function todasAsPaginas(): string[] {
  const principais = ["index.html", "orcamento.html", "politicas.html", "404.html"];
  const modelos = readdirSync(join(RAIZ, "modelos"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "comum")
    .flatMap((d) =>
      readdirSync(join(RAIZ, "modelos", d.name))
        .filter((f) => f.endsWith(".html"))
        .map((f) => `modelos/${d.name}/${f}`),
    );
  return [...principais, ...modelos.sort()];
}

/** Pastas dos sites completos (5 páginas). */
export function sitesCompletos(): string[] {
  return readdirSync(join(RAIZ, "modelos")).filter((n) => n.endsWith("-completo")).sort();
}

/** Guarda erros de console, erros de script e arquivos que não carregaram. */
export function vigiarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(`erro de script: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") erros.push(`console: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().endsWith("/404.html")) erros.push(`${r.status()} ${r.url()}`);
  });
  return erros;
}

/** Rola a página até o fim, como uma pessoa lendo, para disparar as animações. */
export async function rolarAteOFim(page: Page) {
  const altura = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y <= altura; y += 400) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(30);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
}

/** Espera todos os elementos animados terminarem de aparecer. */
export async function esperarAnimacoes(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>(".revelar, .revelar-img")]
            .filter((el) => Number(getComputedStyle(el).opacity) < 0.99)
            .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`),
        ),
      { message: "elementos animados que continuam invisíveis", timeout: 5000 },
    )
    .toEqual([]);
}
