// @ts-check
// Transforma uma vitrine (modelos/...) em site de cliente, numa pasta nova.

import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MODELOS, SINAIS_DE_DEMONSTRACAO, SO_DEMONSTRACAO } from "./modelos.mjs";
import { criarSlug, formatarTelefone, iniciais } from "./entrada.mjs";
import { substituirNomes } from "./texto.mjs";
import {
  acrescentarAtributos, aplicarEdicoes, atributo, lerHtml, percorrer,
  remover, removerAtributo, trocarAtributo,
} from "./html.mjs";

/**
 * @typedef {import("./entrada.mjs").NomeComArtigo} NomeComArtigo
 * @typedef {import("./entrada.mjs").Artigo} Artigo
 * @typedef {import("./html.mjs").Edicao} Edicao
 * @typedef {import("./html.mjs").No} No
 * @typedef {{ artigo: Artigo, nome: string }} NomeDefinido
 * @typedef {{
 *   modelo: "barbearia" | "consultoria" | "petshop",
 *   versao: "lp" | "completo",
 *   nome: NomeDefinido,
 *   whatsapp: string,
 *   cidade?: string,
 *   bairro?: NomeDefinido,
 *   endereco?: string,
 *   profissional?: NomeDefinido,
 *   email?: string,
 *   dominio?: string,
 *   saida: string,
 *   hoje?: string,
 * }} Pedido
 * @typedef {{ arquivo: string, linha: number, trecho: string, motivo: string }} Pendencia
 * @typedef {{ pasta: string, slug: string, paginas: string[], arquivos: string[], pendencias: Pendencia[] }} Resultado
 */

/** Raiz do repositório das vitrines. */
export const RAIZ_REPO = fileURLToPath(new URL("../../", import.meta.url));

const ARQUIVOS_DA_FERRAMENTA = fileURLToPath(new URL("./arquivos/", import.meta.url));

/** Para onde vai cada tipo de arquivo no site do cliente. */
const PASTA_POR_EXTENSAO = /** @type {Record<string, string>} */ ({
  ".css": "assets/css",
  ".js": "assets/js",
  ".woff2": "assets/fonts",
  ".woff": "assets/fonts",
  ".ttf": "assets/fonts",
  ".png": "assets/img",
  ".jpg": "assets/img",
  ".jpeg": "assets/img",
  ".webp": "assets/img",
  ".svg": "assets/img",
  ".gif": "assets/img",
  ".ico": "assets/img",
});

