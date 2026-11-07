/* ==========================================================
   Comportamento do "Site completo" (várias páginas).
   1. Menu em gaveta (celular e tablet): abre pelo botão ☰,
      fecha no X, no fundo escuro, na tecla Esc ou ao escolher
      uma página.
   2. Formulário que monta a mensagem do WhatsApp.
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
      // Na página real: window.open("https://wa.me/55DDDNUMERO?text=" + encodeURIComponent(msg), "_blank")
      if (window.demoWhats) window.demoWhats(msg);
    });
  });
})();
