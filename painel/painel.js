// @ts-check
// Painel "novo cliente": a mesma ferramenta do terminal, com formulário e prévia.
// Lê as vitrines do próprio site, monta o site do cliente no navegador e entrega um .zip.

import { montarSite } from "../ferramentas/novo-cliente/montar.mjs";
import { MODELOS } from "../ferramentas/novo-cliente/modelos.mjs";
import { formatarTelefone, normalizarDominio, normalizarEmail, normalizarWhatsapp } from "../ferramentas/novo-cliente/entrada.mjs";
import { dirname, join } from "../ferramentas/novo-cliente/caminhos.mjs";
import { criarZip } from "./zip.mjs";

/** @typedef {import("../ferramentas/novo-cliente/montar.mjs").DadosCliente} DadosCliente */
/** @typedef {import("../ferramentas/novo-cliente/montar.mjs").SiteMontado} SiteMontado */

const RAIZ = new URL("../", location.href);
const MEMORIA = "painel-novo-cliente";

const form = /** @type {HTMLFormElement} */ (document.getElementById("form-cliente"));
const status = /** @type {HTMLElement} */ (document.getElementById("status"));
const resultado = /** @type {HTMLElement} */ (document.getElementById("resultado"));
const resumo = /** @type {HTMLElement} */ (document.getElementById("resumo"));
const listaPendencias = /** @type {HTMLElement} */ (document.getElementById("pendencias"));
const botaoBaixar = /** @type {HTMLButtonElement} */ (document.getElementById("botao-baixar"));
const botaoGerar = /** @type {HTMLButtonElement} */ (document.getElementById("botao-gerar"));
const iframe = /** @type {HTMLIFrameElement} */ (document.getElementById("previa"));
const vazia = /** @type {HTMLElement} */ (document.getElementById("previa-vazia"));
const moldura = /** @type {HTMLElement} */ (document.getElementById("previa-moldura"));
const abas = /** @type {HTMLElement} */ (document.getElementById("previa-paginas"));
const escala = /** @type {HTMLElement} */ (document.getElementById("previa-escala"));

/** Largura do "computador" simulado: acima de 1024px aparece o menu no topo dos sites completos. */
const LARGURA_COMPUTADOR = 1280;
const LARGURA_CELULAR = 390;

/**
 * Celular: tamanho real. Computador: a página é desenhada com 1280px e reduzida
 * para caber na coluna, como uma miniatura fiel do que o visitante vê.
 */
function ajustarEscala() {
  const disponivelL = moldura.clientWidth - 36;
  const disponivelA = Math.max(520, moldura.clientHeight - 36);
  const largura = moldura.dataset.tamanho === "computador" ? LARGURA_COMPUTADOR : LARGURA_CELULAR;
  const s = Math.min(1, disponivelL / largura);
  iframe.style.width = `${largura}px`;
  iframe.style.height = `${disponivelA / s}px`;
  iframe.style.transform = s < 1 ? `scale(${s})` : "";
  escala.style.width = `${largura * s}px`;
  escala.style.height = `${disponivelA}px`;
}
new ResizeObserver(ajustarEscala).observe(moldura);
window.addEventListener("resize", ajustarEscala);

/** Lê as vitrines do próprio site. @type {import("../ferramentas/novo-cliente/montar.mjs").Leitor} */
const leitor = {
  async lerTexto(caminho) {
    return (await buscar(caminho)).text();
  },
  async lerBytes(caminho) {
    return new Uint8Array(await (await buscar(caminho)).arrayBuffer());
  },
};

/** @param {string} caminho */
async function buscar(caminho) {
  const resposta = await fetch(new URL(caminho, RAIZ));
  if (!resposta.ok) throw new Error(`Arquivo não encontrado: ${caminho}.`);
  return resposta;
}

// ---------- Formulário ----------

/** @param {string} nome */
const campo = (nome) => /** @type {HTMLInputElement | HTMLSelectElement | null} */ (form.elements.namedItem(nome));
/** @param {string} nome */
const valor = (nome) => {
  const el = form.elements.namedItem(nome);
  if (el instanceof RadioNodeList) return el.value;
  return el && "value" in el ? String(el.value).trim() : "";
};

/** Mostra só os campos do modelo escolhido. */
function ajustarCampos() {
  const perguntas = MODELOS[valor("modelo")].perguntas;
  for (const bloco of /** @type {NodeListOf<HTMLElement>} */ (form.querySelectorAll(".campo[data-campo]"))) {
    bloco.hidden = !perguntas.includes(/** @type {any} */ (bloco.dataset.campo));
  }
}

/** @param {string} nome @param {string} mensagem */
function marcarErro(nome, mensagem) {
  const saida = document.getElementById(`erro-${nome}`);
  if (saida) saida.textContent = mensagem;
  campo(nome)?.setAttribute("aria-invalid", mensagem ? "true" : "false");
}

/**
 * Lê e valida o formulário. Devolve os dados ou null (com os erros marcados).
 * @returns {DadosCliente | null}
 */
