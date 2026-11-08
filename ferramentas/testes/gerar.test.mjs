// @ts-check
// Integração: converte cada uma das 6 vitrines num site de cliente e confere o resultado.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gerarSite, RAIZ_REPO } from "../novo-cliente/gerar.mjs";
import { MODELOS } from "../novo-cliente/modelos.mjs";
import { atributo, lerHtml, percorrer } from "../novo-cliente/html.mjs";

const NUMERO = "5511987654321";
const pasta = mkdtempSync(path.join(tmpdir(), "novo-cliente-"));
test.after(() => rmSync(pasta, { recursive: true, force: true }));

/** @type {Record<string, Omit<import("../novo-cliente/gerar.mjs").Pedido, "versao" | "saida">>} */
const CLIENTES = {
  barbearia: {
    modelo: "barbearia",
    nome: { artigo: "o", nome: "Studio Corte" },
    whatsapp: NUMERO,
    cidade: "São Paulo",
    bairro: { artigo: "a", nome: "Mooca" },
    endereco: "Rua Tal, 45",
  },
  consultoria: {
    modelo: "consultoria",
    nome: { artigo: "o", nome: "Escritório Lima" },
    profissional: { artigo: "o", nome: "Pedro de Lima" },
    whatsapp: NUMERO,
    email: "pedro@lima.com.br",
  },
  petshop: {
    modelo: "petshop",
    nome: { artigo: "o", nome: "Pet Mania" },
    whatsapp: NUMERO,
    bairro: { artigo: "o", nome: "Tatuapé" },
  },
};

/** Restos da vitrine que não podem aparecer no site de um cliente. */
const PROIBIDOS = [
  "Navalha Fina", "NAVALHA FINA", "Focinho Feliz", "Clara Andrade", "Olá, Clara", "a Clara",
  "noindex", "demo.js", "demo.css", "data-modelo", "data-plano", "negócio fictício",
  "Modelo de demonstração", "../", "favicon.png", "Vila Nova", "no Centro",
];

for (const [modelo, cliente] of Object.entries(CLIENTES)) {
  for (const versao of /** @type {const} */ (["lp", "completo"])) {
    test(`${modelo} (${versao}) vira um site de cliente limpo`, async () => {
      const saida = path.join(pasta, `${modelo}-${versao}`);
      const r = await gerarSite({ ...cliente, versao, saida, hoje: "2026-11-07" });

      assert.equal(r.paginas.length, versao === "lp" ? 1 : 5);
      assert.ok(r.paginas.includes("index.html"));

      for (const pagina of r.paginas) {
        const html = readFileSync(path.join(saida, pagina), "utf8");
        for (const p of PROIBIDOS) assert.ok(!html.includes(p), `${pagina} ainda contém "${p}"`);
        assert.match(html, /<script src="assets\/js\/whats\.js" defer><\/script>/, `${pagina} sem whats.js`);

        percorrer(lerHtml(html), (no) => {
          // Todo arquivo citado existe no site gerado
          for (const nome of ["href", "src"]) {
            const valor = atributo(no, nome);
            if (!valor || /^([a-z]+:|#|\/\/)/i.test(valor)) continue;
            const arquivo = valor.split(/[?#]/)[0];
            assert.ok(existsSync(path.join(saida, arquivo)), `${pagina}: ${valor} não existe`);
          }
          // Todo botão de WhatsApp tem link de verdade com a mesma mensagem
          const mensagem = atributo(no, "data-whats");
          if (no.tagName === "a" && mensagem !== undefined) {
            const href = atributo(no, "href") ?? "";
            assert.ok(href.startsWith(`https://wa.me/${NUMERO}`), `${pagina}: botão sem link do WhatsApp`);
            assert.equal(new URL(href).searchParams.get("text"), mensagem);
            assert.equal(atributo(no, "target"), "_blank");
          }
        });
      }

      // Fontes citadas no CSS existem
      for (const css of readdirSync(path.join(saida, "assets/css"))) {
        const texto = readFileSync(path.join(saida, "assets/css", css), "utf8");
        for (const [, url] of texto.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
          if (/^data:/.test(url)) continue;
          assert.ok(existsSync(path.join(saida, "assets/css", url)), `${css}: ${url} não existe`);
        }
      }

      assert.match(readFileSync(path.join(saida, "assets/js/whats.js"), "utf8"), new RegExp(`"${NUMERO}"`));
      const wrangler = readFileSync(path.join(saida, "wrangler.jsonc"), "utf8");
      assert.match(wrangler, new RegExp(`"name": "${r.slug}"`));
      assert.match(wrangler, /"compatibility_date": "2026-11-07"/);
      assert.ok(existsSync(path.join(saida, ".assetsignore")));
      const leiaMe = readFileSync(path.join(saida, "LEIA-ME.md"), "utf8");
      assert.match(leiaMe, /## Ainda fictício ou de exemplo/);
      assert.match(leiaMe, /\(11\) 98765-4321/);
    });
  }
}

test("os dados do cliente entram no texto, com o artigo certo", () => {
  const html = readFileSync(path.join(pasta, "barbearia-completo/index.html"), "utf8");
  assert.match(html, /<title>Studio Corte \| Corte e barba na Mooca<\/title>/);
  assert.match(html, /Por que o Studio Corte/);
  assert.match(html, /Rua Tal, 45, Mooca/);
  const lp = readFileSync(path.join(pasta, "barbearia-lp/index.html"), "utf8");
  assert.match(lp, /<title>Studio Corte \| Corte e barba na Mooca<\/title>/); // título da LP não é mais "Modelo de demonstração"
  const sobre = readFileSync(path.join(pasta, "consultoria-completo/sobre.html"), "utf8");
  assert.match(sobre, /Oi, eu sou o Pedro/);
  assert.match(sobre, />PL</);
});

test("pendências apontam o que continua fictício", () => {
  const leiaMe = readFileSync(path.join(pasta, "barbearia-completo/LEIA-ME.md"), "utf8");
  assert.match(leiaMe, /nome fictício \(Rafa\)/);
  assert.match(leiaMe, /espaço de foto para preencher/);
  const consultoria = readFileSync(path.join(pasta, "consultoria-completo/LEIA-ME.md"), "utf8");
  assert.match(consultoria, /conferir profissão e gênero \("contadora"\)/);
  const pet = readFileSync(path.join(pasta, "petshop-lp/LEIA-ME.md"), "utf8");
  assert.match(pet, /endereço de exemplo/); // não informou endereço
});

test("a lista de páginas de cada modelo bate com as pastas das vitrines", () => {
  for (const [modelo, m] of Object.entries(MODELOS)) {
    for (const versao of /** @type {const} */ (["lp", "completo"])) {
      const pastaVitrine = path.join(RAIZ_REPO, "modelos", modelo + (versao === "completo" ? "-completo" : ""));
      const reais = readdirSync(pastaVitrine).filter((f) => f.endsWith(".html")).sort();
      assert.deepEqual([...m.paginas[versao]].sort(), reais, `${modelo} ${versao}`);
    }
  }
});

test("não sobrescreve uma pasta que já tem arquivos", async () => {
  const ocupada = path.join(pasta, "ocupada");
  mkdirSync(ocupada);
  writeFileSync(path.join(ocupada, "algo.txt"), "x");
  await assert.rejects(
    gerarSite({ ...CLIENTES.petshop, versao: "lp", saida: ocupada }),
    /já existe e não está vazia/,
  );
});
