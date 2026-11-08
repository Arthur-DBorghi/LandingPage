// @ts-check
// Normaliza e valida o que a pessoa digita nas perguntas.

/**
 * @typedef {"a" | "o"} Artigo
 * @typedef {{ artigo: Artigo | null, nome: string }} NomeComArtigo
 */

/** DDDs que existem no Brasil. */
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Transforma qualquer jeito de digitar um celular ou fixo brasileiro no formato do wa.me:
 * 55 + DDD + número, só dígitos. "(11) 98765-4321" → "5511987654321".
 * @param {string} entrada
 * @returns {string}
 */
export function normalizarWhatsapp(entrada) {
  let digitos = String(entrada).replace(/\D/g, "");
  if (digitos.startsWith("0")) digitos = digitos.replace(/^0+/, ""); // 0 de longa distância
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) digitos = digitos.slice(2);
  if (digitos.length !== 10 && digitos.length !== 11) {
    throw new Error(`WhatsApp inválido: "${entrada}". Use DDD + número, por exemplo (11) 98765-4321.`);
  }
  if (!DDDS.has(Number(digitos.slice(0, 2)))) throw new Error(`DDD inválido em "${entrada}".`);
  if (digitos.length === 11 && digitos[2] !== "9") {
    throw new Error(`Celular com 11 dígitos precisa começar com 9 depois do DDD: "${entrada}".`);
  }
  // Fixo tem 8 dígitos começando de 2 a 5; 8 dígitos começando de 6 a 9 é celular sem o 9 da frente (ou digitado pela metade)
  if (digitos.length === 10 && !/[2-5]/.test(digitos[2])) {
    throw new Error(`Faltou um dígito? Celular tem 9 dígitos depois do DDD, ex.: (11) 98765-4321. Recebi "${entrada}".`);
  }
  return "55" + digitos;
}

/**
 * Formata o número normalizado para mostrar a pessoas: "5511987654321" → "(11) 98765-4321".
 * @param {string} normalizado
 * @returns {string}
 */
export function formatarTelefone(normalizado) {
  const n = normalizado.replace(/^55/, "");
  const ddd = n.slice(0, 2);
  const resto = n.slice(2);
  const meio = resto.length === 9 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, meio)}-${resto.slice(meio)}`;
}

/**
 * Separa o artigo do nome: "a Mooca" → { artigo: "a", nome: "Mooca" }.
 * Sem artigo, devolve artigo null (a pergunta seguinte pede).
 * @param {string} entrada
 * @returns {NomeComArtigo}
 */
export function separarArtigo(entrada) {
  const limpo = String(entrada).trim().replace(/\s+/g, " ");
  const m = limpo.match(/^(a|o)\s+(.+)$/i);
  if (m) return { artigo: /** @type {Artigo} */ (m[1].toLowerCase()), nome: m[2] };
  return { artigo: null, nome: limpo };
}

/**
 * Nome curto para pastas, repositório e projeto da Cloudflare:
 * minúsculas, sem acento, palavras separadas por hífen, até 63 caracteres.
 * @param {string} texto
 * @returns {string}
 */
export function criarSlug(texto) {
  const slug = String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/g, "");
  if (!slug) throw new Error(`Não dá para criar um nome de projeto a partir de "${texto}".`);
  return slug;
}

/**
 * Iniciais de um nome de pessoa (primeiro e último nome): "Paula de Lima" → "PL".
 * @param {string} nome
 * @returns {string}
 */
export function iniciais(nome) {
  const partes = String(nome).trim().split(/\s+/).filter((p) => !/^(da|de|do|das|dos|e)$/i.test(p));
  if (partes.length === 0) return "";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

/**
 * Aceita "https://www.Exemplo.com.br/" e devolve "exemplo.com.br". Vazio continua vazio.
 * @param {string} entrada
 * @returns {string}
 */
export function normalizarDominio(entrada) {
  const d = String(entrada || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
  if (!d) return "";
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)) {
    throw new Error(`Domínio inválido: "${entrada}".`);
  }
  return d;
}

/**
 * Valida um e-mail simples. Vazio continua vazio.
 * @param {string} entrada
 * @returns {string}
 */
export function normalizarEmail(entrada) {
  const e = String(entrada || "").trim();
  if (!e) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error(`E-mail inválido: "${entrada}".`);
  return e;
}
