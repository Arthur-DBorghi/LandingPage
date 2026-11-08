/* ==========================================================
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
  const WHATSAPP = "__WHATSAPP__";

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
