// Copia o parse5 (e a dependência entities) de node_modules para painel/vendor,
// para o painel usar no navegador sem etapa de build. Rode depois de atualizar o parse5:
//   npm run vendor
import { cpSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DESTINO = path.join(AQUI, "..", "painel", "vendor");

/** Copia só os .js (sem tipos nem mapas) de uma pasta, mantendo a estrutura. */
function copiarJs(origem, destino) {
  for (const nome of readdirSync(origem)) {
    const o = path.join(origem, nome);
    const d = path.join(destino, nome);
    if (statSync(o).isDirectory()) copiarJs(o, d);
    else if (nome.endsWith(".js")) {
      mkdirSync(destino, { recursive: true });
      copyFileSync(o, d);
    }
  }
}

rmSync(DESTINO, { recursive: true, force: true });
for (const pacote of ["parse5", "entities"]) {
  const raiz = path.join(AQUI, "node_modules", pacote);
  copiarJs(path.join(raiz, "dist"), path.join(DESTINO, pacote));
  cpSync(path.join(raiz, "LICENSE"), path.join(DESTINO, pacote, "LICENSE"));
  cpSync(path.join(raiz, "package.json"), path.join(DESTINO, pacote, "package.json"));
}
console.log("parse5 e entities copiados para painel/vendor");
