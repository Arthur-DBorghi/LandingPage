// @ts-check
// Arquivos que a ferramenta cria no site do cliente (além dos copiados da vitrine).

/**
 * whats.js do cliente: implementa window.enviarWhats e liga os links data-whats ao número.
 * @param {string} numero 55 + DDD + número
 */
export function whatsJs(numero) {
  return `/* ==========================================================
   WhatsApp do negócio.
   Para trocar o número, mude só a linha WHATSAPP abaixo
   (formato: 55 + DDD + número, só dígitos).
   - Links e botões com data-whats="mensagem" abrem a conversa
     com a mensagem pronta (o link já funciona sem JavaScript;
     aqui ele é atualizado na hora do clique, porque algumas
     mensagens mudam com a escolha do visitante).
   - window.enviarWhats(msg) é usada pelos formulários.
   ========================================================== */
(function () {
  const WHATSAPP = "${numero}";

  function link(mensagem) {
    return "https://wa.me/" + WHATSAPP + (mensagem ? "?text=" + encodeURIComponent(mensagem) : "");
  }

  document.addEventListener("click", function (e) {
    const el = e.target.closest("a[data-whats]");
    if (!el) return;
    el.href = link(el.dataset.whats);
    el.target = "_blank";
    el.rel = "noopener";
  });

  window.enviarWhats = function (mensagem) {
    window.open(link(mensagem), "_blank", "noopener");
  };
})();
`;
}

/**
 * @param {string} slug nome do projeto na Cloudflare
 * @param {string} hoje AAAA-MM-DD
 */
export function wranglerJsonc(slug, hoje) {
  return `{\n  "name": "${slug}",\n  "compatibility_date": "${hoje}",\n  "assets": {\n    "directory": "./"\n  }\n}\n`;
}

/**
 * Cache no navegador (lido pela Cloudflare). Sem isto, a cada página o
 * navegador confere de novo cada CSS, JS e imagem com o servidor.
 */
export const HEADERS = `# Fontes nunca mudam: o navegador pode guardar por 1 ano
/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable

# CSS e JS: guardados por 10 minutos. Quem navega pelo site não espera o
# navegador conferir cada arquivo de novo a cada página; uma mudança
# publicada aparece para todos em até 10 minutos.
/*.css
  Cache-Control: public, max-age=600
/*.js
  Cache-Control: public, max-age=600

# Imagens: 1 dia (usadas de novo depois, enquanto o navegador confere)
/*.webp
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
/*.png
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
/*.jpg
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
/*.svg
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
`;

export const ASSETSIGNORE = [".git", "wrangler.jsonc", ".assetsignore", "LEIA-ME.md", ""].join("\n");
