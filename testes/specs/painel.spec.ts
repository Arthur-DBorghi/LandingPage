// Painel privado (/painel): o formulário gera a prévia e o .zip do site do cliente.
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { vigiarErros } from "./apoio";

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "computador", "o painel é usado no computador");
});

test("valida, gera a prévia, navega entre as páginas e baixa o .zip", async ({ page }) => {
  const erros = vigiarErros(page);
  await page.goto("/painel/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // Vazio: mostra os erros e não gera nada
  await page.locator("#botao-gerar").click();
  await expect(page.locator("#erro-nome")).not.toBeEmpty();
  await expect(page.locator("#erro-whatsapp")).not.toBeEmpty();
  await expect(page.locator("#resultado")).toBeHidden();

  // Celular digitado pela metade
  await page.locator("#nome").fill("Studio Corte");
  await page.locator('select[name="nome-artigo"]').selectOption("o");
  await page.locator("#whatsapp").fill("(11) 98765-432");
  await page.locator("#bairro").fill("Mooca");
  await page.locator("#botao-gerar").click();
  await expect(page.locator("#erro-whatsapp")).toContainText("Faltou um dígito");

  await page.locator("#whatsapp").fill("(11) 98765-4321");
  await page.locator('input[name="versao"][value="completo"]').check();
  await page.locator("#botao-gerar").click();
  await expect(page.locator("#resultado")).toBeVisible();
  await expect(page.locator("#resumo")).toContainText("5 páginas");
  await expect(page.locator("#pendencias li").first()).toBeVisible();

  const previa = page.frameLocator("#previa");
  await expect.poll(() => previa.locator("html").evaluate(() => document.title)).toBe("Studio Corte | Corte e barba na Mooca");
  await expect(previa.locator(".demo-faixa")).toHaveCount(0);

  // Abas com os nomes do menu do site; o computador mostra o menu no topo
  await expect(page.locator("#previa-paginas button")).toHaveText(["Início", "Serviços e preços", "Equipe", "Galeria", "Contato"]);
  await page.locator('button[data-tamanho="computador"]').click();
  await previa.locator('.nav nav a[href="equipe.html"]').click();
  await expect(page.locator('#previa-paginas button[aria-selected="true"]')).toHaveText("Equipe");
  await expect(previa.locator("h1")).toHaveText("Escolha quem vai cuidar de você");

  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#botao-baixar").click()]);
  expect(download.suggestedFilename()).toBe("studio-corte.zip");
  const caminho = await download.path();
  const { readFileSync } = await import("node:fs");
  const zip = readFileSync(caminho!);
  expect(zip.subarray(0, 2).toString()).toBe("PK");
  expect(zip.includes(Buffer.from("studio-corte/assets/js/whats.js"))).toBe(true);

  expect(erros).toEqual([]);
});

test("mostra só os campos do modelo escolhido", async ({ page }) => {
  await page.goto("/painel/");
  await page.locator('input[name="modelo"][value="consultoria"]').check();
  await expect(page.locator('.campo[data-campo="profissional"]')).toBeVisible();
  await expect(page.locator('.campo[data-campo="bairro"]')).toBeHidden();
  await page.locator('input[name="modelo"][value="petshop"]').check();
  await expect(page.locator('.campo[data-campo="profissional"]')).toBeHidden();
  await expect(page.locator('.campo[data-campo="bairro"]')).toBeVisible();
});

test("painel sem problemas de acessibilidade (WCAG 2.1 AA)", async ({ page }) => {
  await page.goto("/painel/");
  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude("#previa").analyze();
  expect(resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
});
