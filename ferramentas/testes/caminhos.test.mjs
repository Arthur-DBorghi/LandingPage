// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { basename, dirname, extname, join, relative } from "../novo-cliente/caminhos.mjs";

test("caminhos sem depender do Node", () => {
  assert.equal(join("modelos/barbearia-completo", "../comum/site.css"), "modelos/comum/site.css");
  assert.equal(join("modelos/barbearia", "../../assets/fonts/a.woff2"), "assets/fonts/a.woff2");
  assert.equal(join("modelos/barbearia", "style.css"), "modelos/barbearia/style.css");
  assert.equal(relative("assets/css", "assets/fonts/a.woff2"), "../fonts/a.woff2");
  assert.equal(relative("assets/css", "assets/css/b.css"), "b.css");
  assert.equal(dirname("modelos/x/index.html"), "modelos/x");
  assert.equal(basename("modelos/x/index.html"), "index.html");
  assert.equal(extname("a/b/fonte.WOFF2"), ".WOFF2");
  assert.equal(extname("a/.oculto"), "");
});
