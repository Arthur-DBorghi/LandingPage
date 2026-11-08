// @ts-check
// Versão de terminal: monta o site com o núcleo (montar.mjs) lendo as vitrines
// do disco e grava o resultado numa pasta nova.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { montarSite } from "./montar.mjs";

export { linkWhats, montarSite, pastaDaVitrine, procurarPendencias, regrasDeIdentidade, transformarCss, transformarPagina, trocarIdentidade, trocarSeoDaLandingPage } from "./montar.mjs";

/**
 * @typedef {import("./montar.mjs").DadosCliente} DadosCliente
 * @typedef {import("./montar.mjs").NomeDefinido} NomeDefinido
 * @typedef {import("./montar.mjs").Pendencia} Pendencia
 * @typedef {DadosCliente & { saida: string }} Pedido
 * @typedef {{ pasta: string, slug: string, paginas: string[], arquivos: string[], pendencias: Pendencia[] }} Resultado
 */

/** Raiz do repositório das vitrines. */
export const RAIZ_REPO = fileURLToPath(new URL("../../", import.meta.url));

/** Lê as vitrines direto do disco. @type {import("./montar.mjs").Leitor} */
export const leitorDoDisco = {
  async lerTexto(caminho) {
    return lerOuAvisar(caminho, () => readFile(path.join(RAIZ_REPO, caminho), "utf8"));
  },
  async lerBytes(caminho) {
    return lerOuAvisar(caminho, async () => new Uint8Array(await readFile(path.join(RAIZ_REPO, caminho))));
  },
};

/**
 * @template T
 * @param {string} caminho
 * @param {() => Promise<T>} ler
 */
async function lerOuAvisar(caminho, ler) {
  try {
    return await ler();
  } catch {
    throw new Error(`Arquivo não encontrado: ${caminho}.`);
  }
}

/**
 * Gera o site do cliente na pasta pedido.saida.
 * @param {Pedido} pedido
 * @returns {Promise<Resultado>}
 */
export async function gerarSite(pedido) {
  if (existsSync(pedido.saida) && readdirSync(pedido.saida).length > 0) {
    throw new Error(`A pasta ${pedido.saida} já existe e não está vazia.`);
  }
  const { saida, ...dados } = pedido;
  const site = await montarSite(dados, leitorDoDisco);

  for (const [caminho, conteudo] of site.arquivos) {
    const destino = path.join(saida, caminho);
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, conteudo);
  }
  return {
    pasta: saida,
    slug: site.slug,
    paginas: site.paginas,
    arquivos: [...site.arquivos.keys()].filter((c) => c.startsWith("assets/")).sort(),
    pendencias: site.pendencias,
  };
}
