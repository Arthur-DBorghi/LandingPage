// @ts-check
// Edição no painel: marca os textos editáveis da prévia e grava o que foi
// editado de volta no HTML do cliente, nas posições exatas (mesma técnica do núcleo).

import { acrescentarAtributos, aplicarEdicoes, lerHtml, percorrer } from "../ferramentas/novo-cliente/html.mjs";
import { escaparHtml } from "../ferramentas/novo-cliente/texto.mjs";

/** @typedef {import("../ferramentas/novo-cliente/html.mjs").No} No */

/** Elementos de texto que podem ser editados clicando. */
const EDITAVEIS = new Set([
  "h1", "h2", "h3", "h4", "p", "li", "a", "span", "small", "strong", "em", "b", "i",
  "button", "figcaption", "summary", "td", "th", "dt", "dd", "blockquote", "label",
]);

/** Formatação que pode ficar dentro de um texto editável (ex.: o <span> colorido de um título). */
const EMBUTIDOS = new Set(["span", "strong", "em", "b", "i", "small", "br"]);

/** Onde não se edita nada. */
const FORA = new Set(["head", "script", "style", "svg", "template", "select", "textarea"]);

/** @param {No} no */
function soTexto(no) {
  return (no.childNodes ?? []).every((f) => f.nodeName === "#text");
}

/** Texto puro, ou texto com formatação simples (cada pedaço de formatação só com texto dentro). @param {No} no */
function editavel(no) {
  return (no.childNodes ?? []).every((f) =>
    f.nodeName === "#text" || (f.tagName !== undefined && EMBUTIDOS.has(f.tagName) && soTexto(f)));
}

/** @param {No} no */
function dentroDeArea(no) {
  for (let p = no.parentNode; p; p = p.parentNode) if (p.tagName && FORA.has(p.tagName)) return true;
  return false;
}

/**
 * Marca cada texto editável com data-pv="N" (só na prévia) e devolve onde fica o conteúdo de cada um.
 * A numeração depende só da estrutura da página, então continua valendo depois de trocar textos.
 * @param {string} html
 * @returns {{ html: string, alvos: { inicio: number, fim: number }[] }}
 */
export function marcarEditaveis(html) {
  const documento = lerHtml(html);
  /** @type {import("../ferramentas/novo-cliente/html.mjs").Edicao[]} */
  const edicoes = [];
  /** @type {{ inicio: number, fim: number }[]} */
  const alvos = [];
  /** @type {Set<No>} */
  const marcados = new Set();
  percorrer(documento, (no) => {
    if (!no.tagName || !EDITAVEIS.has(no.tagName) || !editavel(no)) return;
    const pos = no.sourceCodeLocation;
    if (!pos?.startTag || !pos.endTag || dentroDeArea(no)) return;
    for (let p = no.parentNode; p; p = p.parentNode) if (marcados.has(p)) return; // já faz parte de um texto marcado
    marcados.add(no);
    edicoes.push(acrescentarAtributos(html, no, ` data-pv="${alvos.length}"`));
    alvos.push({ inicio: pos.startTag.endOffset, fim: pos.endTag.startOffset });
  });
  return { html: aplicarEdicoes(html, edicoes), alvos };
}

/**
 * Grava textos editados no HTML original.
 * @param {string} html HTML do cliente (sem as marcas data-pv)
 * @param {Map<number, string>} textos número do texto → conteúdo novo, já limpo (ver limparConteudo)
 */
export function aplicarTextos(html, textos) {
  const { alvos } = marcarEditaveis(html);
  const edicoes = [...textos].filter(([n]) => alvos[n]).map(([n, conteudo]) => ({ ...alvos[n], texto: conteudo }));
  return aplicarEdicoes(html, edicoes);
}

/**
 * Transforma o que a pessoa editou na prévia em HTML seguro: texto escapado e só a formatação
 * permitida (com a classe original). Qualquer outra coisa que o navegador tenha criado vira texto.
 * @param {Node} elemento
 * @returns {string}
 */
export function limparConteudo(elemento) {
  let saida = "";
  for (const filho of elemento.childNodes) {
    if (filho.nodeType === 3) saida += escaparHtml(filho.textContent ?? "");
    else if (filho.nodeType === 1) {
      const el = /** @type {Element} */ (filho);
      const tag = el.tagName.toLowerCase();
      if (tag === "br") saida += "<br />";
      else if (EMBUTIDOS.has(tag)) {
        const classes = [...el.classList].filter((c) => !["revelar", "revelar-img", "visivel"].includes(c)).join(" ");
        saida += `<${tag}${classes ? ` class="${escaparHtml(classes)}"` : ""}>${escaparHtml(el.textContent ?? "")}</${tag}>`;
      } else saida += escaparHtml(el.textContent ?? "");
    }
  }
  return saida;
}

/**
 * Cores da marca: as variáveis com cor em hexadecimal no primeiro :root do CSS.
 * @param {string} css
 * @returns {{ nome: string, valor: string }[]}
 */
export function lerCores(css) {
  const raiz = css.match(/:root\s*\{([^}]*)\}/);
  if (!raiz) return [];
  return [...raiz[1].matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\s*;/g)].map((m) => ({ nome: m[1], valor: expandirHex(m[2]) }));
}

/**
 * Troca o valor das variáveis de cor no primeiro :root do CSS.
 * @param {string} css
 * @param {Map<string, string>} cores nome da variável → #rrggbb
 */
export function aplicarCores(css, cores) {
  return css.replace(/:root\s*\{[^}]*\}/, (bloco) =>
    bloco.replace(/(--[\w-]+)(\s*:\s*)(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})(\s*;)/g, (inteiro, nome, sep, _v, fim) =>
      cores.has(nome) ? `${nome}${sep}${String(cores.get(nome)).toUpperCase()}${fim}` : inteiro));
}

/** @param {string} hex */
function expandirHex(hex) {
  const h = hex.slice(1);
  return ("#" + (h.length === 3 ? [...h].map((c) => c + c).join("") : h)).toUpperCase();
}

/**
 * Contraste entre duas cores (WCAG): 1 a 21. Texto comum pede pelo menos 4,5.
 * @param {string} a #rrggbb
 * @param {string} b #rrggbb
 */
export function contraste(a, b) {
  const lum = (/** @type {string} */ hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [claro, escuro] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}
