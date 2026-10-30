// Número que recebe os pedidos (só dígitos, com DDI 55)
const WHATSAPP = "5511941060165";

const anoEl = document.getElementById("ano");
if (anoEl) anoEl.textContent = new Date().getFullYear();

// =========================
//    PEDIDO VIA WHATSAPP
// =========================
// Só existe no orcamento.html. Usando o evento "submit", o navegador
// valida os campos obrigatórios antes de abrir o WhatsApp.
const brief = document.getElementById("brief");

if (brief) {
  brief.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(brief);
    const campo = (nome) => (d.get(nome) || "").toString().trim() || "-";

    const linhas = [
      "Olá, Arthur! Vim pelo site e quero um orçamento de landing page.",
      "",
      "Nome: " + campo("nome"),
      "Negócio: " + campo("nicho"),
      "Instagram/site atual: " + campo("link"),
      "Já tenho logo: " + campo("logo"),
      "Modelo de referência: " + campo("modelo"),
      "Interesse: " + campo("plano"),
      "O que preciso: " + campo("obs"),
    ];

    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(linhas.join("\n"))}`;
    window.open(url, "_blank", "noopener");
  });
}

// Veio de um modelo (?modelo=petshop)? Já deixa o campo preenchido.
const campoModelo = document.getElementById("campo-modelo");
if (campoModelo) {
  const nomes = {
    barbearia: "Barbearia e estética",
    consultoria: "Consultoria e serviços",
    petshop: "Pet shop e serviços com agenda",
  };
  const vindo = new URLSearchParams(location.search).get("modelo");
  if (nomes[vindo]) campoModelo.value = nomes[vindo];
}
