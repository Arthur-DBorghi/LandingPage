// @ts-check
// Variações de layout no painel: estilo do topo (hero) e ordem/visibilidade das
// seções. Tudo é feito no HTML do cliente, nas posições exatas (como o núcleo),
// para o .zip sair igual ao que aparece na prévia.

import { acrescentarAtributos, aplicarEdicoes, atributo, lerHtml, percorrer, trocarAtributo } from "../ferramentas/novo-cliente/html.mjs";

/** @typedef {import("../ferramentas/novo-cliente/html.mjs").No} No */

/** Estilos do topo. "padrao" é o do modelo, sem atributo nenhum. */
export const ESTILOS_DO_TOPO = /** @type {const} */ ([
  { valor: "padrao", rotulo: "Lado a lado" },
  { valor: "invertido", rotulo: "Invertido" },
  { valor: "centralizado", rotulo: "Centralizado" },
  { valor: "faixa", rotulo: "Faixa" },
]);

/**
 * CSS das variações. Vai junto no style.css do cliente só quando alguma é usada.
 * Usa só seletores e variáveis que existem nos três modelos (com alternativas).
 */
export const CSS_DAS_VARIACOES = `
/* ---------- Variações de layout (geradas pelo painel) ---------- */
/* Seções e links escondidos no painel ficam no HTML, prontos para voltar */
[hidden] { display: none !important; }

.hero[data-topo="invertido"] { grid-template-columns: 1fr 1.25fr; }
.hero[data-topo="invertido"] > :first-child { order: 2; }

.hero[data-topo="centralizado"],
.hero[data-topo="faixa"] { grid-template-columns: 1fr; justify-items: center; text-align: center; }
.hero[data-topo="centralizado"] > :first-child,
.hero[data-topo="faixa"] > :first-child { max-width: 820px; }
.hero[data-topo="centralizado"] > :nth-child(2) { max-width: min(420px, 100%); }
.hero[data-topo="centralizado"] :is(.hero-acoes, .chips, .garantias),
.hero[data-topo="faixa"] :is(.hero-acoes, .chips, .garantias) { justify-content: center; }

.hero[data-topo="faixa"] {
  max-width: none;
  padding-block: clamp(64px, 11vw, 140px);
  background: var(--superficie, var(--fundo-alt, var(--azul-secao, transparent)));
  border-bottom: 1px solid var(--linha);
}
.hero[data-topo="faixa"] > :nth-child(2) { display: none; }
.hero[data-topo="faixa"] h1 { font-size: clamp(2.3rem, 6vw, 4.1rem); }

@media (max-width: 860px) {
  .hero[data-topo] { grid-template-columns: 1fr; }
  .hero[data-topo="invertido"] > :first-child { order: 0; }
}
`;

/** @param {string} html */
function main(html) {
  const doc = lerHtml(html);
  /** @type {No | null} */
  let principal = null;
  percorrer(doc, (no) => {
    if (!principal && no.tagName === "main") principal = no;
  });
  return { doc, principal: /** @type {No | null} */ (principal) };
}

/** @param {No} no */
function textoDe(no) {
  let t = "";
  percorrer(no, (n) => {
    if (n.nodeName === "#text") t += n.value ?? "";
  });
  return t.replace(/\s+/g, " ").trim();
}

/** @param {No} no @param {(n: No) => boolean} teste */
function achar(no, teste) {
  /** @type {No | null} */
  let achado = null;
  percorrer(no, (n) => {
    if (!achado && teste(n)) achado = n;
  });
  return /** @type {No | null} */ (achado);
}

/** @param {No} no */
const ehHero = (no) => (atributo(no, "class") ?? "").split(/\s+/).includes("hero");

/** @param {No} principal */
const secoesDe = (principal) => (principal.childNodes ?? []).filter((n) => n.tagName === "section" && !ehHero(n));

/**
 * Seções da página que podem mudar de lugar ou ser escondidas (tudo dentro de
 * <main>, menos o topo).
 * @param {string} html
 * @returns {{ indice: number, rotulo: string, id: string | null, oculta: boolean }[]}
 */
export function listarSecoes(html) {
  const { principal } = main(html);
  if (!principal) return [];
  return secoesDe(principal).map((s, indice) => {
    const titulo = achar(s, (n) => n.tagName === "h2") ?? achar(s, (n) => (atributo(n, "class") ?? "").includes("sobretitulo"));
    const id = atributo(s, "id") ?? null;
    let rotulo = titulo ? textoDe(titulo) : id ?? `Seção ${indice + 1}`;
    if (rotulo.length > 48) rotulo = rotulo.slice(0, 46).trimEnd() + "…";
    return { indice, rotulo, id, oculta: atributo(s, "hidden") !== undefined };
  });
}

/**
 * Remonta o <main> com as seções na ordem pedida (uma permutação dos índices de
 * listarSecoes). Cada seção leva junto o comentário e os espaços que vêm antes dela.
 * @param {string} html
 * @param {number[]} ordem
 */
