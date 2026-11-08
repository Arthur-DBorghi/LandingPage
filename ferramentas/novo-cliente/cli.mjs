#!/usr/bin/env node
// @ts-check
// Ferramenta "novo cliente": transforma uma vitrine em site de cliente.
//
// Uso interativo:   node ferramentas/novo-cliente/cli.mjs
// Sem perguntas:    node ferramentas/novo-cliente/cli.mjs --modelo barbearia --versao completo \
//                     --nome "a Barbearia do Zé" --whatsapp "(11) 98765-4321" \
//                     --cidade "São Paulo" --bairro "a Mooca" --endereco "Rua Tal, 45" --sim

import { execFileSync } from "node:child_process";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { criarSlug, formatarTelefone, normalizarDominio, normalizarEmail, normalizarWhatsapp, separarArtigo } from "./entrada.mjs";
import { gerarSite, RAIZ_REPO } from "./gerar.mjs";
import { MODELOS } from "./modelos.mjs";

/** @typedef {import("./gerar.mjs").Pedido} Pedido @typedef {import("./gerar.mjs").NomeDefinido} NomeDefinido */

const AJUDA = `Transforma uma vitrine em site de cliente, numa pasta nova.

Opções (o que faltar é perguntado):
  --modelo        barbearia | consultoria | petshop
  --versao        lp | completo
  --nome          nome do negócio com artigo, ex.: "a Barbearia do Zé", "o Studio Corte"
  --whatsapp      com DDD, ex.: "(11) 98765-4321"
  --cidade        ex.: "São Paulo"                    (barbearia e pet shop)
  --bairro        com artigo, ex.: "a Mooca", "o Centro"  (barbearia e pet shop)
  --endereco      rua e número, ex.: "Rua Tal, 45"    (opcional)
  --profissional  com artigo, ex.: "a Paula Lima"     (consultoria)
  --email         (opcional, consultoria)
  --dominio       ex.: barbeariadoze.com.br           (opcional)
  --saida         pasta do site (padrão: ../clientes/<nome-do-negócio>)
  --git           cria o repositório Git com o primeiro commit
  --sim           não pede confirmação
  --ajuda         mostra esta ajuda`;

const { values: opcoes } = parseArgs({
  options: {
    modelo: { type: "string" }, versao: { type: "string" }, nome: { type: "string" },
    whatsapp: { type: "string" }, cidade: { type: "string" }, bairro: { type: "string" },
    endereco: { type: "string" }, profissional: { type: "string" }, email: { type: "string" },
    dominio: { type: "string" }, saida: { type: "string" },
    git: { type: "boolean" }, sim: { type: "boolean" }, ajuda: { type: "boolean" },
  },
});

if (opcoes.ajuda) {
  console.log(AJUDA);
  process.exit(0);
}

const interativo = process.stdin.isTTY === true;
const leitor = interativo ? createInterface({ input: process.stdin, output: process.stdout }) : null;
// Lê linha a linha por um iterador: assim nada se perde se a pessoa colar várias respostas de uma vez
const linhas = leitor ? leitor[Symbol.asyncIterator]() : null;

/** @param {string} texto */
async function perguntar(texto) {
  if (!linhas) throw new Error("Sem terminal para perguntar.");
  process.stdout.write(texto);
  const { value, done } = await linhas.next();
  if (done) throw new Error("Entrada encerrada antes do fim das perguntas.");
  return String(value);
}

/**
 * Pergunta até a resposta passar na validação. Fora do terminal, usa só as opções.
 * @template T
 * @param {string} pergunta
 * @param {string | undefined} jaDado valor vindo das opções
 * @param {(texto: string) => T} validar lança erro se inválido
 * @param {{ opcional?: boolean, padrao?: string, opcao: string }} cfg
 * @returns {Promise<T>}
 */
async function obter(pergunta, jaDado, validar, cfg) {
  if (jaDado !== undefined) return validar(jaDado);
  if (!leitor) {
    if (cfg.opcional) return validar(cfg.padrao ?? "");
    throw new Error(`Falta --${cfg.opcao} (rode com --ajuda para ver as opções).`);
  }
  for (;;) {
    const sufixo = cfg.padrao ? ` [${cfg.padrao}]` : cfg.opcional ? " (opcional)" : "";
    const resposta = (await perguntar(`${pergunta}${sufixo} › `)).trim() || cfg.padrao || "";
    if (!resposta && !cfg.opcional) {
      console.log("  Essa resposta é obrigatória.");
      continue;
    }
    try {
      return validar(resposta);
    } catch (e) {
      console.log("  " + /** @type {Error} */ (e).message);
    }
  }
}

/**
 * Nome com artigo ("a Mooca"). Sem artigo, pergunta qual é (ou exige na opção).
 * @param {string} pergunta @param {string | undefined} jaDado @param {string} opcao
 * @returns {Promise<NomeDefinido>}
 */
