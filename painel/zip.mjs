// @ts-check
// Gerador de .zip mínimo, sem dependências: arquivos "guardados" (sem compressão),
// o que basta aqui (as fontes woff2 já vêm comprimidas e o resto é pequeno).
// Formato: PKWARE APPNOTE (cabeçalho local + diretório central + fim do diretório).

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** @param {Uint8Array} dados */
export function crc32(dados) {
  let c = 0xffffffff;
  for (let i = 0; i < dados.length; i++) c = TABELA_CRC[(c ^ dados[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Data e hora no formato do MS-DOS, usado pelo zip. @param {Date} d */
function dataDos(d) {
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const dia = ((Math.max(d.getFullYear(), 1980) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { hora, dia };
}

/**
 * Cria um .zip com os arquivos dentro de uma pasta.
 * @param {Map<string, string | Uint8Array>} arquivos caminho → conteúdo
 * @param {{ pasta?: string, data?: Date }} [opcoes]
 * @returns {Uint8Array}
 */
export function criarZip(arquivos, opcoes = {}) {
  const codificador = new TextEncoder();
  const { hora, dia } = dataDos(opcoes.data ?? new Date());
  /** @type {Uint8Array[]} */
  const partes = [];
  /** @type {Uint8Array[]} */
  const central = [];
  let posicao = 0;

  for (const [caminho, conteudo] of arquivos) {
    const nome = codificador.encode((opcoes.pasta ? opcoes.pasta + "/" : "") + caminho);
    const dados = typeof conteudo === "string" ? codificador.encode(conteudo) : conteudo;
    const crc = crc32(dados);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // assinatura
    local.setUint16(4, 20, true); // versão necessária
    local.setUint16(6, 0x0800, true); // nomes em UTF-8
    local.setUint16(8, 0, true); // sem compressão
    local.setUint16(10, hora, true);
    local.setUint16(12, dia, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, dados.length, true);
    local.setUint32(22, dados.length, true);
    local.setUint16(26, nome.length, true);
    local.setUint16(28, 0, true);
    partes.push(new Uint8Array(local.buffer), nome, dados);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true); // feito por
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, hora, true);
    c.setUint16(14, dia, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, dados.length, true);
    c.setUint32(24, dados.length, true);
    c.setUint16(28, nome.length, true);
    c.setUint32(42, posicao, true); // onde começa o cabeçalho local
    central.push(new Uint8Array(c.buffer), nome);

    posicao += 30 + nome.length + dados.length;
  }

  const tamanhoCentral = central.reduce((s, p) => s + p.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(8, arquivos.size, true);
  fim.setUint16(10, arquivos.size, true);
  fim.setUint32(12, tamanhoCentral, true);
  fim.setUint32(16, posicao, true);

  const todas = [...partes, ...central, new Uint8Array(fim.buffer)];
  const saida = new Uint8Array(todas.reduce((s, p) => s + p.length, 0));
  let i = 0;
  for (const p of todas) {
    saida.set(p, i);
    i += p.length;
  }
  return saida;
}
