// Número que recebe os pedidos (só dígitos, com DDI 55)
const WHATSAPP = "5511941060165";

const anoEl = document.getElementById("ano");
if (anoEl) anoEl.textContent = new Date().getFullYear();

const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const temMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// =========================
//   PARTICULAS COLORIDAS
// =========================
const particlesContainer = document.querySelector(".particles");
const blobs = [document.getElementById("blob-left"), document.getElementById("blob-right")].filter(Boolean);

function createParticle() {
  // Aba em segundo plano: não cria nada (economiza bateria)
  if (document.hidden) return;

  const blob = blobs[Math.floor(Math.random() * blobs.length)];
  const rect = blob.getBoundingClientRect();

  // Blob fora da tela: não gera partícula invisível
  if (rect.bottom < 0 || rect.top > window.innerHeight) return;

  const p = document.createElement("div");
  p.className = "particle";

  p.style.left = rect.left + Math.random() * rect.width + "px";
  p.style.top = rect.top + Math.random() * rect.height + "px";

  const size = Math.random() * 4 + 3;
  p.style.width = size + "px";
  p.style.height = size + "px";

  const duration = Math.random() * 4 + 4;
  p.style.animationDuration = duration + "s, " + (duration + 1) + "s";
  p.style.animationName = blob.id === "blob-left" ? "fall, colorFall" : "rise, colorRise";

  particlesContainer.appendChild(p);
  setTimeout(() => p.remove(), duration * 1000);
}

if (particlesContainer && blobs.length && !reduzirMovimento) {
  // No celular, metade das partículas (mais leve)
  setInterval(createParticle, temMouse ? 200 : 400);
}

// =========================
//     BLOBS FUJÕES
// =========================
// Mesmo comportamento de antes, mas com limite de distância:
// antes o deslocamento somava sem parar e o blob podia ir parar longe,
// empurrando o layout (era o bug do formulário fora do centro).
function fazerFugir(blob, { raio = 260, forca = 0.18, maxDesloc = 180 } = {}) {
  if (!blob) return;
  let x = 0;
  let y = 0;

  document.addEventListener(
    "mousemove",
    (e) => {
      const r = blob.getBoundingClientRect();
      const dx = r.left + r.width / 2 - e.clientX;
      const dy = r.top + r.height / 2 - e.clientY;
      const dist = Math.hypot(dx, dy) || 1;

      if (dist < raio) {
        blob.classList.add("fleeing");
        const f = (raio - dist) * forca;
        x += (dx / dist) * f;
        y += (dy / dist) * f;

        const mag = Math.hypot(x, y);
        if (mag > maxDesloc) {
          x *= maxDesloc / mag;
          y *= maxDesloc / mag;
        }
      } else {
        x *= 0.9;
        y *= 0.9;
        if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) {
          x = 0;
          y = 0;
          blob.classList.remove("fleeing");
        }
      }

      blob.style.transform = `translate(${x}px, ${y}px)`;
    },
    { passive: true }
  );
}

if (temMouse && !reduzirMovimento) {
  fazerFugir(document.getElementById("blob-right"));
  fazerFugir(document.getElementById("blob-left"));
}

// =========================
//    PEDIDO VIA WHATSAPP
// =========================
// Só existe na page3. Usando o evento "submit", o navegador valida
// os campos obrigatórios antes de abrir o WhatsApp.
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

// Veio de um modelo (?modelo=barbearia)? Já deixa o campo preenchido.
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
