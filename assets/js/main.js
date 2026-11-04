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

// =========================
//   APARECER AO ROLAR
// =========================
// Só ativa se o navegador suportar e a pessoa não pediu "reduzir movimento".
(function () {
  const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduzir || !("IntersectionObserver" in window)) return;

  document.documentElement.classList.add("anima");

  // Grupos que aparecem em sequência (um item depois do outro)
  const grupos = [
    ".hero-grid > div:first-child > *",
    ".faixa-item",
    ".cabecalho > *",
    ".projeto",
    ".passos li",
    ".recurso",
    ".plano",
    ".extras, .exclusivo",
    ".sobre > *",
    ".faq details",
    ".chamada > *",
    ".pagina-estreita > *",
  ];

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("visivel");
        observador.unobserve(e.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  grupos.forEach((seletor) => {
    // itens do mesmo pai entram com 80 ms de diferença
    const porPai = new Map();
    document.querySelectorAll(seletor).forEach((el) => {
      const i = porPai.get(el.parentElement) || 0;
      porPai.set(el.parentElement, i + 1);
      el.classList.add("revelar");
      el.style.setProperty("--atraso", Math.min(i, 6) * 0.08 + "s");
      observador.observe(el);
    });
  });
})();
