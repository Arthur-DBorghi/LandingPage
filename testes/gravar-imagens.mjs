// Grava as imagens do README (docs/img) direto do site, com o Playwright.
// Uso: npm run imagens   (precisa do ffmpeg instalado para converter os vídeos em GIF)

import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const SAIDA = join(RAIZ, "docs", "img");
const BASE = "http://localhost:4174";
mkdirSync(SAIDA, { recursive: true });

const servidor = spawn("node", ["servidor.mjs"], { cwd: join(RAIZ, "testes"), env: { ...process.env, PORTA: "4174" } });
await new Promise((ok) => servidor.stdout.once("data", ok));

const navegador = await chromium.launch();
const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Grava um trecho de navegação e converte em GIF. */
async function gravarGif(nome, tamanho, roteiro, largura) {
  const pastaVideo = mkdtempSync(join(tmpdir(), "video-"));
  const contexto = await navegador.newContext({ viewport: tamanho, recordVideo: { dir: pastaVideo, size: tamanho } });
  const pagina = await contexto.newPage();
  const recorte = await roteiro(pagina); // o roteiro pode devolver a área a recortar
  await contexto.close();
  const video = join(pastaVideo, readdirSync(pastaVideo)[0]);
  const corte = recorte ? `crop=${recorte.width}:${recorte.height}:${recorte.x}:${recorte.y},` : "";
  const filtro = `${corte}fps=10,scale=${largura}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`;
  // Corta o primeiro segundo (página ainda em branco)
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "1", "-i", video, "-vf", filtro, "-loop", "0", join(SAIDA, nome)]);
  rmSync(pastaVideo, { recursive: true, force: true });
  console.log("gravado:", nome);
}

// 1. Portfólio: cada card alternando entre landing page e site completo
await gravarGif("portfolio.gif", { width: 1280, height: 760 }, async (p) => {
  await p.goto(BASE + "/index.html");
  await p.addStyleTag({ content: ".topo{position:static!important}" });
  await p.evaluate(() => document.querySelector("#portfolio .projetos").scrollIntoView({ block: "center" }));
  await pausa(1800);
  const caixa = await p.locator("#portfolio .projetos").boundingBox();
  const margem = 24;
  const recorte = {
    x: Math.max(0, Math.round(caixa.x - margem)),
    y: Math.max(0, Math.round(caixa.y - margem)),
    width: Math.round(caixa.width + margem * 2) & ~1,
    height: Math.round(caixa.height + margem * 2) & ~1,
  };
  for (const modelo of ["barbearia", "consultoria", "petshop"]) {
    await p.click(`.projeto-${modelo} .versoes button[data-versao="site"]`);
    await p.mouse.move(0, 0);
    await pausa(1100);
  }
  await pausa(900);
  for (const modelo of ["barbearia", "consultoria", "petshop"]) {
    await p.click(`.projeto-${modelo} .versoes button[data-versao="lp"]`);
    await p.mouse.move(0, 0);
    await pausa(700);
  }
  await pausa(600);
  return recorte;
}, 860);

// 2. Site completo no celular: gaveta lateral e troca de página
await gravarGif("gaveta-celular.gif", { width: 390, height: 760 }, async (p) => {
  await p.goto(BASE + "/modelos/barbearia-completo/index.html");
  await pausa(1800);
  await p.click(".menu-botao");
  await pausa(1300);
  await p.click('.gaveta a.gaveta-link[href="servicos.html"]');
  await p.waitForLoadState();
  await pausa(1200);
  await p.mouse.wheel(0, 700);
  await pausa(1500);
}, 320);

await navegador.close();
servidor.kill();
