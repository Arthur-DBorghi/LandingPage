// Variações de layout do painel: topo, ordem e seções escondidas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { alternarLinks, alternarSecao, aplicarEstiloDoTopo, lerEstiloDoTopo, listarSecoes, reordenarSecoes, usaVariacoes } from "../../painel/variacoes.mjs";

const PAGINA = `<html><body>
  <nav><a href="#precos">Preços</a><a href="#duvidas">Dúvidas</a></nav>
  <main id="topo">
    <!-- HERO -->
    <section class="hero">
      <div><h1>Título</h1><a href="#precos" class="link-seta">Ver preços →</a></div>
      <div class="arte"></div>
    </section>

    <!-- PREÇOS -->
    <section class="secao" id="precos">
      <p class="sobretitulo">Preços</p>
      <h2>Escolha o porte</h2>
    </section>

    <!-- DÚVIDAS -->
    <section class="secao" id="duvidas"><h2>Dúvidas frequentes</h2></section>

    <section class="cta"><h2>Agende hoje</h2></section>
  </main>
  <footer><ul><li><a href="#precos">Preços</a></li><li><a href="#duvidas">Dúvidas</a> e mais</li></ul></footer>
</body></html>`;

test("lista as seções (menos o topo) com o título h2", () => {
  assert.deepEqual(listarSecoes(PAGINA).map((s) => [s.rotulo, s.id, s.oculta]), [
    ["Escolha o porte", "precos", false],
    ["Dúvidas frequentes", "duvidas", false],
    ["Agende hoje", null, false],
  ]);
});

test("reordena as seções levando o comentário de cada uma junto", () => {
  const novo = reordenarSecoes(PAGINA, [2, 0, 1]);
  assert.deepEqual(listarSecoes(novo).map((s) => s.rotulo), ["Agende hoje", "Escolha o porte", "Dúvidas frequentes"]);
  assert.ok(novo.indexOf("<!-- PREÇOS -->") < novo.indexOf('id="precos"'));
  assert.ok(novo.indexOf('class="cta"') < novo.indexOf("<!-- PREÇOS -->"));
  // Voltar à ordem original devolve o HTML idêntico
  assert.equal(reordenarSecoes(novo, [1, 2, 0]), PAGINA);
});

test("esconde a seção e os links para ela, e desfaz sem deixar rastro", () => {
  const { html, id } = alternarSecao(PAGINA, 0, true);
  assert.equal(id, "precos");
  assert.match(html, /<section class="secao" id="precos" hidden>/);
  assert.match(html, /<a href="#precos" hidden>Preços<\/a><a href="#duvidas">/);
  assert.match(html, /<a href="#precos" class="link-seta" hidden>/);
  assert.match(html, /<li hidden><a href="#precos">Preços<\/a><\/li>/);
  assert.equal(listarSecoes(html)[0].oculta, true);
  assert.equal(usaVariacoes({ "index.html": html }), true);
  assert.equal(alternarSecao(html, 0, false).html, PAGINA);
});

test("li com mais coisa além do link: esconde só o link", () => {
  const html = alternarLinks(PAGINA, ["#duvidas"], true);
  assert.match(html, /<li><a href="#duvidas" hidden>Dúvidas<\/a> e mais<\/li>/);
});

test("estilo do topo: aplica, troca e volta ao padrão", () => {
  assert.equal(lerEstiloDoTopo(PAGINA), "padrao");
  const faixa = aplicarEstiloDoTopo(PAGINA, "faixa");
  assert.match(faixa, /<section class="hero" data-topo="faixa">/);
  assert.equal(lerEstiloDoTopo(faixa), "faixa");
  assert.match(aplicarEstiloDoTopo(faixa, "centralizado"), /data-topo="centralizado"/);
  assert.equal(aplicarEstiloDoTopo(faixa, "padrao"), PAGINA);
  assert.equal(usaVariacoes({ "index.html": PAGINA }), false);
  assert.equal(lerEstiloDoTopo("<main><section class='secao'></section></main>"), null);
});

test("funciona nas vitrines de verdade", () => {
  for (const m of ["barbearia", "consultoria", "petshop", "petshop-completo"]) {
    const html = readFileSync(new URL(`../../modelos/${m}/index.html`, import.meta.url), "utf8");
    const secoes = listarSecoes(html);
    assert.ok(secoes.length >= 3, m);
    const invertida = secoes.map((s) => s.indice).reverse();
    assert.equal(reordenarSecoes(reordenarSecoes(html, invertida), invertida), html, m);
    assert.match(aplicarEstiloDoTopo(html, "invertido"), /data-topo="invertido"/, m);
  }
});

test("fundo fixo: liga, desliga e é detectado como variação", async () => {
  const { aplicarFundo, lerFundo } = await import("../../painel/variacoes.mjs");
  assert.equal(lerFundo(PAGINA), "normal");
  const fixo = aplicarFundo(PAGINA, "fixo");
  assert.match(fixo, /<body data-fundo="fixo">/);
  assert.equal(lerFundo(fixo), "fixo");
  assert.equal(usaVariacoes({ "index.html": fixo }), true);
  assert.equal(aplicarFundo(fixo, "normal"), PAGINA);
});
