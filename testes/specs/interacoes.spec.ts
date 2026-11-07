// O que o visitante faz nas páginas: menu, gaveta, formulários,
// seletor de porte, alternância do portfólio e o orçamento.
import { test, expect, type Page } from "@playwright/test";
import { sitesCompletos } from "./apoio";

function soNo(projeto: "computador" | "celular") {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== projeto, `só no ${projeto}`);
  });
}

/** Texto da janela que simula o WhatsApp nas vitrines (demo.js). */
async function mensagemDoWhats(page: Page) {
  const janela = page.locator("dialog.demo-janela");
  await expect(janela).toBeVisible();
  return (await page.locator("#demo-mensagem").textContent()) ?? "";
}

test.describe("Site completo · gaveta no celular", () => {
  soNo("celular");
  for (const site of sitesCompletos()) {
    test(site, async ({ page }) => {
      await page.goto(`/modelos/${site}/index.html`);
      const botao = page.locator(".menu-botao");
      const gaveta = page.locator("#gaveta");

      await expect(page.locator(".nav nav")).toBeHidden();
      await expect(botao).toBeVisible();
      await expect(gaveta).toBeHidden();

      await botao.click();
      await expect(gaveta).toBeVisible();
      await expect(botao).toHaveAttribute("aria-expanded", "true");

      await page.keyboard.press("Escape");
      await expect(gaveta).toBeHidden();
      await expect(botao).toHaveAttribute("aria-expanded", "false");
      await expect(botao).toBeFocused();

      await botao.click();
      const link = gaveta.locator("a.gaveta-link").nth(1);
      const destino = await link.getAttribute("href");
      await link.click();
      await expect(page).toHaveURL(new RegExp(`/modelos/${site}/${destino}$`));
    });
  }
});

test.describe("Site completo · menu no computador", () => {
  soNo("computador");
  for (const site of sitesCompletos()) {
    test(`${site}: cada página marca a si mesma no menu`, async ({ page }) => {
      await page.goto(`/modelos/${site}/index.html`);
      await expect(page.locator(".menu-botao")).toBeHidden();
      const paginas = await page.locator(".nav nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
      expect(paginas).toHaveLength(5);
      for (const p of paginas) {
        await page.goto(`/modelos/${site}/${p}`);
        const atual = page.locator('.nav nav a[aria-current="page"]');
        await expect(atual).toHaveCount(1);
        await expect(atual).toHaveAttribute("href", p);
      }
    });
  }
});

test.describe("Site completo · formulário monta a mensagem do WhatsApp", () => {
  soNo("computador");
  for (const site of sitesCompletos()) {
    test(site, async ({ page }) => {
      await page.goto(`/modelos/${site}/contato.html`);
      const form = page.locator("form.form-whats");

      // Vazio, o navegador barra o envio
      await form.locator('button[type="submit"]').click();
      await expect(page.locator("dialog.demo-janela")).toBeHidden();

      for (const campo of await form.locator("[required]").all()) await campo.fill("Teste");
      await form.locator('button[type="submit"]').click();

      const msg = await mensagemDoWhats(page);
      const intro = (await form.getAttribute("data-intro"))!;
      expect(msg.startsWith(intro)).toBe(true);
      for (const rotulo of await form.locator("[data-rotulo]").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.rotulo!))) {
        expect(msg).toContain(`${rotulo}: `);
      }
    });
  }
});

test.describe("Pet shop · preço muda com o porte", () => {
  soNo("computador");
  for (const pagina of ["modelos/petshop/index.html", "modelos/petshop-completo/banho-e-tosa.html"]) {
    test(pagina, async ({ page }) => {
      await page.goto("/" + pagina);
      const banho = page.locator("#lista-servicos li .preco").first();
      await expect(banho).toHaveText("R$ 45");
      await page.locator('.porte[data-porte="g"]').click();
      await expect(page.locator('.porte[data-porte="g"]')).toHaveAttribute("aria-pressed", "true");
      await expect(banho).toHaveText("R$ 80");
      await expect(page.locator("#preco-clube")).toHaveText("R$ 272");
    });
  }
});