/** @param {string} valor */
function ehLocal(valor) {
  return !!valor && !/^([a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(valor);
}

/**
 * Separa "pagina.html#secao" em caminho e resto ("#secao" ou "?x=1").
 * @param {string} valor
 */
function separarCaminho(valor) {
  const i = valor.search(/[?#]/);
  return i < 0 ? { caminho: valor, resto: "" } : { caminho: valor.slice(0, i), resto: valor.slice(i) };
}

/** Pasta da vitrine dentro do repositório. */
/** @param {Pedido} pedido */
export function pastaDaVitrine(pedido) {
  return `modelos/${pedido.modelo}${pedido.versao === "completo" ? "-completo" : ""}`;
}

/** Link do WhatsApp com a mensagem pronta. */
/** @param {string} numero @param {string} [mensagem] */
export function linkWhats(numero, mensagem) {
  return `https://wa.me/${numero}${mensagem ? "?text=" + encodeURIComponent(mensagem) : ""}`;
}

/**
 * Regras de troca dos dados fictícios pelos do cliente, na ordem certa.
 * @param {Pedido} pedido
 * @returns {import("./texto.mjs").Regra[]}
 */
export function regrasDeIdentidade(pedido) {
  const m = MODELOS[pedido.modelo];
  /** @type {import("./texto.mjs").Regra[]} */
  const regras = [];
  if (m.endereco && m.bairro && pedido.endereco && pedido.bairro) {
    regras.push({ antigo: `${m.endereco}, ${m.bairro}`, novo: `${pedido.endereco}, ${pedido.bairro.nome}` });
  }
  regras.push({ antigo: m.nome.completo, novo: pedido.nome.nome, artigo: pedido.nome.artigo });
  if (m.nome.curto !== m.nome.completo) regras.push({ antigo: m.nome.curto, novo: pedido.nome.nome, artigo: pedido.nome.artigo });
  // Nome em maiúsculas (ex.: o texto em círculo do selo da barbearia)
  regras.push({ antigo: m.nome.curto.toUpperCase(), novo: pedido.nome.nome.toUpperCase() });
  if (m.profissional && pedido.profissional) {
    const primeiro = pedido.profissional.nome.split(/\s+/)[0];
    regras.push({ antigo: m.profissional.completo, novo: pedido.profissional.nome, artigo: pedido.profissional.artigo });
    regras.push({ antigo: m.profissional.primeiro, novo: primeiro, artigo: pedido.profissional.artigo });
  }
  if (m.bairro && pedido.bairro) regras.push({ antigo: m.bairro, novo: pedido.bairro.nome, artigo: pedido.bairro.artigo });
  if (m.email && pedido.email) regras.push({ antigo: m.email, novo: pedido.email });
  return regras;
}

/**
 * Troca nomes, endereço, bairro, e-mail e iniciais; tira o aviso de negócio fictício.
 * @param {string} html
 * @param {Pedido} pedido
 */
export function trocarIdentidade(html, pedido) {
  let resultado = substituirNomes(html, regrasDeIdentidade(pedido));
  resultado = resultado.replace(/ · negócio fictício para demonstração/g, "");
  const m = MODELOS[pedido.modelo];
  if (m.profissional && pedido.profissional) {
    const novas = iniciais(pedido.profissional.nome);
    resultado = resultado.replace(new RegExp(`>${m.profissional.iniciais}<`, "g"), `>${novas}<`);
  }
  return resultado;
}

/**
 * A landing page da vitrine tem título e descrição de demonstração ("Modelo de...").
 * O cliente recebe o título e a descrição da página inicial do site completo do mesmo modelo.
 * @param {string} html
 * @param {import("./modelos.mjs").Modelo} modelo
 */
export function trocarSeoDaLandingPage(html, modelo) {
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${modelo.seoLandingPage.titulo}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${modelo.seoLandingPage.descricao}$2`);
}

/**
 * Ajusta uma página: tira a camada de demonstração, aponta os arquivos para
 * assets/, transforma data-whats em links do WhatsApp e tira o noindex.
 * @param {string} html
 * @param {{ paginaRepo: string, numero: string, paginasDaVitrine: Set<string>, planejar: (origemRepo: string) => string }} contexto
 *   planejar: registra um arquivo para copiar e devolve o caminho dele no site do cliente
 * @returns {string}
 */
export function transformarPagina(html, contexto) {
  const documento = lerHtml(html);
  const pastaPagina = path.posix.dirname(contexto.paginaRepo);
  /** @type {Edicao[]} */
  const edicoes = [];

  /** @param {string} valor */
  const resolver = (valor) => path.posix.normalize(path.posix.join(pastaPagina, separarCaminho(valor).caminho));

  percorrer(documento, (no) => {
    const pos = no.sourceCodeLocation;
    if (!pos) return;

    // Comentários que só fazem sentido na vitrine
    if (no.nodeName === "#comment" && /Faixa de demonstração|Modelo fictício/.test(no.data ?? "")) {
      edicoes.push(remover(html, pos));
      return;
    }
    if (!no.tagName) return;
    const tag = no.tagName;

    // Página de cliente deve aparecer no Google
    if (tag === "meta" && atributo(no, "name") === "robots" && /noindex/.test(atributo(no, "content") ?? "")) {
      edicoes.push(remover(html, pos));
      return;
    }

    if (tag === "body") {
      for (const nome of ["data-modelo", "data-plano"]) if (atributo(no, nome) !== undefined) edicoes.push(removerAtributo(html, no, nome));
      return;
    }

    // CSS, scripts, fontes e imagens
    const nomeAttr = tag === "link" || (tag === "a" && atributo(no, "data-whats") === undefined) ? "href" : tag === "script" || tag === "img" || tag === "source" ? "src" : null;
    const valor = nomeAttr ? atributo(no, nomeAttr) : undefined;
    if (nomeAttr && valor && ehLocal(valor)) {
      const origem = resolver(valor);
      if (SO_DEMONSTRACAO.includes(origem)) {
        if (origem.endsWith("demo.js")) {
          // O lugar do demo.js passa a ser do whats.js (mesma função enviarWhats, agora de verdade)
          edicoes.push({ inicio: pos.startOffset, fim: pos.endOffset, texto: '<script src="assets/js/whats.js" defer></script>' });
        } else {
          edicoes.push(remover(html, pos));
        }
        return;
      }
      if (origem.endsWith(".html")) {
        if (!contexto.paginasDaVitrine.has(origem)) {
          throw new Error(`${contexto.paginaRepo}: link para fora da vitrine (${valor}).`);
        }
        const novo = path.posix.basename(origem) + separarCaminho(valor).resto;
        if (novo !== valor) edicoes.push(trocarAtributo(no, nomeAttr, novo));
        return;
      }
      const destino = contexto.planejar(origem);
      const novo = destino + separarCaminho(valor).resto;
      if (novo !== valor) edicoes.push(trocarAtributo(no, nomeAttr, novo));
    }

    // Botões de WhatsApp: link de verdade (funciona sem JavaScript)
    const mensagem = atributo(no, "data-whats");
    if (tag === "a" && mensagem !== undefined) {
      const link = linkWhats(contexto.numero, mensagem);
      if (atributo(no, "href") !== undefined) edicoes.push(trocarAtributo(no, "href", link));
      const extras = (atributo(no, "target") === undefined ? ' target="_blank"' : "") + (atributo(no, "rel") === undefined ? ' rel="noopener"' : "");
      if (atributo(no, "href") === undefined) edicoes.push(acrescentarAtributos(html, no, ` href="${link}"${extras}`));
      else if (extras) edicoes.push(acrescentarAtributos(html, no, extras));
    }
  });

  return aplicarEdicoes(html, edicoes);
}

/**
 * Reescreve os url(...) de um CSS para a nova estrutura de pastas.
 * @param {string} css
 * @param {{ origemRepo: string, destino: string, planejar: (origemRepo: string) => string }} contexto
 */
export function transformarCss(css, contexto) {
  const pastaOrigem = path.posix.dirname(contexto.origemRepo);
  const pastaDestino = path.posix.dirname(contexto.destino);
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (inteiro, aspas, valor) => {
    if (!ehLocal(valor)) return inteiro;
    const { caminho, resto } = separarCaminho(valor);
    const origem = path.posix.normalize(path.posix.join(pastaOrigem, caminho));
    const destino = contexto.planejar(origem);
    return `url(${aspas}${path.posix.relative(pastaDestino, destino)}${resto}${aspas})`;
  });
}

/**
 * Procura o que ainda é fictício ou de demonstração nas páginas geradas.
 * @param {Record<string, string>} paginas nome do arquivo → HTML
 * @param {Pedido} pedido
 * @returns {Pendencia[]}
 */
export function procurarPendencias(paginas, pedido) {
  const m = MODELOS[pedido.modelo];
  // Da mais específica para a mais geral: cada linha entra uma vez, com o primeiro motivo que bater
  /** @type {{ padrao: RegExp, motivo: string }[]} */
  const regras = [];
  if (m.endereco && !pedido.endereco) regras.push({ padrao: new RegExp(m.endereco), motivo: "endereço de exemplo" });
  if (m.email && !pedido.email) regras.push({ padrao: new RegExp(m.email.replace(/[.]/g, "\\.")), motivo: "e-mail de exemplo" });
  regras.push(
    ...m.ficticios.map((n) => ({ padrao: new RegExp(`(?<![\\p{L}])${n}(?![\\p{L}])`, "u"), motivo: `nome fictício (${n})` })),
    { padrao: /<figure class="foto/, motivo: "espaço de foto para preencher" },
    ...SINAIS_DE_DEMONSTRACAO.map((s) => ({ padrao: new RegExp(s.replace(/[.]/g, "\\."), "i"), motivo: "texto de demonstração" })),
  );
  for (const p of m.palavrasParaRevisar ?? []) regras.push({ padrao: new RegExp(`(?<![\\p{L}])${p}(?![\\p{L}])`, "iu"), motivo: `conferir profissão e gênero ("${p}")` });

  /** @type {Pendencia[]} */
  const pendencias = [];
  for (const [arquivo, html] of Object.entries(paginas)) {
    html.split("\n").forEach((linha, i) => {
      for (const r of regras) {
        if (r.padrao.test(linha)) {
          const trecho = linha.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
          pendencias.push({ arquivo, linha: i + 1, trecho, motivo: r.motivo });
          break;
        }
      }
    });
  }
  return pendencias;
}

/**
 * Gera o site do cliente na pasta pedido.saida.
 * @param {Pedido} pedido
 * @returns {Promise<Resultado>}
 */
export async function gerarSite(pedido) {
  const modelo = MODELOS[pedido.modelo];
  if (!modelo) throw new Error(`Modelo desconhecido: ${pedido.modelo}`);
  if (existsSync(pedido.saida) && readdirSync(pedido.saida).length > 0) {
    throw new Error(`A pasta ${pedido.saida} já existe e não está vazia.`);
  }

  const vitrine = pastaDaVitrine(pedido);
  const nomesPaginas = (await readdir(path.join(RAIZ_REPO, vitrine))).filter((f) => f.endsWith(".html")).sort();
  const paginasDaVitrine = new Set(nomesPaginas.map((f) => `${vitrine}/${f}`));

  /** @type {Map<string, string>} origem no repositório → destino no site do cliente */
  const plano = new Map();
  /** @param {string} origem */
  const planejar = (origem) => {
    const ja = plano.get(origem);
    if (ja) return ja;
    const pasta = PASTA_POR_EXTENSAO[path.posix.extname(origem).toLowerCase()];
    if (!pasta) throw new Error(`Não sei para onde copiar ${origem}.`);
    if (!existsSync(path.join(RAIZ_REPO, origem))) throw new Error(`Arquivo não encontrado: ${origem}.`);
    const destino = `${pasta}/${path.posix.basename(origem)}`;
    for (const [outraOrigem, outroDestino] of plano) {
      if (outroDestino === destino && outraOrigem !== origem) throw new Error(`Dois arquivos iriam para ${destino}: ${outraOrigem} e ${origem}.`);
    }
    plano.set(origem, destino);
    return destino;
  };

  // 1. Páginas
  /** @type {Record<string, string>} */
  const paginas = {};
  for (const nome of nomesPaginas) {
    const paginaRepo = `${vitrine}/${nome}`;
    let original = await readFile(path.join(RAIZ_REPO, paginaRepo), "utf8");
    if (pedido.versao === "lp") original = trocarSeoDaLandingPage(original, modelo);
    const comIdentidade = trocarIdentidade(original, pedido);
    paginas[nome] = transformarPagina(comIdentidade, { paginaRepo, numero: pedido.whatsapp, paginasDaVitrine, planejar });
  }

  // 2. Arquivos usados pelas páginas (o CSS pode puxar fontes, então percorre até não aparecer nada novo)
  /** @type {Map<string, string>} destino → conteúdo transformado */
  const textos = new Map();
  for (let mudou = true; mudou; ) {
    mudou = false;
    for (const [origem, destino] of [...plano]) {
      if (!origem.endsWith(".css") || textos.has(destino)) continue;
      const css = await readFile(path.join(RAIZ_REPO, origem), "utf8");
      textos.set(destino, transformarCss(css, { origemRepo: origem, destino, planejar }));
      mudou = true;
    }
  }

  // 3. Escreve tudo
  await mkdir(pedido.saida, { recursive: true });
  for (const [nome, html] of Object.entries(paginas)) await writeFile(path.join(pedido.saida, nome), html);
  for (const [origem, destino] of plano) {
    await mkdir(path.join(pedido.saida, path.dirname(destino)), { recursive: true });
    const texto = textos.get(destino);
    if (texto !== undefined) await writeFile(path.join(pedido.saida, destino), texto);
    else await copyFile(path.join(RAIZ_REPO, origem), path.join(pedido.saida, destino));
  }
  if ([...plano.values()].some((d) => d.startsWith("assets/fonts/"))) {
    await copyFile(path.join(RAIZ_REPO, "assets/fonts/LICENCAS.txt"), path.join(pedido.saida, "assets/fonts/LICENCAS.txt"));
  }

  const whats = (await readFile(path.join(ARQUIVOS_DA_FERRAMENTA, "whats.js"), "utf8")).replace("__WHATSAPP__", pedido.whatsapp);
  await mkdir(path.join(pedido.saida, "assets/js"), { recursive: true });
  await writeFile(path.join(pedido.saida, "assets/js/whats.js"), whats);

  const slug = criarSlug(pedido.nome.nome);
  const hoje = pedido.hoje ?? new Date().toISOString().slice(0, 10);
  await writeFile(
    path.join(pedido.saida, "wrangler.jsonc"),
    `{\n  "name": "${slug}",\n  "compatibility_date": "${hoje}",\n  "assets": {\n    "directory": "./"\n  }\n}\n`,
  );
  await writeFile(path.join(pedido.saida, ".assetsignore"), [".git", "wrangler.jsonc", ".assetsignore", "LEIA-ME.md", ""].join("\n"));

  const pendencias = procurarPendencias(paginas, pedido);
  const resultado = {
    pasta: pedido.saida,
    slug,
    paginas: Object.keys(paginas),
    arquivos: [...plano.values(), "assets/js/whats.js"].sort(),
    pendencias,
  };
  await writeFile(path.join(pedido.saida, "LEIA-ME.md"), montarLeiaMe(pedido, resultado));
  return resultado;
}

/**
 * O roteiro do que falta, para quem continuar o site.
 * @param {Pedido} pedido
 * @param {Resultado} r
 */
export function montarLeiaMe(pedido, r) {
  const m = MODELOS[pedido.modelo];
  const dados = [
    `- **Negócio:** ${pedido.nome.artigo} ${pedido.nome.nome}`,
    pedido.profissional ? `- **Profissional:** ${pedido.profissional.artigo} ${pedido.profissional.nome}` : "",
    `- **WhatsApp:** ${formatarTelefone(pedido.whatsapp)} (\`${pedido.whatsapp}\`)`,
    pedido.email ? `- **E-mail:** ${pedido.email}` : "",
    pedido.cidade ? `- **Cidade:** ${pedido.cidade}` : "",
    pedido.bairro ? `- **Bairro:** ${pedido.bairro.artigo === "a" ? "na" : "no"} ${pedido.bairro.nome}` : "",
    pedido.endereco ? `- **Endereço:** ${pedido.endereco}` : "",
    `- **Domínio:** ${pedido.dominio || "a definir"}`,
    `- **Partiu de:** ${m.rotulo}, ${pedido.versao === "completo" ? "site completo (5 páginas)" : "landing page"}`,
  ].filter(Boolean);

  const pendencias = r.pendencias.length
    ? r.pendencias.map((p) => `- [ ] \`${p.arquivo}:${p.linha}\` · ${p.motivo}: "${p.trecho}"`).join("\n")
    : "Nenhuma. 🎉";

  return `# Site de ${pedido.nome.nome}

Gerado pela ferramenta \`novo-cliente\` a partir da vitrine ${m.rotulo.toLowerCase()} (${pedido.versao === "completo" ? "site completo" : "landing page"}).
Daqui em diante é HTML normal: edite direto.

## Dados do cliente
${dados.join("\n")}

## O que a ferramenta já fez
- Copiou ${r.paginas.length === 1 ? "a página e só os arquivos que ela usa" : `as ${r.paginas.length} páginas e só os arquivos que elas usam`}, em \`assets/\`.
- Tirou a camada de demonstração (faixa, janela de WhatsApp de mentira e \`noindex\`).
- Ligou todos os botões e formulários ao WhatsApp do cliente (\`assets/js/whats.js\`).
- Trocou nome, endereço e demais dados fictícios que ela conhece.
- Criou \`wrangler.jsonc\` (projeto \`${r.slug}\` na Cloudflare) e \`.assetsignore\`.

## Ainda fictício ou de exemplo (encontrado automaticamente)
${pendencias}

## Revisar à mão
${m.revisar.map((t) => `- [ ] ${t}`).join("\n")}
- [ ] Textos de venda de cada página, com as palavras que o cliente final busca (serviço + bairro + cidade)
- [ ] Títulos e descrições (\`<title>\` e \`meta description\`) de cada página
- [ ] Cores da marca: variáveis no topo de \`assets/css/style.css\` (conferir contraste depois)
- [ ] Favicon do cliente (\`assets/img/favicon.png\` + \`<link rel="icon">\` em cada página)

## Publicar
1. \`git init\`, primeiro commit e um repositório só deste cliente no GitHub (\`gh repo create\`).
2. Na Cloudflare: Workers & Pages → criar a partir do repositório (build vazio, deploy \`npx wrangler deploy\`).
3. Apontar o domínio${pedido.dominio ? ` ${pedido.dominio}` : ""} com o DNS na Cloudflare.
4. Itens do "Pronta pro Google" que ainda são manuais nesta versão da ferramenta: sitemap.xml, robots.txt, dados estruturados do negócio local, Search Console.
`;
}