function lerDados() {
  const modelo = /** @type {DadosCliente["modelo"]} */ (valor("modelo"));
  const perguntas = MODELOS[modelo].perguntas;
  /** @type {Record<string, string>} */
  const erros = {};
  /** @param {string} nome @param {() => any} fazer */
  const tentar = (nome, fazer) => {
    try {
      return fazer();
    } catch (e) {
      erros[nome] = /** @type {Error} */ (e).message;
      return undefined;
    }
  };
  const obrigatorio = (/** @type {string} */ nome, /** @type {string} */ texto) => {
    if (!valor(nome)) erros[nome] = texto;
    return valor(nome);
  };
  const artigo = (/** @type {string} */ nome) => /** @type {"a" | "o"} */ (valor(`${nome}-artigo`) === "o" ? "o" : "a");

  /** @type {DadosCliente} */
  const dados = {
    modelo,
    versao: valor("versao") === "completo" ? "completo" : "lp",
    nome: { artigo: artigo("nome"), nome: obrigatorio("nome", "Escreva o nome do negócio.") },
    whatsapp: valor("whatsapp") ? tentar("whatsapp", () => normalizarWhatsapp(valor("whatsapp"))) : (erros.whatsapp = "Informe o WhatsApp com DDD."),
  };
  if (perguntas.includes("profissional")) dados.profissional = { artigo: artigo("profissional"), nome: obrigatorio("profissional", "Escreva o nome do profissional.") };
  if (perguntas.includes("bairro")) dados.bairro = { artigo: artigo("bairro"), nome: obrigatorio("bairro", "Escreva o bairro.") };
  if (perguntas.includes("cidade") && valor("cidade")) dados.cidade = valor("cidade");
  if (perguntas.includes("endereco") && valor("endereco")) dados.endereco = valor("endereco");
  if (perguntas.includes("email") && valor("email")) dados.email = tentar("email", () => normalizarEmail(valor("email")));
  if (valor("dominio")) dados.dominio = tentar("dominio", () => normalizarDominio(valor("dominio")));

  for (const nome of ["nome", "profissional", "whatsapp", "email", "bairro", "dominio"]) marcarErro(nome, erros[nome] ?? "");
  const primeiro = Object.keys(erros)[0];
  if (primeiro) {
    campo(primeiro)?.focus();
    return null;
  }
  return dados;
}

/** Guarda o que foi digitado, para não perder ao recarregar a página. */
function lembrar() {
  try {
    /** @type {Record<string, string>} */
    const salvo = {};
    for (const el of form.elements) {
      const e = /** @type {HTMLInputElement} */ (el);
      if (!e.name) continue;
      if (e.type === "radio") { if (e.checked) salvo[e.name] = e.value; } else salvo[e.name] = e.value;
    }
    localStorage.setItem(MEMORIA, JSON.stringify(salvo));
  } catch { /* sem armazenamento: tudo bem */ }
}

function restaurar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(MEMORIA) || "{}");
    for (const el of form.elements) {
      const e = /** @type {HTMLInputElement} */ (el);
      if (!e.name || !(e.name in salvo)) continue;
      if (e.type === "radio") e.checked = e.value === salvo[e.name];
      else e.value = salvo[e.name];
    }
  } catch { /* nada salvo */ }
}

// ---------- Prévia ----------

/** @type {string[]} */
let urlsDaPrevia = [];
/** @type {Record<string, string>} */
let paginasDaPrevia = {};
/** @type {SiteMontado | null} */
let ultimoSite = null;

const TIPOS = /** @type {Record<string, string>} */ ({
  css: "text/css", js: "text/javascript", woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml", gif: "image/gif", txt: "text/plain",
});

/**
 * Transforma os arquivos gerados em endereços blob: para a prévia funcionar sem servidor.
 * @param {Map<string, string | Uint8Array>} arquivos
 */
