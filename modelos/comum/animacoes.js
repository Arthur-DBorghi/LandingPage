/* ==========================================================
   Animações dos modelos: textos e cards aparecem ao rolar,
   imagens e ilustrações surgem com um leve zoom.
   Seletores que não existem numa página são ignorados.
   ========================================================== */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  document.documentElement.classList.add("anima");

  // Textos e cards (entram em sequência dentro do mesmo pai)
  const textos = [
    ".hero-texto > *", ".hero > div:first-child > *",
    ".titulo-secao > *", ".secao > .sobretitulo", ".secao > h2",
    ".cardapio li", ".servicos li", ".portes", ".plano", ".pacote",
    ".barbeiro", ".card", ".passos li", ".cuidados article",
    ".sobre > div > *", ".local > div:first-child > *", ".duvidas-grade > div > *",
    ".faq details", ".horarios-card", ".contato > *", ".nota",
    ".cta > *", ".faixa-info li", ".categoria",
  ];

  // Imagens, ilustrações e espaços de foto
  const imagens = [
    ".selo", ".ilustracao", ".painel", ".retrato", ".mapa", ".foto", ".pizza", "main img",
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

  function preparar(seletores, classe) {
    seletores.forEach((sel) => {
      const porPai = new Map();
      document.querySelectorAll(sel).forEach((el) => {
        if (el.classList.contains("revelar") || el.classList.contains("revelar-img")) return;
        const i = porPai.get(el.parentElement) || 0;
        porPai.set(el.parentElement, i + 1);
        el.classList.add(classe);
        el.style.setProperty("--atraso", Math.min(i, 6) * 0.08 + "s");
        observador.observe(el);
      });
    });
  }

  preparar(imagens, "revelar-img");
  preparar(textos, "revelar");
})();
