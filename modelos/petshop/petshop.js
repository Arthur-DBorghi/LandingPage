/* ==========================================================
   Modelo: Pet shop (Focinho Feliz, fictício)
   Seletor de porte: troca os preços e a mensagem do WhatsApp.
   Os preços ficam no HTML (data-p, data-m, data-g), então
   para mudar um valor basta editar o index.html.
   ========================================================== */

const NOMES_PORTE = { p: "pequeno", m: "médio", g: "grande" };
const DESCONTO_CLUBE = 0.15; // 15% em 4 banhos

const real = (valor) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function aplicarPorte(porte) {
  const nome = NOMES_PORTE[porte];

  // Botões: marca o escolhido
  document.querySelectorAll(".porte").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.porte === porte));
  });

  // Preços de cada serviço
  let precoBanho = 0;
  document.querySelectorAll("#lista-servicos li").forEach((li) => {
    const valor = Number(li.dataset[porte]);
    li.querySelector(".preco").textContent = real(valor);
    if (li.dataset.servico === "Banho") precoBanho = valor;
  });

  // Clube do banho: 4 banhos com desconto (só se a página tiver o card do clube)
  const clube = Math.round(precoBanho * 4 * (1 - DESCONTO_CLUBE));
  const precoClube = document.getElementById("preco-clube");
  const porteClube = document.getElementById("porte-clube");
  const botaoClube = document.getElementById("botao-clube");
  if (precoClube) precoClube.textContent = real(clube);
  if (porteClube) porteClube.textContent = `Porte ${nome} · leva e traz incluso`;
  if (botaoClube && botaoClube.hasAttribute("data-whats")) {
    botaoClube.dataset.whats = `Olá! Quero entrar no Clube do Banho (porte ${nome}).`;
  }

  // Botão principal
  const agendar = document.getElementById("botao-agendar");
  if (agendar) {
    agendar.textContent = `Agendar para porte ${nome}`;
    agendar.dataset.whats = `Olá! Quero agendar um banho para meu pet de porte ${nome}.`;
  }
}

document.querySelectorAll(".porte").forEach((botao) => {
  botao.addEventListener("click", () => aplicarPorte(botao.dataset.porte));
});

if (document.querySelector(".porte")) aplicarPorte("p");
