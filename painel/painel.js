// @ts-check
// Painel "novo cliente": a mesma ferramenta do terminal, com formulário e prévia.
// Lê as vitrines do próprio site, monta o site do cliente no navegador e entrega um .zip.

import { montarLeiaMe, montarSite, procurarPendencias } from "../ferramentas/novo-cliente/montar.mjs";
import { MODELOS } from "../ferramentas/novo-cliente/modelos.mjs";
import { formatarTelefone, normalizarDominio, normalizarEmail, normalizarWhatsapp } from "../ferramentas/novo-cliente/entrada.mjs";
import { dirname, join } from "../ferramentas/novo-cliente/caminhos.mjs";
import { criarZip } from "./zip.mjs";
import { aplicarCores, aplicarTextos, contraste, lerCores, limparConteudo, marcarEditaveis } from "./edicao.mjs";

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
const botaoEditar = /** @type {HTMLButtonElement} */ (document.getElementById("botao-editar"));
const botaoApresentar = /** @type {HTMLButtonElement} */ (document.getElementById("botao-apresentar"));
const listaCores = /** @type {HTMLElement} */ (document.getElementById("cores"));
const avisoContraste = /** @type {HTMLElement} */ (document.getElementById("contraste"));
const botaoRestaurarCores = /** @type {HTMLButtonElement} */ (document.getElementById("botao-restaurar-cores"));

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

// ---------- Estado da prévia ----------

/**
 * @typedef {{
 *   site: SiteMontado,
 *   dados: DadosCliente,
 *   fontes: Record<string, string>,
 *   coresOriginais: { nome: string, valor: string }[],
 *   cores: Map<string, string>,
 *   editado: boolean,
 *   pagina: string,
 * }} Estado
 */
/** @type {Estado | null} */
let estado = null;
let modoEdicao = false;
/** @type {Map<string, string>} caminho do arquivo no site do cliente → endereço blob: da prévia */
let urlsDosArquivos = new Map();

const TIPOS = /** @type {Record<string, string>} */ ({
  css: "text/css", js: "text/javascript", woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml", gif: "image/gif", txt: "text/plain",
});

/** Estilo que só existe na prévia: destaque dos textos editáveis. */
const ESTILO_DA_PREVIA = `<style id="pv-estilo">
  body.pv-editando [data-pv] { cursor: text; }
  body.pv-editando [data-pv]:hover { outline: 2px dashed #00B8D9; outline-offset: 3px; }
  [data-pv][contenteditable="true"] { outline: 2px solid #00B8D9; outline-offset: 3px; background: rgba(0, 216, 255, 0.10); }
</style>`;

/**
 * Cria endereços blob: para CSS, JS, fontes e imagens, para a prévia funcionar sem servidor.
 * @param {Map<string, string | Uint8Array>} arquivos
 */
