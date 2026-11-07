// Servidor estático mínimo para os testes, sem dependências.
// Imita o que a Cloudflare faz com o site:
//   - "/pasta/" serve "/pasta/index.html";
//   - endereço que não existe devolve 404 com a página 404.html;
//   - as regras do arquivo _redirects (endereço exato → destino, com código).
// Uso: node servidor.mjs  (porta 4173, ou PORTA=xxxx)

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORTA = Number(process.env.PORTA) || 4173;

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

// Arquivos que existem no repositório mas não são publicados (ver .assetsignore)
const ESCONDIDOS = ["/testes", "/.github", "/.git", "/.gitignore", "/wrangler.jsonc", "/.assetsignore", "/README.md", "/_redirects", "/_headers"];

async function lerRedirecionamentos() {
  try {
    const texto = await readFile(join(RAIZ, "_redirects"), "utf8");
    const regras = new Map();
    for (const linha of texto.split("\n")) {
      const limpa = linha.trim();
      if (!limpa || limpa.startsWith("#")) continue;
      const [de, para, codigo = "302"] = limpa.split(/\s+/);
      regras.set(de, { para, codigo: Number(codigo) });
    }
    return regras;
  } catch {
    return new Map();
  }
}

const redirecionamentos = await lerRedirecionamentos();

async function arquivo(caminho) {
  try {
    const info = await stat(caminho);
    if (info.isDirectory()) return arquivo(join(caminho, "index.html"));
    return caminho;
  } catch {
    return null;
  }
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const caminhoUrl = decodeURIComponent(url.pathname);

  const regra = redirecionamentos.get(caminhoUrl);
  if (regra) {
    res.writeHead(regra.codigo, { Location: regra.para });
    return res.end();
  }

  const escondido = ESCONDIDOS.some((p) => caminhoUrl === p || caminhoUrl.startsWith(p + "/"));
  const pedido = normalize(join(RAIZ, caminhoUrl));
  const dentroDaRaiz = pedido === RAIZ || pedido.startsWith(RAIZ + sep);
  const encontrado = !escondido && dentroDaRaiz ? await arquivo(pedido) : null;

  if (!encontrado) {
    const pagina404 = await readFile(join(RAIZ, "404.html"));
    res.writeHead(404, { "Content-Type": TIPOS[".html"] });
    return res.end(pagina404);
  }

  const corpo = await readFile(encontrado);
  res.writeHead(200, { "Content-Type": TIPOS[extname(encontrado)] || "application/octet-stream" });
  res.end(corpo);
});

servidor.listen(PORTA, () => {
  console.log(`Servidor de testes rodando em http://localhost:${PORTA} (raiz: ${RAIZ})`);
});
