// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { criarSlug, formatarTelefone, iniciais, normalizarDominio, normalizarEmail, normalizarWhatsapp, separarArtigo } from "../novo-cliente/entrada.mjs";

test("WhatsApp: aceita os jeitos comuns de digitar e devolve 55 + DDD + número", () => {
  for (const entrada of ["(11) 98765-4321", "11 98765-4321", "11987654321", "+55 11 98765-4321", "5511987654321", "011 98765-4321"]) {
    assert.equal(normalizarWhatsapp(entrada), "5511987654321", entrada);
  }
  assert.equal(normalizarWhatsapp("(21) 3333-4444"), "552133334444"); // fixo com 8 dígitos
});

test("WhatsApp: recusa número incompleto, DDD impossível e celular sem o 9", () => {
  assert.throws(() => normalizarWhatsapp("98765-4321"));
  assert.throws(() => normalizarWhatsapp("(05) 98765-4321"));
  assert.throws(() => normalizarWhatsapp("(11) 88765-43210"));
  assert.throws(() => normalizarWhatsapp("(11) 18765-4321"));
  assert.throws(() => normalizarWhatsapp("(11) 98765-432")); // celular digitado pela metade
});

test("formata o número para mostrar", () => {
  assert.equal(formatarTelefone("5511987654321"), "(11) 98765-4321");
  assert.equal(formatarTelefone("552133334444"), "(21) 3333-4444");
});

test("separa o artigo do nome", () => {
  assert.deepEqual(separarArtigo("a Mooca"), { artigo: "a", nome: "Mooca" });
  assert.deepEqual(separarArtigo("  O   Studio Corte "), { artigo: "o", nome: "Studio Corte" });
  assert.deepEqual(separarArtigo("Mooca"), { artigo: null, nome: "Mooca" });
  assert.deepEqual(separarArtigo("Alameda Pet"), { artigo: null, nome: "Alameda Pet" }); // "A" de Alameda não é artigo
});

test("cria o nome do projeto sem acento nem símbolo", () => {
  assert.equal(criarSlug("Barbearia do Zé!"), "barbearia-do-ze");
  assert.equal(criarSlug("  Pet & Cia — Mooca "), "pet-cia-mooca");
  assert.equal(criarSlug("a".repeat(80)).length, 63);
  assert.throws(() => criarSlug("!!!"));
});

test("iniciais ignoram preposições", () => {
  assert.equal(iniciais("Paula de Lima"), "PL");
  assert.equal(iniciais("Clara Andrade"), "CA");
  assert.equal(iniciais("Pedro"), "P");
});

test("domínio e e-mail", () => {
  assert.equal(normalizarDominio("https://www.BarbeariaDoZe.com.br/"), "barbeariadoze.com.br");
  assert.equal(normalizarDominio(""), "");
  assert.throws(() => normalizarDominio("barbearia do zé"));
  assert.equal(normalizarEmail(" paula@lima.com.br "), "paula@lima.com.br");
  assert.throws(() => normalizarEmail("paula@"));
});