function prepararArquivos(arquivos) {
  for (const u of urlsDosArquivos.values()) URL.revokeObjectURL(u);
  urlsDosArquivos = new Map();
  const criar = (/** @type {string} */ caminho, /** @type {BlobPart} */ conteudo) => {
    const ext = caminho.split(".").pop() ?? "";
    urlsDosArquivos.set(caminho, URL.createObjectURL(new Blob([conteudo], { type: TIPOS[ext] ?? "application/octet-stream" })));
  };
  // Primeiro fontes, imagens e scripts; depois o CSS, que aponta para as fontes
  for (const [caminho, conteudo] of arquivos) {
    if (caminho.startsWith("assets/") && !caminho.endsWith(".css")) criar(caminho, /** @type {BlobPart} */ (conteudo));
  }
  for (const [caminho, conteudo] of arquivos) {
    if (!caminho.startsWith("assets/") || !caminho.endsWith(".css")) continue;
    criar(caminho, String(conteudo).replace(/url\((["']?)([^"')]+)\1\)/g, (inteiro, aspas, ref) => {
      const url = urlsDosArquivos.get(join(dirname(caminho), ref));
      return url ? `url(${aspas}${url}${aspas})` : inteiro;
    }));
  }
}

/** HTML de uma página para a prévia: textos marcados para edição e arquivos via blob:. @param {string} pagina */
function htmlDaPrevia(pagina) {
  if (!estado) return "";
  return marcarEditaveis(estado.fontes[pagina]).html
    .replace(/(href|src)="(assets\/[^"#?]+)"/g, (inteiro, attr, ref) => {
      const url = urlsDosArquivos.get(ref);
      return url ? `${attr}="${url}"` : inteiro;
    })
    .replace("</head>", `${ESTILO_DA_PREVIA}\n</head>`);
}

/** @param {string} pagina @param {string} [ancora] */
function mostrarPagina(pagina, ancora) {
  if (!estado || !(pagina in estado.fontes)) return;
  estado.pagina = pagina;
  iframe.hidden = false;
  vazia.hidden = true;
  ajustarEscala();
  iframe.onload = () => {
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.body.classList.toggle("pv-editando", modoEdicao);
    pintarCores(doc);
    doc.addEventListener("click", (e) => {
      const alvo = /** @type {HTMLElement} */ (e.target);
      const editavel = /** @type {HTMLElement | null} */ (alvo.closest?.("[data-pv]"));
      if (modoEdicao && editavel) {
        e.preventDefault();
        e.stopPropagation();
        editar(editavel, pagina);
        return;
      }
      const a = alvo.closest?.("a[href]");
      if (!a) return;
      const [destino, hash] = (a.getAttribute("href") ?? "").split("#");
      if (destino && estado && destino in estado.fontes) {
        // Links entre páginas do site do cliente trocam a página da prévia
        e.preventDefault();
        mostrarPagina(destino, hash);
      } else if (modoEdicao && destino) {
        e.preventDefault(); // editando: não abre WhatsApp nem links externos
        e.stopPropagation();
      }
    }, true);
    if (ancora) doc.getElementById(ancora)?.scrollIntoView();
  };
  iframe.srcdoc = htmlDaPrevia(pagina);
  for (const b of abas.querySelectorAll("button")) b.setAttribute("aria-selected", String(b.dataset.pagina === pagina));
}

/**
 * Edita um texto da prévia no próprio lugar. Enter salva, Esc desfaz.
 * @param {HTMLElement} el
 * @param {string} pagina
 */
function editar(el, pagina) {
  if (el.isContentEditable) return;
  const antes = el.innerHTML;
  let desfazer = false;
  el.contentEditable = "true";
  el.focus();
  const teclas = (/** @type {KeyboardEvent} */ e) => {
    if (e.key === "Enter") { e.preventDefault(); el.blur(); }
    if (e.key === "Escape") { desfazer = true; el.blur(); }
  };
  el.addEventListener("keydown", teclas);
  el.addEventListener("blur", () => {
    el.removeEventListener("keydown", teclas);
    el.contentEditable = "false";
    if (desfazer || el.innerHTML === antes || !estado) {
      el.innerHTML = antes;
      return;
    }
    const conteudo = limparConteudo(el);
    el.innerHTML = conteudo;
    estado.fontes[pagina] = aplicarTextos(estado.fontes[pagina], new Map([[Number(el.dataset.pv), conteudo]]));
    estado.editado = true;
    atualizarPendencias();
    status.textContent = "Texto alterado. Ele vai assim no .zip.";
  }, { once: true });
}

// ---------- Cores ----------

/** Aplica as cores escolhidas na página da prévia. @param {Document} doc */
function pintarCores(doc) {
  if (!estado) return;
  for (const [nome, valor] of estado.cores) doc.documentElement.style.setProperty(nome, valor);
}

/** @param {string} nome */
function corAtual(nome) {
  if (!estado) return undefined;
  return estado.cores.get(nome) ?? estado.coresOriginais.find((c) => c.nome === nome)?.valor;
}

function mostrarContraste() {
  const texto = ["--texto", "--tinta"].map(corAtual).find(Boolean);
  const fundo = corAtual("--fundo");
  if (!texto || !fundo) {
    avisoContraste.textContent = "";
    return;
  }
  const valor = contraste(texto, fundo);
  const numero = valor.toFixed(1).replace(".", ",");
  avisoContraste.textContent = valor >= 4.5
    ? `Contraste entre texto e fundo: ${numero}:1 (bom).`
    : `Atenção: contraste entre texto e fundo de ${numero}:1. Para ler bem, o mínimo é 4,5:1.`;
  avisoContraste.classList.toggle("ruim", valor < 4.5);
}

function criarPaleta() {
  if (!estado) return;
  listaCores.replaceChildren(...estado.coresOriginais.map(({ nome, valor }) => {
    const rotulo = document.createElement("label");
    rotulo.className = "cor";
    const entrada = document.createElement("input");
    entrada.type = "color";
    entrada.value = valor.toLowerCase();
    entrada.dataset.cor = nome;
    entrada.addEventListener("input", () => {
      if (!estado) return;
      estado.cores.set(nome, entrada.value.toUpperCase());
      estado.editado = true;
      const doc = iframe.contentDocument;
      if (doc) doc.documentElement.style.setProperty(nome, entrada.value);
      mostrarContraste();
    });
    const nomeVisivel = document.createElement("span");
    nomeVisivel.textContent = nome.replace(/^--/, "").replace(/-/g, " ");
    rotulo.append(entrada, nomeVisivel);
    return rotulo;
  }));
  mostrarContraste();
}

botaoRestaurarCores.addEventListener("click", () => {
  if (!estado) return;
  const doc = iframe.contentDocument;
  for (const nome of estado.cores.keys()) doc?.documentElement.style.removeProperty(nome);
  estado.cores.clear();
  criarPaleta();
});

// ---------- Resultado ----------

/** @param {string[]} paginas */
function criarAbas(paginas) {
  const inicio = new DOMParser().parseFromString(estado?.fontes["index.html"] ?? "", "text/html");
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

function atualizarPendencias() {
  if (!estado) return;
  estado.site.pendencias = procurarPendencias(estado.fontes, estado.dados);
  const pendencias = estado.site.pendencias;
  listaPendencias.replaceChildren(...(pendencias.length
    ? pendencias.map((p) => {
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

function mostrarResultado() {
  if (!estado) return;
  resultado.hidden = false;
  const qtd = [...estado.site.arquivos.keys()].filter((c) => c.startsWith("assets/")).length;
  resumo.textContent =
    `${estado.site.paginas.length === 1 ? "1 página" : `${estado.site.paginas.length} páginas`} e ${qtd} arquivos · ` +
    `WhatsApp ${formatarTelefone(estado.dados.whatsapp)} · projeto "${estado.site.slug}" na Cloudflare.`;
  atualizarPendencias();
  criarPaleta();
}

/** O site com tudo o que foi editado na prévia: textos, cores e o LEIA-ME atualizado. */
function arquivosFinais() {
  if (!estado) return new Map();
  const arquivos = new Map(estado.site.arquivos);
  for (const [pagina, html] of Object.entries(estado.fontes)) arquivos.set(pagina, html);
  const css = arquivos.get("assets/css/style.css");
  if (estado.cores.size && typeof css === "string") arquivos.set("assets/css/style.css", aplicarCores(css, estado.cores));
  arquivos.set("LEIA-ME.md", montarLeiaMe(estado.dados, { slug: estado.site.slug, paginas: estado.site.paginas, pendencias: estado.site.pendencias }));
  return arquivos;
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
  if (estado?.editado && !confirm("Gerar de novo apaga os textos e as cores alterados na prévia. Continuar?")) return;
  botaoGerar.disabled = true;
  status.textContent = "Gerando...";
  try {
    const site = await montarSite(dados, leitor);
    const css = site.arquivos.get("assets/css/style.css");
    estado = {
      site,
      dados,
      fontes: Object.fromEntries(site.paginas.map((p) => [p, String(site.arquivos.get(p))])),
      coresOriginais: lerCores(typeof css === "string" ? css : ""),
      cores: new Map(),
      editado: false,
      pagina: "index.html",
    };
    prepararArquivos(site.arquivos);
    criarAbas(site.paginas);
    mostrarPagina("index.html");
    mostrarResultado();
    status.textContent = "Prévia pronta. Clique em \"Editar textos\" para mudar o que quiser direto na página.";
  } catch (erro) {
    status.textContent = "Não deu certo: " + /** @type {Error} */ (erro).message;
  } finally {
    botaoGerar.disabled = false;
  }
});

botaoBaixar.addEventListener("click", () => {
  if (!estado) return;
  const zip = criarZip(arquivosFinais(), { pasta: estado.site.slug });
  const url = URL.createObjectURL(new Blob([/** @type {BlobPart} */ (zip)], { type: "application/zip" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${estado.site.slug}.zip`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  status.textContent = `Baixado: ${estado.site.slug}.zip`;
});

botaoEditar.addEventListener("click", () => {
  modoEdicao = !modoEdicao;
  botaoEditar.setAttribute("aria-pressed", String(modoEdicao));
  iframe.contentDocument?.body.classList.toggle("pv-editando", modoEdicao);
  status.textContent = modoEdicao
    ? "Clique num texto da prévia para editar. Enter salva, Esc desfaz."
    : "Edição desligada: os botões e links da prévia voltam a funcionar.";
});

botaoApresentar.addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else moldura.requestFullscreen?.();
});

for (const b of /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll(".previa-tamanho button[data-tamanho]"))) {
  b.addEventListener("click", () => {
    moldura.dataset.tamanho = b.dataset.tamanho;
    ajustarEscala();
    for (const outro of document.querySelectorAll(".previa-tamanho button[data-tamanho]")) outro.setAttribute("aria-pressed", String(outro === b));
  });
}

restaurar();
ajustarCampos();