test.describe("Vitrines · botões de WhatsApp", () => {
  soNo("computador");
  for (const modelo of ["barbearia", "consultoria", "petshop"]) {
    test(`${modelo}: botão mostra a mensagem e a faixa leva ao orçamento`, async ({ page }) => {
      await page.goto(`/modelos/${modelo}/index.html`);
      const botao = page.locator("main [data-whats]").first();
      const esperado = (await botao.getAttribute("data-whats"))!;
      await botao.click();
      expect(await mensagemDoWhats(page)).toBe(esperado);
      await page.locator("dialog.demo-janela [data-fechar]").click();

      await expect(page.locator(".demo-faixa a").first()).toHaveAttribute("href", `../../orcamento.html?modelo=${modelo}`);
      await page.goto(`/modelos/${modelo}-completo/index.html`);
      await expect(page.locator(".demo-faixa a").first()).toHaveAttribute("href", `../../orcamento.html?modelo=${modelo}&plano=site`);
    });
  }
});

test.describe("Portfólio · landing page ou site completo", () => {
  soNo("computador");
  for (const modelo of ["barbearia", "consultoria", "petshop"]) {
    test(modelo, async ({ page, context }) => {
      await page.goto("/index.html#portfolio");
      const card = page.locator(`.projeto-${modelo}`);
      const link = card.locator(".projeto-link");

      await expect(link).toHaveAttribute("href", `modelos/${modelo}/index.html`);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(card.locator(".capa-lp")).toBeVisible();

      await card.locator('.versoes button[data-versao="site"]').click();
      await expect(card.locator('.versoes button[data-versao="site"]')).toHaveAttribute("aria-pressed", "true");
      await expect(link).toHaveAttribute("href", `modelos/${modelo}-completo/index.html`);
      await expect(link).toHaveText("Ver como site completo →");
      await expect(card.locator(".capa-site")).toBeVisible();
      await expect(card.locator(".capa-lp")).toBeHidden();
      await expect(card.locator(".texto-site")).toBeVisible();

      const [novaGuia] = await Promise.all([context.waitForEvent("page"), link.click()]);
      await novaGuia.waitForLoadState();
      expect(novaGuia.url()).toContain(`/modelos/${modelo}-completo/index.html`);
      expect(page.url()).toContain("/index.html");
    });
  }
});

test.describe("Orçamento", () => {
  soNo("computador");

  test("chega com o modelo e o formato já escolhidos", async ({ page }) => {
    await page.goto("/orcamento.html?modelo=petshop&plano=site");
    await expect(page.locator("#campo-modelo")).toHaveValue("Pet shop e serviços com agenda");
    await expect(page.locator("#campo-formato")).toHaveValue("Site completo (5 páginas, R$ 850)");
  });

  test("os botões dos planos marcam o formato certo", async ({ page }) => {
    await page.goto("/index.html");
    const links = await page.locator('a[href^="orcamento.html?plano="]').evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const href of links) {
      await page.goto("/" + href);
      await expect(page.locator("#campo-formato")).not.toHaveValue("Ainda não sei");
    }
  });

  test("monta a mensagem e abre o WhatsApp do Arthur", async ({ page }) => {
    // Em vez de abrir o WhatsApp de verdade, guarda o endereço que seria aberto
    await page.addInitScript(() => {
      (window as unknown as { abertos: string[] }).abertos = [];
      window.open = (url?: string | URL) => {
        (window as unknown as { abertos: string[] }).abertos.push(String(url));
        return null;
      };
    });
    await page.goto("/orcamento.html?plano=site");

    await page.locator("#brief button[type=submit]").click();
    expect(await page.evaluate(() => (window as unknown as { abertos: string[] }).abertos)).toEqual([]);

    await page.locator('input[name="nome"]').fill("Ana");
    await page.locator('input[name="nicho"]').fill("Pet shop");
    await page.locator('textarea[name="obs"]').fill("Quero agendamento pelo WhatsApp");
    await page.locator("#brief button[type=submit]").click();

    const abertos = await page.evaluate(() => (window as unknown as { abertos: string[] }).abertos);
    expect(abertos).toHaveLength(1);
    const url = new URL(abertos[0]);
    expect(url.origin + url.pathname).toBe("https://wa.me/5511941060165");
    const texto = url.searchParams.get("text") ?? "";
    expect(texto).toContain("Nome: Ana");
    expect(texto).toContain("Formato: Site completo (5 páginas, R$ 850)");
  });
});
