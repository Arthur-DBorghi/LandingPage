/* ==========================================================
   Comportamento do "Site completo" (várias páginas).
   1. Menu em gaveta (celular e tablet): abre pelo botão ☰,
      fecha no X, no fundo escuro, na tecla Esc ou ao escolher
      uma página.
   2. Formulário que monta a mensagem do WhatsApp.
   3. Próxima página mais rápida: o navegador já prepara a página
      quando o visitante para o mouse (ou o dedo) em cima do link.
   A transição suave entre as páginas está no site.css.
   ========================================================== */

// ---------- 1. Gaveta ----------
(function () {
  const botao = document.querySelector(".menu-botao");
  const gaveta = document.getElementById("gaveta");
  const fundo = document.querySelector(".gaveta-fundo");
  if (!botao || !gaveta) return;

  const fechar = gaveta.querySelector(".gaveta-fechar");

  function abrir() {
    document.body.classList.add("menu-aberto");
    botao.setAttribute("aria-expanded", "true");
    gaveta.removeAttribute("inert");
    gaveta.setAttribute("aria-hidden", "false");
    (fechar || gaveta).focus();
  }

  function fecharMenu() {
    document.body.classList.remove("menu-aberto");
    botao.setAttribute("aria-expanded", "false");
    gaveta.setAttribute("inert", "");
    gaveta.setAttribute("aria-hidden", "true");
    botao.focus();
  }

  botao.addEventListener("click", abrir);
  if (fechar) fechar.addEventListener("click", fecharMenu);
  if (fundo) fundo.addEventListener("click", fecharMenu);
  gaveta.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => {
    document.body.classList.remove("menu-aberto");
  }));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-aberto")) fecharMenu();
  });
})();

// ---------- 2. Formulário → mensagem pronta no WhatsApp ----------
// Vale para qualquer <form class="form-whats">.
// data-intro no form = primeira linha da mensagem.
// data-rotulo em cada campo = como ele aparece na mensagem.
(function () {
  document.querySelectorAll("form.form-whats").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const linhas = [];
      for (const campo of form.elements) {
        if (!campo.name) continue;
        const valor = (campo.value || "").trim() || "-";
        linhas.push((campo.dataset.rotulo || campo.name) + ": " + valor);
      }
      const msg = (form.dataset.intro || "Olá! Vim pelo site.") + "\n\n" + linhas.join("\n");
      // demo.js (vitrines) ou whats.js (clientes) implementam enviarWhats
      if (window.enviarWhats) window.enviarWhats(msg);
    });
  });
})();

// ---------- 3. Próxima página mais rápida ----------
(function () {
  // Fora de um site de verdade (ex.: prévia do painel, about:srcdoc) não faz nada
  if (!/^https?:$/.test(location.protocol)) return;
  // Só páginas deste site, na mesma pasta (nada de WhatsApp, âncoras ou outros sites)
  const pasta = new URL(".", location.href).href;
  function ehPaginaDoSite(a) {
    if (!a || !a.href || a.hasAttribute("data-whats")) return false;
    const url = new URL(a.href, location.href);
    return url.origin === location.origin && /\.html$/.test(url.pathname) &&
      new URL(".", url).href === pasta && url.pathname !== location.pathname;
  }

  // Chrome e Edge: Speculation Rules deixam a página pronta (prerender) ao
  // passar o mouse; o clique abre na hora.
  if (window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) {
    const regras = document.createElement("script");
    regras.type = "speculationrules";
    regras.textContent = JSON.stringify({
      prerender: [{
        where: { and: [
          { href_matches: "/*" },
          { selector_matches: ".nav nav a, .gaveta a, .rodape-grade a, .trilha a, a.destaque, a.link-seta, .hero-acoes a" },
          { not: { selector_matches: "[data-whats]" } },
        ] },
        eagerness: "moderate",
      }],
    });
    document.head.appendChild(regras);
    return;
  }

  // Outros navegadores: baixa a página antes do clique (prefetch)
  const pedidas = new Set();
  function preparar(e) {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!ehPaginaDoSite(a)) return;
    const url = a.href.split("#")[0];
    if (pedidas.has(url)) return;
    pedidas.add(url);
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;
    document.head.appendChild(link);
  }
  document.addEventListener("pointerover", preparar, { passive: true });
  document.addEventListener("touchstart", preparar, { passive: true });
  document.addEventListener("focusin", preparar);
})();
