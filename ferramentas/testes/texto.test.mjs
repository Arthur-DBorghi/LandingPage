// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { escaparHtml, substituirNomes } from "../novo-cliente/texto.mjs";

test("acerta artigos e contrações quando o gênero muda", () => {
  const regras = [{ antigo: "Navalha Fina", novo: "Studio Corte", artigo: /** @type {const} */ ("o") }];
  assert.equal(substituirNomes("Barbeiros da Navalha Fina", regras), "Barbeiros do Studio Corte");
  assert.equal(substituirNomes("Na Navalha Fina", regras), "No Studio Corte");
  assert.equal(substituirNomes("Por que a Navalha Fina", regras), "Por que o Studio Corte");
  assert.equal(substituirNomes("<span>Navalha Fina</span>", regras), "<span>Studio Corte</span>");
});

test("bairro: \"no Centro\" vira \"na Mooca\"", () => {
  const regras = [{ antigo: "Centro", novo: "Mooca", artigo: /** @type {const} */ ("a") }];
  assert.equal(substituirNomes("Corte e barba no Centro", regras), "Corte e barba na Mooca");
  assert.equal(substituirNomes("Barbearia · Centro", regras), "Barbearia · Mooca");
});

test("não mexe em palavras que só contêm o nome", () => {
  const regras = [{ antigo: "Clara", novo: "Paula", artigo: /** @type {const} */ ("a") }];
  assert.equal(substituirNomes("uma explicação clara", regras), "uma explicação clara");
  assert.equal(substituirNomes("Claramente", regras), "Claramente");
  assert.equal(substituirNomes("Olá, Clara!", regras), "Olá, Paula!");
});

test("uma troca não atinge o resultado de outra", () => {
  const regras = [
    { antigo: "Clara Andrade", novo: "Clara Souza", artigo: /** @type {const} */ ("a") },
    { antigo: "Clara", novo: "Paula" },
  ];
  // "Clara Souza" (resultado da primeira) não pode virar "Paula Souza"
  assert.equal(substituirNomes("Sobre a Clara Andrade e a Clara", regras), "Sobre a Clara Souza e a Paula");
});

test("escapa o nome novo para HTML", () => {
  const regras = [{ antigo: "Focinho Feliz", novo: "Pet & Cia <3", artigo: /** @type {const} */ ("o") }];
  assert.equal(substituirNomes("<span>Focinho Feliz</span>", regras), "<span>Pet &amp; Cia &lt;3</span>");
  assert.equal(escaparHtml('"oi"'), "&quot;oi&quot;");
});
