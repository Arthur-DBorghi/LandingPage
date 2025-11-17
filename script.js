document.getElementById("ano").textContent = new Date().getFullYear();

// =========================
//   PARTICULAS COLORIDAS
// =========================
const particlesContainer = document.querySelector(".particles");

function createParticle() {
  const p = document.createElement("div");
  p.classList.add("particle");

  const leftBlob = document.getElementById("blob-left");
  const rightBlob = document.getElementById("blob-right");

  const isLeft = Math.random() < 0.5;
  const blob = isLeft ? leftBlob : rightBlob;

  const rect = blob.getBoundingClientRect();

  const x = rect.left + Math.random() * rect.width;
  const y = rect.top + Math.random() * rect.height;

  p.style.left = x + "px";
  p.style.top = y + "px";

  const size = Math.random() * 4 + 3;
  p.style.width = size + "px";
  p.style.height = size + "px";

  const duration = Math.random() * 4 + 4;
  p.style.animationDuration = duration + "s, " + (duration + 1) + "s";

  if (isLeft) {
    p.style.animationName = "fall, colorFall";
  } else {
    p.style.animationName = "rise, colorRise";
  }

  particlesContainer.appendChild(p);

  setTimeout(() => p.remove(), duration * 1000);
}

setInterval(createParticle, 200);

// =========================
//     BLOB DIREITO FUJÃO
// =========================
const blobRight = document.getElementById("blob-right");

let fleeX = 0;
let fleeY = 0;

document.addEventListener("mousemove", (e) => {
  const rr = blobRight.getBoundingClientRect();
  const cx = rr.left + rr.width / 2;
  const cy = rr.top + rr.height / 2;

  const dx = cx - e.clientX;
  const dy = cy - e.clientY;
  const dist = Math.hypot(dx, dy);

  if (dist < 260) {
    blobRight.classList.add("fleeing");

    const force = (260 - dist) * 0.18;
    fleeX += (dx / dist) * force;
    fleeY += (dy / dist) * force;
  } else {
    fleeX *= 0.9;
    fleeY *= 0.9;

    if (Math.abs(fleeX) < 0.5 && Math.abs(fleeY) < 0.5) {
      blobRight.classList.remove("fleeing");
    }
  }

  blobRight.style.transform = `translate(${fleeX}px, ${fleeY}px)`;
});

// =========================
//   BLOB ESQUERDO SUAVE
// =========================
const blobLeft = document.getElementById("blob-left");

let fleeLeftX = 0;
let fleeLeftY = 0;

document.addEventListener("mousemove", (e) => {
  const rr = blobLeft.getBoundingClientRect();
  const cx = rr.left + rr.width / 2;
  const cy = rr.top + rr.height / 2;

  const dx = cx - e.clientX;
  const dy = cy - e.clientY;
  const dist = Math.hypot(dx, dy);

  if (dist < 260) {
    blobLeft.classList.add("fleeing");

    const force = (260 - dist) * 0.18;
    fleeLeftX += (dx / dist) * force;
    fleeLeftY += (dy / dist) * force;
  } else {
    fleeLeftX *= 0.9;
    fleeLeftY *= 0.9;

    if (Math.abs(fleeLeftX) < 0.5 && Math.abs(fleeLeftY) < 0.5) {
      blobLeft.classList.remove("fleeing");
    }
  }

  blobLeft.style.transform = `translate(${fleeLeftX}px, ${fleeLeftY}px)`;
});

// =========================
//       ENVIAR WHATSAPP
// =========================
document.getElementById('sendBtn').addEventListener('click', () => {
  const f = document.getElementById('brief');
  const data = new FormData(f);
  const nome = encodeURIComponent(data.get('nome')||'');
  const email = encodeURIComponent(data.get('email')||'');
  const nicho = encodeURIComponent(data.get('nicho')||'');
  const plano = encodeURIComponent(data.get('plano')||'');
  const obs = encodeURIComponent(data.get('obs')||'');
  const msg = `Pedido%20de%20LP%0ANome:%20${nome}.%0AEmail:%20${email}.%0ANicho:%20${nicho}.%0APlano:%20${plano}.%0AObs:%20${obs}.`;
  window.open(`https://wa.me/5511941060165?text=${msg}`,'_blank');
});