export function reordenarSecoes(html, ordem) {
  const { principal } = main(html);
  if (!principal?.sourceCodeLocation) return html;
  const filhos = principal.childNodes ?? [];
  const secoes = secoesDe(principal);
  if (secoes.length < 2 || ordem.length !== secoes.length) return html;
  const anterior = (/** @type {No} */ s) => {
    // O bloco começa logo depois do elemento anterior (o topo ou a seção de antes)
    for (let j = filhos.indexOf(s) - 1; j >= 0; j--) {
      const f = filhos[j];
      if (f.nodeName !== "#text" && f.nodeName !== "#comment") return /** @type {number} */ (f.sourceCodeLocation?.endOffset);
    }
    return /** @type {number} */ (principal.sourceCodeLocation?.startTag?.endOffset);
  };
  const blocos = secoes.map((s) => html.slice(anterior(s), /** @type {number} */ (s.sourceCodeLocation?.endOffset)));
  const inicio = anterior(secoes[0]);
  const fim = /** @type {number} */ (secoes[secoes.length - 1].sourceCodeLocation?.endOffset);
  return html.slice(0, inicio) + ordem.map((i) => blocos[i]).join("") + html.slice(fim);
}

/**
 * Põe ou tira o atributo hidden de um elemento.
 * @param {string} html @param {No} no @param {boolean} esconder
 */
function edicaoHidden(html, no, esconder) {
  const pos = no.sourceCodeLocation?.attrs?.hidden;
  if (esconder && !pos) return acrescentarAtributos(html, no, " hidden");
  if (!esconder && pos) {
    let inicio = pos.startOffset;
    while (inicio > 0 && /[ \t]/.test(html[inicio - 1])) inicio--;
    return { inicio, fim: pos.endOffset, texto: "" };
  }
  return null;
}

/**
 * Esconde (ou mostra de novo) os links para uma âncora. Se o link for o único
 * item de um <li>, o <li> inteiro é escondido. Nada é apagado: dá para desfazer.
 * @param {string} html
 * @param {string[]} hrefs ex.: ["#precos", "index.html#precos"]
 * @param {boolean} esconder
 */
export function alternarLinks(html, hrefs, esconder) {
  const alvos = new Set(hrefs);
  const doc = lerHtml(html);
  /** @type {{inicio: number, fim: number, texto: string}[]} */
  const edicoes = [];
  percorrer(doc, (no) => {
    if (no.tagName !== "a" || !alvos.has(atributo(no, "href") ?? "")) return;
    const pai = no.parentNode;
    const sozinho = pai?.tagName === "li" && (pai.childNodes ?? []).every((f) => f === no || (f.nodeName === "#text" && !f.value?.trim()));
    const ed = edicaoHidden(html, sozinho && pai ? pai : no, esconder);
    if (ed) edicoes.push(ed);
  });
  return edicoes.length ? aplicarEdicoes(html, edicoes) : html;
}

/**
 * Esconde ou mostra uma seção (atributo hidden) e os links desta página para ela.
 * @param {string} html
 * @param {number} indice índice de listarSecoes
 * @param {boolean} esconder
 * @returns {{ html: string, id: string | null }}
 */
export function alternarSecao(html, indice, esconder) {
  const { principal } = main(html);
  const secao = principal && secoesDe(principal)[indice];
  if (!secao) return { html, id: null };
  const ed = edicaoHidden(html, secao, esconder);
  let novo = ed ? aplicarEdicoes(html, [ed]) : html;
  const id = atributo(secao, "id") ?? null;
  if (id) novo = alternarLinks(novo, [`#${id}`], esconder);
  return { html: novo, id };
}

/**
 * Estilo atual do topo da página ("padrao" se não tiver topo variável ou atributo).
 * @param {string} html
 * @returns {string | null} null quando a página não tem topo (.hero)
 */
export function lerEstiloDoTopo(html) {
  const { principal } = main(html);
  const hero = principal && (principal.childNodes ?? []).find((n) => n.tagName === "section" && ehHero(n));
  if (!hero) return null;
  return atributo(hero, "data-topo") ?? "padrao";
}

/**
 * @param {string} html
 * @param {string} estilo um dos valores de ESTILOS_DO_TOPO
 */
export function aplicarEstiloDoTopo(html, estilo) {
  const { principal } = main(html);
  const hero = principal && (principal.childNodes ?? []).find((n) => n.tagName === "section" && ehHero(n));
  if (!hero) return html;
  const atual = atributo(hero, "data-topo");
  if (estilo === "padrao") {
    if (atual === undefined || atual === null) return html;
    const pos = /** @type {NonNullable<No["sourceCodeLocation"]>} */ (hero.sourceCodeLocation).attrs?.["data-topo"];
    if (!pos) return html;
    let inicio = pos.startOffset;
    while (inicio > 0 && /[ \t]/.test(html[inicio - 1])) inicio--;
    return html.slice(0, inicio) + html.slice(pos.endOffset);
  }
  const edicao = atual !== undefined && atual !== null
    ? trocarAtributo(hero, "data-topo", estilo)
    : acrescentarAtributos(html, hero, ` data-topo="${estilo}"`);
  return aplicarEdicoes(html, [edicao]);
}

/** Alguma página usa variação de topo? @param {Record<string, string>} paginas */
export function usaVariacoes(paginas) {
  return Object.values(paginas).some((html) => /<section\b[^>]*\sdata-topo="/.test(html) || /<(section|a|li)\b[^>]*\shidden[\s>=]/.test(html));
}
