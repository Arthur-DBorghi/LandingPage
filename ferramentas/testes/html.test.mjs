// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarEdicoes } from "../novo-cliente/html.mjs";
import { transformarCss, transformarPagina, linkWhats } from "../novo-cliente/gerar.mjs";

const PAGINA = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <title>Teste</title>
  <!-- Modelo fictício: não deve aparecer no Google -->
  <meta name="robots" content="noindex" />
  <link rel="icon" type="image/png" href="../../assets/img/favicon.png" />
  <link rel="preload" href="../../assets/fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="../comum/demo.css" />
  <link rel="stylesheet" href="../barbearia/style.css" />
</head>
<body data-modelo="barbearia" data-plano="site">

  <!-- Faixa de demonstração: carregada logo no início -->
  <script src="../comum/demo.js"></script>

  <a href="servicos.html#clube" class="link">Clube</a>
  <a href="#" class="botao" data-whats="Olá! Quero agendar.">Agendar</a>
  <a class="botao" data-whats="Oi &amp; tchau" target="_self">Sem href</a>
  <script src="../comum/site.js" defer></script>
</body>
</html>
`;

function contexto() {
  /** @type {Map<string, string>} */
  const plano = new Map();
  return {
    plano,
    contexto: {
      paginaRepo: "modelos/barbearia-completo/index.html",
      numero: "5511987654321",
      paginasDaVitrine: new Set(["modelos/barbearia-completo/index.html", "modelos/barbearia-completo/servicos.html"]),
      planejar: (/** @type {string} */ origem) => {
        const destino = origem.endsWith(".css") ? `assets/css/${origem.split("/").pop()}` : origem.endsWith(".js") ? `assets/js/${origem.split("/").pop()}` : `assets/fonts/${origem.split("/").pop()}`;
        plano.set(origem, destino);
        return destino;
      },
    },
  };
}

test("aplica edições de trás para frente e recusa sobreposição", () => {
  assert.equal(aplicarEdicoes("abcdef", [{ inicio: 0, fim: 1, texto: "X" }, { inicio: 4, fim: 6, texto: "YZ!" }]), "XbcdYZ!");
  assert.throws(() => aplicarEdicoes("abcdef", [{ inicio: 0, fim: 3, texto: "" }, { inicio: 2, fim: 4, texto: "" }]));
});

test("tira a camada de demonstração e o noindex", () => {
  const { contexto: ctx } = contexto();
  const html = transformarPagina(PAGINA, ctx);
  assert.doesNotMatch(html, /noindex|Modelo fictício|demo\.css|demo\.js|favicon|data-modelo|data-plano|Faixa de demonstração/);
  assert.match(html, /<body>\n/);
  assert.match(html, /<script src="assets\/js\/whats\.js" defer><\/script>/);
});

test("aponta CSS, JS e fontes para assets/ e registra o que copiar", () => {
  const { contexto: ctx, plano } = contexto();
  const html = transformarPagina(PAGINA, ctx);
  assert.match(html, /href="assets\/css\/style\.css"/);
  assert.match(html, /href="assets\/fonts\/inter-latin-400-normal\.woff2"/);
  assert.match(html, /src="assets\/js\/site\.js"/);
  assert.match(html, /href="servicos\.html#clube"/); // link entre páginas continua igual
  assert.deepEqual([...plano.keys()].sort(), [
    "assets/fonts/inter-latin-400-normal.woff2",
    "modelos/barbearia/style.css",
    "modelos/comum/site.js",
  ]);
});

test("botões de WhatsApp viram links de verdade, com a mensagem", () => {
  const { contexto: ctx } = contexto();
  const html = transformarPagina(PAGINA, ctx);
  assert.ok(html.includes(`href="${linkWhats("5511987654321", "Olá! Quero agendar.")}"`));
  assert.ok(html.includes('data-whats="Olá! Quero agendar." target="_blank" rel="noopener">Agendar'));
  // Sem href: ganha href; target já existia e é mantido
  assert.ok(html.includes(`data-whats="Oi &amp; tchau" target="_self" href="${linkWhats("5511987654321", "Oi & tchau")}" rel="noopener">`));
});

test("o resto da página fica exatamente igual (formatação preservada)", () => {
  const { contexto: ctx } = contexto();
  const html = transformarPagina(PAGINA, ctx);
  assert.ok(html.startsWith('<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n  <title>Teste</title>\n  <link rel="preload"'));
  assert.ok(html.endsWith("  <script src=\"assets/js/site.js\" defer></script>\n</body>\n</html>\n"));
});

test("link para fora da vitrine é erro", () => {
  const { contexto: ctx } = contexto();
  assert.throws(() => transformarPagina('<a href="../../orcamento.html">x</a>', ctx), /fora da vitrine/);
});

test("reescreve url() do CSS relativo à nova pasta", () => {
  const { contexto: ctx } = contexto();
  const css = '@font-face { src: url("../../assets/fonts/inter-latin-400-normal.woff2") format("woff2"); }\n.a { background: url(data:image/png;base64,AAA) }';
  const novo = transformarCss(css, { origemRepo: "modelos/barbearia/style.css", destino: "assets/css/style.css", planejar: ctx.planejar });
  assert.match(novo, /url\("\.\.\/fonts\/inter-latin-400-normal\.woff2"\)/);
  assert.match(novo, /url\(data:image\/png;base64,AAA\)/);
});
