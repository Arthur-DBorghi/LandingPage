// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarCores, aplicarTextos, contraste, lerCores, marcarEditaveis } from "../../painel/edicao.mjs";

const PAGINA = `<!DOCTYPE html>
<html><head><title>T</title></head>
<body>
  <h1>Seu pet cheiroso, <span>sem sair de casa.</span></h1>
  <p class="lead">Banho &amp; tosa</p>
  <ul><li>Um</li><li>Dois <a href="#">link</a></li></ul>
  <svg><text>não</text></svg>
  <span class="pontos"></span>
</body></html>
`;

test("marca textos editáveis sem mexer no resto da página", () => {
  const { html, alvos } = marcarEditaveis(PAGINA);
  assert.match(html, /<h1 data-pv="0">Seu pet cheiroso, <span>sem sair de casa\.<\/span><\/h1>/); // título com formatação: um alvo só
  assert.match(html, /<p class="lead" data-pv="1">Banho &amp; tosa<\/p>/);
  assert.match(html, /<li data-pv="2">Um<\/li>/);
  // Link no meio do texto: o item da lista não vira um alvo só, mas o texto do link sim
  assert.match(html, /<li>Dois <a href="#" data-pv="3">link<\/a><\/li>/);
  assert.doesNotMatch(html, /<text data-pv/); // dentro de svg não
  assert.equal(alvos.length, 5); // h1, p, li, a, span vazio
});

test("grava o texto editado no lugar certo e mantém a formatação do resto", () => {
  const novo = aplicarTextos(PAGINA, new Map([[1, "Banho, tosa &amp; hidratação"], [0, 'Seu cão feliz, <span>sem trânsito.</span>']]));
  assert.ok(novo.includes('<p class="lead">Banho, tosa &amp; hidratação</p>'));
  assert.ok(novo.includes("<h1>Seu cão feliz, <span>sem trânsito.</span></h1>"));
  assert.equal(novo.replace(/<h1>.*<\/h1>/, "").replace(/<p class="lead">.*<\/p>/, ""), PAGINA.replace(/<h1>.*<\/h1>/, "").replace(/<p class="lead">.*<\/p>/, ""));
  // A numeração continua a mesma depois da edição
  assert.equal(marcarEditaveis(novo).alvos.length, marcarEditaveis(PAGINA).alvos.length);
});

test("lê e troca as cores do :root, sem tocar no resto do CSS", () => {
  const css = ":root {\n  --azul: #1E5BD8;\n  --sol: #fc3;\n  --linha: rgba(0,0,0,.1);\n}\n.x { color: #1E5BD8; }";
  assert.deepEqual(lerCores(css), [{ nome: "--azul", valor: "#1E5BD8" }, { nome: "--sol", valor: "#FFCC33" }]);
  const novo = aplicarCores(css, new Map([["--azul", "#ff0000"]]));
  assert.match(novo, /--azul: #FF0000;/);
  assert.match(novo, /--sol: #fc3;/);
  assert.match(novo, /\.x \{ color: #1E5BD8; \}/); // fora do :root não muda
});

test("contraste segue a fórmula da WCAG", () => {
  assert.equal(Math.round(contraste("#000000", "#FFFFFF")), 21);
  assert.ok(contraste("#777777", "#FFFFFF") < 4.5);
});