async function obterComArtigo(pergunta, jaDado, opcao) {
  const separado = await obter(pergunta, jaDado, (t) => {
    const s = separarArtigo(t);
    if (!s.nome) throw new Error("Escreva o nome.");
    return s;
  }, { opcao });
  if (separado.artigo) return { artigo: separado.artigo, nome: separado.nome };
  if (!leitor) throw new Error(`Em --${opcao}, comece com o artigo: "a ${separado.nome}" ou "o ${separado.nome}".`);
  const artigo = await obter(`É "a ${separado.nome}" ou "o ${separado.nome}"? (a/o)`, undefined, (t) => {
    if (t !== "a" && t !== "o") throw new Error('Responda "a" ou "o".');
    return /** @type {"a" | "o"} */ (t);
  }, { opcao });
  return { artigo, nome: separado.nome };
}

try {
  const modelo = await obter("Modelo (barbearia, consultoria, petshop)", opcoes.modelo, (t) => {
    if (!(t in MODELOS)) throw new Error("Use barbearia, consultoria ou petshop.");
    return /** @type {Pedido["modelo"]} */ (t);
  }, { opcao: "modelo" });
  const versao = await obter("Versão (lp = landing page, completo = 5 páginas)", opcoes.versao, (t) => {
    if (t !== "lp" && t !== "completo") throw new Error("Use lp ou completo.");
    return /** @type {Pedido["versao"]} */ (t);
  }, { opcao: "versao", padrao: "lp" });

  const perguntas = MODELOS[modelo].perguntas;
  const nome = await obterComArtigo('Nome do negócio, com artigo (ex.: "a Barbearia do Zé")', opcoes.nome, "nome");
  const profissional = perguntas.includes("profissional")
    ? await obterComArtigo('Profissional, como aparece no site, com artigo (ex.: "a Paula Lima")', opcoes.profissional, "profissional")
    : undefined;
  const whatsapp = await obter("WhatsApp com DDD", opcoes.whatsapp, normalizarWhatsapp, { opcao: "whatsapp" });
  const email = perguntas.includes("email") ? await obter("E-mail", opcoes.email, normalizarEmail, { opcao: "email", opcional: true }) : undefined;
  const cidade = perguntas.includes("cidade") ? await obter("Cidade", opcoes.cidade, (t) => t, { opcao: "cidade", opcional: true }) : undefined;
  const bairro = perguntas.includes("bairro") ? await obterComArtigo('Bairro, com artigo (ex.: "a Mooca", "o Centro")', opcoes.bairro, "bairro") : undefined;
  const endereco = perguntas.includes("endereco") ? await obter("Endereço (rua e número)", opcoes.endereco, (t) => t, { opcao: "endereco", opcional: true }) : undefined;
  const dominio = await obter("Domínio", opcoes.dominio, normalizarDominio, { opcao: "dominio", opcional: true });
  const saida = path.resolve(opcoes.saida ?? path.join(RAIZ_REPO, "..", "clientes", criarSlug(nome.nome)));

  /** @type {Pedido} */
  const pedido = { modelo, versao, nome, whatsapp, saida };
  if (profissional) pedido.profissional = profissional;
  if (email) pedido.email = email;
  if (cidade) pedido.cidade = cidade;
  if (bairro) pedido.bairro = bairro;
  if (endereco) pedido.endereco = endereco;
  if (dominio) pedido.dominio = dominio;

  console.log(`\n${MODELOS[modelo].rotulo} · ${versao === "completo" ? "site completo" : "landing page"}`);
  console.log(`${nome.nome} · WhatsApp ${formatarTelefone(whatsapp)}${bairro ? ` · ${bairro.nome}` : ""}`);
  console.log(`Pasta: ${saida}\n`);

  if (leitor && !opcoes.sim) {
    const ok = (await perguntar("Gerar o site? (s/n) › ")).trim().toLowerCase();
    if (ok !== "s" && ok !== "sim") {
      console.log("Nada foi criado.");
      process.exit(0);
    }
  }

  const r = await gerarSite(pedido);
  console.log(`✓ ${r.paginas.length} página(s) e ${r.arquivos.length} arquivo(s) em ${r.pasta}`);
  console.log(`✓ WhatsApp ligado em todos os botões e formulários`);
  console.log(`✓ Projeto da Cloudflare: ${r.slug}`);
  if (r.pendencias.length) {
    console.log(`! ${r.pendencias.length} trecho(s) ainda fictício(s) ou de exemplo:`);
    for (const p of r.pendencias.slice(0, 8)) console.log(`    ${p.arquivo}:${p.linha}  ${p.motivo}`);
    if (r.pendencias.length > 8) console.log(`    ... e mais ${r.pendencias.length - 8}`);
  }
  console.log(`→ Roteiro do que falta: ${path.join(r.pasta, "LEIA-ME.md")}`);

  if (opcoes.git) {
    const git = (/** @type {string[]} */ ...args) => execFileSync("git", args, { cwd: r.pasta, stdio: "pipe" });
    git("init", "-q", "-b", "main");
    git("add", "-A");
    git("commit", "-q", "-m", `Site inicial gerado a partir da vitrine ${modelo} (${versao})`);
    console.log("✓ Repositório Git criado com o primeiro commit");
  }
} catch (e) {
  console.error("✗ " + /** @type {Error} */ (e).message);
  process.exitCode = 1;
} finally {
  leitor?.close();
}
