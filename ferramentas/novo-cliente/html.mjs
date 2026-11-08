// @ts-check
// Edição "cirúrgica" de HTML: o parse5 lê a página e diz a posição exata de cada
// tag e atributo no texto original; as mudanças são aplicadas nessas posições.
// Assim o HTML do cliente sai com a mesma formatação da vitrine, pronto para
// continuar sendo editado à mão.

import { parse } from "parse5";
import { escaparHtml } from "./texto.mjs";

/**
 * @typedef {{ inicio: number, fim: number, texto: string }} Edicao
 * @typedef {{ name: string, value: string }} Atributo
 * @typedef {{ startOffset: number, endOffset: number }} Posicao
 * @typedef {Posicao & { startTag?: Posicao, attrs?: Record<string, Posicao> }} PosicaoElemento
 * @typedef {{ startOffset: number, endOffset: number, startTag?: Posicao, endTag?: Posicao, attrs?: Record<string, Posicao> }} PosicaoCompleta
 * @typedef {{ nodeName: string, tagName?: string, attrs?: Atributo[], data?: string, value?: string,
 *   childNodes?: No[], content?: No, parentNode?: No | null, sourceCodeLocation?: PosicaoCompleta | null }} No
 */

/**
 * Percorre todos os nós do documento, inclusive dentro de <template>.
 * @param {No} no
 * @param {(no: No) => void} visitar
 */
export function percorrer(no, visitar) {
  visitar(no);
  for (const filho of no.childNodes ?? []) percorrer(filho, visitar);
  if (no.content) percorrer(no.content, visitar);
}

/**
 * Lê o HTML guardando a posição de cada nó no texto original.
 * @param {string} html
 * @returns {No}
 */
export function lerHtml(html) {
  return /** @type {No} */ (/** @type {unknown} */ (parse(html, { sourceCodeLocationInfo: true })));
}

/**
 * @param {No} no
 * @param {string} nome
 * @returns {string | undefined}
 */
export function atributo(no, nome) {
  return no.attrs?.find((a) => a.name === nome)?.value;
}

/**
 * Aplica as edições de trás para frente, para as posições continuarem valendo.
 * @param {string} texto
 * @param {Edicao[]} edicoes
 * @returns {string}
 */
export function aplicarEdicoes(texto, edicoes) {
  const ordenadas = [...edicoes].sort((a, b) => b.inicio - a.inicio || b.fim - a.fim);
  for (let i = 1; i < ordenadas.length; i++) {
    if (ordenadas[i].fim > ordenadas[i - 1].inicio) {
      throw new Error(`Edições sobrepostas nas posições ${ordenadas[i].inicio} e ${ordenadas[i - 1].inicio}.`);
    }
  }
  let resultado = texto;
  for (const e of ordenadas) resultado = resultado.slice(0, e.inicio) + e.texto + resultado.slice(e.fim);
  return resultado;
}

/**
 * Edição que remove um trecho; se ele ocupa a linha inteira, remove a linha
 * (e uma linha em branco que sobraria antes dele).
 * @param {string} texto
 * @param {Posicao} pos
 * @returns {Edicao}
 */
export function remover(texto, pos) {
  let inicio = pos.startOffset;
  let fim = pos.endOffset;
  const inicioLinha = texto.lastIndexOf("\n", inicio - 1) + 1;
  const fimLinha = texto.indexOf("\n", fim);
  const antesVazio = /^[ \t]*$/.test(texto.slice(inicioLinha, inicio));
  const depoisVazio = /^[ \t]*$/.test(texto.slice(fim, fimLinha === -1 ? texto.length : fimLinha));
  if (antesVazio && depoisVazio) {
    inicio = inicioLinha;
    fim = fimLinha === -1 ? texto.length : fimLinha + 1;
    // Se a linha de cima ficou em branco e a de baixo também, tira a de cima
    const linhaAnterior = texto.lastIndexOf("\n", inicio - 2) + 1;
    if (inicio > 0 && /^[ \t]*\n$/.test(texto.slice(linhaAnterior, inicio)) && /^[ \t]*(\n|$)/.test(texto.slice(fim))) {
      inicio = linhaAnterior;
    }
  }
  return { inicio, fim, texto: "" };
}

/**
 * Edição que troca o valor de um atributo existente.
 * @param {No} no
 * @param {string} nome
 * @param {string} valor valor novo, sem escapar
 * @returns {Edicao}
 */
export function trocarAtributo(no, nome, valor) {
  const pos = no.sourceCodeLocation?.attrs?.[nome];
  if (!pos) throw new Error(`Atributo ${nome} sem posição em <${no.tagName}>.`);
  return { inicio: pos.startOffset, fim: pos.endOffset, texto: `${nome}="${escaparHtml(valor)}"` };
}

/**
 * Edição que remove um atributo (e o espaço antes dele).
 * @param {string} texto
 * @param {No} no
 * @param {string} nome
 * @returns {Edicao}
 */
export function removerAtributo(texto, no, nome) {
  const pos = no.sourceCodeLocation?.attrs?.[nome];
  if (!pos) throw new Error(`Atributo ${nome} sem posição em <${no.tagName}>.`);
  let inicio = pos.startOffset;
  while (inicio > 0 && /[ \t]/.test(texto[inicio - 1])) inicio--;
  return { inicio, fim: pos.endOffset, texto: "" };
}

/**
 * Edição que acrescenta atributos no fim da tag de abertura.
 * @param {string} texto
 * @param {No} no
 * @param {string} atributos ex.: ' target="_blank" rel="noopener"'
 * @returns {Edicao}
 */
export function acrescentarAtributos(texto, no, atributos) {
  const tag = no.sourceCodeLocation?.startTag;
  if (!tag) throw new Error(`<${no.tagName}> sem posição.`);
  let fim = tag.endOffset - 1; // antes do ">"
  if (texto[fim - 1] === "/") fim--; // tag fechada com "/>"
  while (/[ \t]/.test(texto[fim - 1])) fim--;
  return { inicio: fim, fim, texto: atributos };
}