function prepararPrevia(arquivos) {
  for (const u of urlsDaPrevia) URL.revokeObjectURL(u);
  urlsDaPrevia = [];
  /** @type {Map<string, string>} */
  const urls = new Map();
  const criar = (/** @type {string} */ caminho, /** @type {BlobPart} */ conteudo) => {
    const ext = caminho.split(".").pop() ?? "";
    const url = URL.createObjectURL(new Blob([conteudo], { type: TIPOS[ext] ?? "application/octet-stream" }));
    urlsDaPrevia.push(url);
    urls.set(caminho, url);
  };
  // Primeiro fontes, imagens e scripts; depois o CSS, que aponta para as fontes
  for (const [caminho, conteudo] of arquivos) {
    if (caminho.startsWith("assets/") && !caminho.endsWith(".css")) criar(caminho, /** @type {BlobPart} */ (conteudo));
  }
  for (const [caminho, conteudo] of arquivos) {
    if (!caminho.startsWith("assets/") || !caminho.endsWith(".css")) continue;
    const css = String(conteudo).replace(/url\((["']?)([^"')]+)\1\)/g, (inteiro, aspas, ref) => {
      const url = urls.get(join(dirname(caminho), ref));
      return url ? `url(${aspas}${url}${aspas})` : inteiro;
    });
    criar(caminho, css);
  }
  paginasDaPrevia = {};
  for (const [caminho, conteudo] of arquivos) {
    if (!caminho.endsWith(".html")) continue;
    paginasDaPrevia[caminho] = String(conteudo).replace(/(href|src)="(assets\/[^"#?]+)"/g, (inteiro, attr, ref) => {
      const url = urls.get(ref);
      return url ? `${attr}="${url}"` : inteiro;
    });
  }
}

/** @param {string} pagina @param {string} [ancora] */
function mostrarPagina(pagina, ancora) {
  const html = paginasDaPrevia[pagina];
  if (!html) return;
  iframe.hidden = false;
  vazia.hidden = true;
  ajustarEscala();
  iframe.onload = () => {
    const doc = iframe.contentDocument;
    if (!doc) return;
    // Links entre páginas do site do cliente trocam a página da prévia
    doc.addEventListener("click", (e) => {
      const a = /** @type {HTMLElement} */ (e.target).closest?.("a[href]");
      if (!a) return;
      const [destino, hash] = (a.getAttribute("href") ?? "").split("#");
      if (destino && paginasDaPrevia[destino]) {
        e.preventDefault();
        mostrarPagina(destino, hash);
      }
    });
    if (ancora) doc.getElementById(ancora)?.scrollIntoView();
  };
  iframe.srcdoc = html;
  for (const b of abas.querySelectorAll("button")) b.setAttribute("aria-selected", String(b.dataset.pagina === pagina));
}

/**
 * Uma aba por página, com o nome que aparece no menu do próprio site.
 * @param {string[]} paginas
 */
function criarAbas(paginas) {
  const inicio = new DOMParser().parseFromString(paginasDaPrevia["index.html"] ?? "", "text/html");
  const nomeNoMenu = (/** @type {string} */ p) => inicio.querySelector(`.nav nav a[href="${p}"]`)?.textContent?.trim();
  abas.replaceChildren(...paginas.map((p) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.dataset.pagina = p;
    b.textContent = nomeNoMenu(p) ?? (p === "index.html" ? "Início" : p.replace(".html", "").replace(/-/g, " "));
    b.addEventListener("click", () => mostrarPagina(p));
    return b;
  }));
}

/** @param {SiteMontado} site @param {DadosCliente} dados */
function mostrarResultado(site, dados) {
  resultado.hidden = false;
  const qtd = [...site.arquivos.keys()].filter((c) => c.startsWith("assets/")).length;
  resumo.textContent =
    `${site.paginas.length === 1 ? "1 página" : `${site.paginas.length} páginas`} e ${qtd} arquivos · ` +
    `WhatsApp ${formatarTelefone(dados.whatsapp)} · projeto "${site.slug}" na Cloudflare.`;
  listaPendencias.replaceChildren(...(site.pendencias.length
    ? site.pendencias.map((p) => {
      const li = document.createElement("li");
      const onde = document.createElement("code");
      onde.textContent = `${p.arquivo}:${p.linha}`;
      const motivo = document.createElement("strong");
      motivo.textContent = ` ${p.motivo}: `;
      li.append(onde, motivo, p.trecho);
      return li;
    })
    : [Object.assign(document.createElement("li"), { textContent: "Nada encontrado." })]));
}

// ---------- Ações ----------

form.addEventListener("change", () => {
  ajustarCampos();
  lembrar();
});
form.addEventListener("input", lembrar);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const dados = lerDados();
  if (!dados) {
    status.textContent = "Confira os campos marcados.";
    return;
  }
  botaoGerar.disabled = true;
  status.textContent = "Gerando...";
  try {
    const site = await montarSite(dados, leitor);
    ultimoSite = site;
    prepararPrevia(site.arquivos);
    criarAbas(site.paginas);
    mostrarPagina("index.html");
    mostrarResultado(site, dados);
    status.textContent = "Prévia pronta. Confira as páginas e baixe o .zip.";
  } catch (erro) {
    status.textContent = "Não deu certo: " + /** @type {Error} */ (erro).message;
  } finally {
    botaoGerar.disabled = false;
  }
});

botaoBaixar.addEventListener("click", () => {
  if (!ultimoSite) return;
  const zip = criarZip(ultimoSite.arquivos, { pasta: ultimoSite.slug });
  const url = URL.createObjectURL(new Blob([/** @type {BlobPart} */ (zip)], { type: "application/zip" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ultimoSite.slug}.zip`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  status.textContent = `Baixado: ${ultimoSite.slug}.zip`;
});

for (const b of /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll(".previa-tamanho button"))) {
  b.addEventListener("click", () => {
    moldura.dataset.tamanho = b.dataset.tamanho;
    ajustarEscala();
    for (const outro of document.querySelectorAll(".previa-tamanho button")) outro.setAttribute("aria-pressed", String(outro === b));
  });
}

restaurar();
ajustarCampos();
