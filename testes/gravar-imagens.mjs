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
async function gravarGif(nome, tamanho, roteiro, largura, fps = 10) {
  const pastaVideo = mkdtempSync(join(tmpdir(), "video-"));
  const contexto = await navegador.newContext({ viewport: tamanho, recordVideo: { dir: pastaVideo, size: tamanho } });
  const pagina = await contexto.newPage();
  const recorte = await roteiro(pagina); // o roteiro pode devolver a área a recortar
  await contexto.close();
  const video = join(pastaVideo, readdirSync(pastaVideo)[0]);
  const corte = recorte ? `crop=${recorte.width}:${recorte.height}:${recorte.x}:${recorte.y},` : "";
  const filtro = `${corte}fps=${fps},scale=${largura}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
  // Corta o primeiro segundo (página ainda em branco)
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "1", "-i", video, "-vf", filtro, "-loop", "0", join(SAIDA, nome)]);
  rmSync(pastaVideo, { recursive: true, force: true });
  console.log("gravado:", nome);
}

// 1. Portfólio: cada card alternando entre landing page e site completo, e o fundo fixo
await gravarGif("portfolio.gif", { width: 1280, height: 1400 }, async (p) => {
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
  const modelos = ["barbearia", "consultoria", "petshop", "manicure"];
  for (const modelo of modelos) {
    await p.click(`.projeto-${modelo} .versoes button[data-versao="site"]`);
    await p.mouse.move(0, 0);
    await pausa(1000);
  }
  for (const modelo of ["barbearia", "petshop"]) {
    await p.click(`.projeto-${modelo} .fundo-fixo`);
    await p.mouse.move(0, 0);
    await pausa(800);
  }
  await pausa(700);
  for (const modelo of modelos) {
    await p.click(`.projeto-${modelo} .versoes button[data-versao="lp"]`);
    await p.mouse.move(0, 0);
    await pausa(600);
  }
  await pausa(600);
  return recorte;
}, 600, 7);

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

// 3. Painel de vendas: gera o site, edita um texto, troca o topo e liga o fundo fixo
await gravarGif("painel.gif", { width: 1440, height: 860 }, async (p) => {
  await p.goto(BASE + "/painel/");
  await p.locator('input[name="modelo"][value="petshop"]').check();
  await p.fill("#nome", "Bicho Feliz");
  await p.fill("#whatsapp", "(11) 98765-4321");
  await p.fill("#bairro", "Granja Viana");
  await pausa(900);
  await p.click("#botao-gerar");
  await pausa(1500);
  await p.click('button[data-tamanho="computador"]');
  await pausa(1200);
  // Editar o título clicando nele
  await p.click("#botao-editar");
  await pausa(500);
  const previa = p.frameLocator("#previa");
  await previa.locator("h1").click();
  await p.keyboard.press("ControlOrMeta+A");
  await p.keyboard.type("Banho e tosa com carinho na Granja Viana", { delay: 35 });
  await p.keyboard.press("Enter");
  await pausa(900);
  await p.click("#botao-editar");
  // Layout: topo centralizado e fundo fixo
  await p.locator(".painel-form").evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  await p.evaluate(() => document.getElementById("estilo-fundo")?.scrollIntoView({ block: "center" }));
  await pausa(700);
  await p.locator('#estilo-topo input[value="centralizado"]').check();
  await pausa(1300);
  await p.locator('#estilo-fundo input[value="fixo"]').check();
  await pausa(1000);
  await previa.locator("html").evaluate(() => window.scrollTo({ top: 900, behavior: "smooth" }));
  await pausa(1800);
}, 860, 8);

await navegador.close();
servidor.kill();
