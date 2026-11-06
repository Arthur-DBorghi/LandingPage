/* ==========================================================
   Menu em gaveta do "Site completo" (celular e tablet).
   Abre pelo botão ☰, fecha no X, no fundo escuro, na tecla Esc
   ou ao escolher uma página.
   ========================================================== */
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

  // Formulário de agendamento (página de contato)
  const form = document.getElementById("form-agendar");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const v = (n) => (d.get(n) || "").toString().trim() || "-";
      const msg =
        "Olá! Quero agendar pelo site.\n\n" +
        "Meu nome: " + v("nome") + "\n" +
        "Nome do pet: " + v("pet") + "\n" +
        "Porte: " + v("porte") + "\n" +
        "Serviço: " + v("servico") + "\n" +
        "Melhor dia/turno: " + v("quando") + "\n" +
        "Leva e traz: " + v("leva");
      // Na página real: window.open("https://wa.me/55DDDNUMERO?text=" + encodeURIComponent(msg))
      if (window.demoWhats) window.demoWhats(msg);
    });
  }
})();
