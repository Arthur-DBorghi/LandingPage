// @ts-check
// Peças do painel que dá para testar sem navegador: o .zip e a cópia do parse5.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, criarZip } from "../../painel/zip.mjs";
import { montarSite } from "../novo-cliente/montar.mjs";
import { leitorDoDisco } from "../novo-cliente/gerar.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));

/**
 * Lê um .zip "guardado" (sem compressão) pelo diretório central, como os programas de descompactar fazem.
 * @param {Uint8Array} zip
 */
function lerZip(zip) {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const fim = zip.length - 22;
  assert.equal(v.getUint32(fim, true), 0x06054b50, "assinatura do fim do diretório");
  const total = v.getUint16(fim + 10, true);
  let p = v.getUint32(fim + 16, true);
  /** @type {Map<string, Uint8Array>} */
  const arquivos = new Map();
  for (let i = 0; i < total; i++) {
    assert.equal(v.getUint32(p, true), 0x02014b50, "assinatura do diretório central");
    const crc = v.getUint32(p + 16, true);
    const tamanho = v.getUint32(p + 20, true);
    const nomeLen = v.getUint16(p + 28, true);
    const local = v.getUint32(p + 42, true);
    const nome = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nomeLen));
    assert.equal(v.getUint32(local, true), 0x04034b50, "assinatura do cabeçalho local");
    const inicio = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const dados = zip.subarray(inicio, inicio + tamanho);
    assert.equal(crc32(dados), crc, `CRC de ${nome}`);
    arquivos.set(nome, dados);
    p += 46 + nomeLen;
  }
  return arquivos;
}

test("CRC-32 bate com o valor de referência", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("zip guarda texto e binário dentro da pasta, com nomes acentuados", () => {
  const binario = new Uint8Array([0, 1, 2, 250, 255]);
  /** @type {Map<string, string | Uint8Array>} */
  const arquivos = new Map();
  arquivos.set("index.html", "<p>Olá, Zé</p>");
  arquivos.set("assets/fonts/x.woff2", binario);
  const zip = criarZip(arquivos, { pasta: "barbearia-do-ze" });
  const lido = lerZip(zip);
  assert.deepEqual([...lido.keys()], ["barbearia-do-ze/index.html", "barbearia-do-ze/assets/fonts/x.woff2"]);
  assert.equal(new TextDecoder().decode(lido.get("barbearia-do-ze/index.html")), "<p>Olá, Zé</p>");
  assert.deepEqual([...(lido.get("barbearia-do-ze/assets/fonts/x.woff2") ?? [])], [...binario]);
});

test("um site gerado inteiro cabe no zip sem perder nada", async () => {
  const site = await montarSite({ modelo: "petshop", versao: "completo", nome: { artigo: "o", nome: "Pet Mania" }, whatsapp: "5511987654321", bairro: { artigo: "o", nome: "Tatuapé" } }, leitorDoDisco);
  const lido = lerZip(criarZip(site.arquivos, { pasta: site.slug }));
  assert.equal(lido.size, site.arquivos.size);
  for (const [caminho, conteudo] of site.arquivos) {
    const esperado = typeof conteudo === "string" ? new TextEncoder().encode(conteudo) : conteudo;
    assert.deepEqual(lido.get(`pet-mania/${caminho}`), esperado, caminho);
  }
});

test("a cópia do parse5 usada pelo painel é a mesma versão instalada", () => {
  for (const pacote of ["parse5", "entities"]) {
    const instalado = JSON.parse(readFileSync(path.join(AQUI, "../node_modules", pacote, "package.json"), "utf8")).version;
    const copiado = JSON.parse(readFileSync(path.join(AQUI, "../../painel/vendor", pacote, "package.json"), "utf8")).version;
    assert.equal(copiado, instalado, `${pacote}: rode "npm run vendor" em ferramentas/`);
  }
  assert.equal(
    readFileSync(path.join(AQUI, "../../painel/vendor/parse5/index.js"), "utf8"),
    readFileSync(path.join(AQUI, "../node_modules/parse5/dist/index.js"), "utf8"),
  );
});
