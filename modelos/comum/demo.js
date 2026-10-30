/* ==========================================================
   Comportamento comum dos modelos de demonstração.
   - Coloca a faixa "modelo de demonstração" no topo.
   - Todo elemento com data-whats="mensagem" abre uma janela
     mostrando a mensagem que iria para o WhatsApp do negócio.
   Numa página de cliente de verdade, troque por links
   https://wa.me/55DDDNUMERO?text=... e remova este arquivo.
   ========================================================== */

(function () {
  const modelo = document.body.dataset.modelo || "";
  const linkOrcamento = "../../orcamento.html?modelo=" + encodeURIComponent(modelo);

  // ---------- Faixa no topo ----------
  const faixa = document.createElement("div");
  faixa.className = "demo-faixa";
  faixa.innerHTML =
    '<span><strong>Modelo de demonstração</strong> · negócio fictício, criado por Arthur Borghi</span>' +
    '<a href="' + linkOrcamento + '">Quero uma página assim</a>' +
    '<a class="voltar" href="../../index.html#portfolio">ver outros modelos</a>';
  document.body.prepend(faixa);

  // ---------- Janela do WhatsApp ----------
  const janela = document.createElement("dialog");
  janela.className = "demo-janela";
  janela.innerHTML =
    '<div class="topo">' +
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg>' +
    '<span>Aqui abriria o WhatsApp do negócio</span></div>' +
    '<div class="corpo">' +
    '<p>Numa página de verdade, o cliente cai direto na conversa com você, com esta mensagem já escrita:</p>' +
    '<div class="balao" id="demo-mensagem"></div>' +
    '<div class="acoes">' +
    '<a href="' + linkOrcamento + '">Quero uma página assim</a>' +
    '<button type="button" data-fechar>Continuar vendo o modelo</button>' +
    "</div></div>";
  document.body.appendChild(janela);

  const balao = janela.querySelector("#demo-mensagem");

  function mostrarWhats(mensagem) {
    balao.textContent = mensagem;
    if (typeof janela.showModal === "function") janela.showModal();
    else alert(mensagem); // navegadores muito antigos
  }

  janela.addEventListener("click", (e) => {
    // Fecha no botão ou clicando fora da janela
    if (e.target.hasAttribute("data-fechar") || e.target === janela) janela.close();
  });

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-whats]");
    if (!el) return;
    e.preventDefault();
    mostrarWhats(el.dataset.whats || "Olá! Vim pelo site.");
  });

  // Usado pelos formulários dos modelos
  window.demoWhats = mostrarWhats;
})();
