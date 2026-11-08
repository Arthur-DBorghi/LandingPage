// @ts-check
// Caminhos no estilo "pasta/arquivo.ext" (sempre com /), sem depender do Node:
// o mesmo código roda no terminal e no navegador (painel).

/** @param {string} p */
export function dirname(p) {
  const i = p.lastIndexOf("/");
  return i < 0 ? "." : p.slice(0, i) || "/";
}

/** @param {string} p */
export function basename(p) {
  return p.slice(p.lastIndexOf("/") + 1);
}

/** @param {string} p */
export function extname(p) {
  const nome = basename(p);
  const i = nome.lastIndexOf(".");
  return i <= 0 ? "" : nome.slice(i);
}

/**
 * Junta e resolve "." e "..": join("modelos/barbearia", "../comum/x.css") → "modelos/comum/x.css".
 * @param {...string} partes
 */
export function join(...partes) {
  /** @type {string[]} */
  const pilha = [];
  for (const seg of partes.join("/").split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      if (pilha.length && pilha[pilha.length - 1] !== "..") pilha.pop();
      else pilha.push("..");
    } else pilha.push(seg);
  }
  return pilha.join("/") || ".";
}

/**
 * Caminho relativo de uma pasta até um arquivo: relative("assets/css", "assets/fonts/a.woff2") → "../fonts/a.woff2".
 * @param {string} de pasta de origem
 * @param {string} para arquivo de destino
 */
export function relative(de, para) {
  const a = join(de).split("/").filter((s) => s !== ".");
  const b = join(para).split("/").filter((s) => s !== ".");
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return [...Array(a.length - i).fill(".."), ...b.slice(i)].join("/");
}
