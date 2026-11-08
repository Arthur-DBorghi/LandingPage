// @ts-check
// Troca de nomes fictícios pelos do cliente, acertando artigos e contrações
// ("da Navalha Fina" → "do Studio Corte", "no Centro" → "na Mooca").

/** @typedef {import("./entrada.mjs").Artigo} Artigo */

/** Formas do artigo antes de um nome, por gênero. A ordem das listas importa: mesma posição = mesma função. */
const FORMAS = {
  a: ["a", "da", "na", "pela", "à"],
  o: ["o", "do", "no", "pelo", "ao"],
};

const LETRA = "\\p{L}";

/** @param {string} s */
function escaparRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escapa um valor para entrar em texto ou atributo HTML.
 * @param {string} s
 */
export function escaparHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Converte a forma do artigo para o outro gênero, mantendo maiúscula inicial.
 * @param {string} forma ex.: "Na"
 * @param {Artigo} genero gênero do nome novo
 */
function converterArtigo(forma, genero) {
  const minuscula = forma.toLowerCase();
  const indice = Math.max(FORMAS.a.indexOf(minuscula), FORMAS.o.indexOf(minuscula));
  if (indice < 0) return forma;
  const nova = FORMAS[genero][indice];
  return forma[0] === forma[0].toUpperCase() ? nova[0].toUpperCase() + nova.slice(1) : nova;
}

/**
 * @typedef {{ antigo: string, novo: string, artigo?: Artigo | null }} Regra
 *  antigo: texto fictício exato; novo: texto do cliente (sem escapar);
 *  artigo: gênero do nome novo, para acertar "da/do", "na/no"... (null = não mexe no artigo)
 */

/**
 * Aplica as regras em ordem, sem que uma troca atinja o resultado de outra
 * (cada troca vira um marcador e só no fim os marcadores viram texto).
 * @param {string} texto
 * @param {Regra[]} regras
 * @returns {string}
 */
export function substituirNomes(texto, regras) {
  /** @type {string[]} */
  const finais = [];
  let resultado = texto;
  for (const regra of regras) {
    if (!regra.antigo) continue;
    const artigos = [...FORMAS.a, ...FORMAS.o].join("|");
    const padrao = new RegExp(
      `(?<![${LETRA}])(?:((?:${artigos}))(\\s+))?${escaparRegex(regra.antigo)}(?![${LETRA}])`,
      "giu",
    );
    resultado = resultado.replace(padrao, (inteiro, artigo, espaco) => {
      // O nome em si precisa bater com maiúsculas e minúsculas exatas
      const nome = inteiro.slice((artigo ? artigo.length + espaco.length : 0));
      if (nome !== regra.antigo) return inteiro;
      const novoArtigo = artigo && regra.artigo ? converterArtigo(artigo, regra.artigo) : artigo;
      finais.push(escaparHtml(regra.novo));
      const marcador = `\u0000${finais.length - 1}\u0000`;
      return artigo ? `${novoArtigo}${espaco}${marcador}` : marcador;
    });
  }
  return resultado.replace(/\u0000(\d+)\u0000/g, (_, i) => finais[Number(i)]);
}
