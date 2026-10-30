/* ==========================================================
   Modelo: Delivery (Forno da Vila, fictícia)
   Cardápio + carrinho que monta a mensagem do pedido.
   Para adaptar: edite NEGOCIO, PRODUTOS, BAIRROS e HORARIOS.
   ========================================================== */

const NEGOCIO = "Forno da Vila";

// Preços em centavos (evita erro de arredondamento)
const PRODUTOS = [
  { id: "margherita", cat: "salgadas", nome: "Margherita", desc: "Molho de tomate, muçarela de búfala, manjericão e azeite.", preco: 5400 },
  { id: "calabresa", cat: "salgadas", nome: "Calabresa", desc: "Calabresa artesanal, cebola roxa e azeitona preta.", preco: 5200 },
  { id: "portuguesa", cat: "salgadas", nome: "Portuguesa", desc: "Presunto, ovo, cebola, ervilha, muçarela e azeitona.", preco: 5800 },
  { id: "quatro-queijos", cat: "salgadas", nome: "Quatro queijos", desc: "Muçarela, gorgonzola, parmesão e provolone.", preco: 5900 },
  { id: "frango", cat: "salgadas", nome: "Frango com requeijão", desc: "Frango desfiado temperado e requeijão cremoso.", preco: 5600 },
  { id: "pepperoni", cat: "salgadas", nome: "Pepperoni", desc: "Pepperoni fatiado fino, muçarela e orégano.", preco: 6200 },
  { id: "chocolate", cat: "doces", nome: "Chocolate com morango", desc: "Chocolate ao leite e morangos frescos.", preco: 5200 },
  { id: "banana", cat: "doces", nome: "Banana com canela", desc: "Banana, açúcar mascavo, canela e leite condensado.", preco: 4600 },
  { id: "refri-lata", cat: "bebidas", nome: "Refrigerante lata", desc: "350 ml, vários sabores.", preco: 700 },
  { id: "refri-2l", cat: "bebidas", nome: "Refrigerante 2 litros", desc: "Vários sabores.", preco: 1400 },
  { id: "suco", cat: "bebidas", nome: "Suco natural", desc: "500 ml · laranja, limão ou maracujá.", preco: 1200 },
  { id: "agua", cat: "bebidas", nome: "Água mineral", desc: "500 ml, com ou sem gás.", preco: 500 },
];

const CATEGORIAS = [
  { id: "salgadas", nome: "Pizzas salgadas", nota: "Todas grandes, 8 fatias, massa de fermentação natural." },
  { id: "doces", nome: "Pizzas doces", nota: "Broto, 4 fatias." },
  { id: "bebidas", nome: "Bebidas", nota: "" },
];

const BAIRROS = [
  { nome: "Retirar no balcão", taxa: 0, retirada: true },
  { nome: "Vila Nova", taxa: 500 },
  { nome: "Centro", taxa: 700 },
  { nome: "Jardim das Flores", taxa: 900 },
  { nome: "Parque Industrial", taxa: 1200 },
];

// 0 = domingo ... 6 = sábado. Segunda (1) fechado.
const HORARIOS = { dias: [0, 2, 3, 4, 5, 6], abre: 18 * 60, fecha: 23 * 60 + 30 };

// ---------- Utilitários ----------
const real = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (centavos) => real.format(centavos / 100);
const $ = (sel) => document.querySelector(sel);

const carrinho = new Map(); // id -> quantidade

// ---------- Status aberto/fechado ----------
function atualizarStatus() {
  const agora = new Date();
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  const hojeAbre = HORARIOS.dias.includes(agora.getDay());
  const aberto = hojeAbre && minutos >= HORARIOS.abre && minutos < HORARIOS.fecha;
  const el = $("#status");

  if (aberto) {
    el.textContent = "Aberto agora · entrega em 40–50 min";
    el.classList.add("aberto");
  } else {
    const abreHojeAinda = hojeAbre && minutos < HORARIOS.abre;
    el.textContent = abreHojeAinda ? "Fechado · abre hoje às 18h" : "Fechado agora · abre às 18h";
    el.classList.remove("aberto");
  }
}

// ---------- Cardápio ----------
function montarCardapio() {
  const lista = $("#lista-cardapio");
  lista.innerHTML = CATEGORIAS.map((c) => {
    const itens = PRODUTOS.filter((p) => p.cat === c.id)
      .map(
        (p) => `
        <li class="item">
          <div>
            <h4>${p.nome}</h4>
            <p>${p.desc}</p>
            <span class="preco">${fmt(p.preco)}</span>
          </div>
          <button type="button" class="adicionar" data-add="${p.id}" aria-label="Adicionar ${p.nome}">+</button>
        </li>`
      )
      .join("");
    return `
      <section class="categoria" id="cat-${c.id}">
        <h3>${c.nome}</h3>
        ${c.nota ? `<p class="nota-cat">${c.nota}</p>` : ""}
        <ul class="itens">${itens}</ul>
      </section>`;
  }).join("");

  lista.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    alterar(btn.dataset.add, +1);
    btn.classList.remove("pulou");
    void btn.offsetWidth; // reinicia a animação
    btn.classList.add("pulou");
  });
}

function montarBairros() {
  $("#tipo-entrega").innerHTML = BAIRROS.map(
    (b, i) => `<option value="${i}">${b.nome}${b.retirada ? " (grátis)" : " · " + fmt(b.taxa)}</option>`
  ).join("");
  $("#tipo-entrega").value = "1";

  $("#lista-bairros").innerHTML = BAIRROS.filter((b) => !b.retirada)
    .map((b) => `<li><span>${b.nome}</span><strong>${fmt(b.taxa)}</strong></li>`)
    .join("") + `<li><span>Retirada no balcão</span><strong>Grátis</strong></li>`;
}

// ---------- Carrinho ----------
function alterar(id, delta) {
  const qtd = (carrinho.get(id) || 0) + delta;
  if (qtd <= 0) carrinho.delete(id);
  else carrinho.set(id, qtd);
  renderCarrinho();
}

function calcular() {
  let subtotal = 0;
  let itens = 0;
  carrinho.forEach((qtd, id) => {
    subtotal += PRODUTOS.find((p) => p.id === id).preco * qtd;
    itens += qtd;
  });
  const bairro = BAIRROS[Number($("#tipo-entrega").value)];
  const taxa = itens ? bairro.taxa : 0;
  return { subtotal, taxa, total: subtotal + taxa, itens, bairro };
}

function renderCarrinho() {
  const box = $("#itens-carrinho");
  if (!carrinho.size) {
    box.innerHTML = '<p class="vazio">Seu carrinho está vazio. Escolha uma pizza ao lado. 🍕</p>';
  } else {
    box.innerHTML = [...carrinho]
      .map(([id, qtd]) => {
        const p = PRODUTOS.find((x) => x.id === id);
        return `
        <div class="linha-carrinho">
          <div><strong>${p.nome}</strong><small>${fmt(p.preco * qtd)}</small></div>
          <div class="qtd">
            <button type="button" data-menos="${id}" aria-label="Remover um ${p.nome}">−</button>
            <span>${qtd}</span>
            <button type="button" data-mais="${id}" aria-label="Adicionar um ${p.nome}">+</button>
          </div>
        </div>`;
      })
      .join("");
  }

  const t = calcular();
  $("#subtotal").textContent = fmt(t.subtotal);
  $("#taxa").textContent = t.bairro.retirada ? "Grátis" : fmt(t.taxa);
  $("#total").textContent = fmt(t.total);

  const barra = $("#barra-carrinho");
  barra.hidden = t.itens === 0;
  $("#barra-qtd").textContent = t.itens + (t.itens === 1 ? " item" : " itens");
  $("#barra-total").textContent = fmt(t.total);
}

function ajustarCampos() {
  const retirada = BAIRROS[Number($("#tipo-entrega").value)].retirada;
  $("#campo-endereco").hidden = !!retirada;
  $("#campo-troco").hidden = $("#pagamento").value !== "Dinheiro";
  renderCarrinho();
}

// ---------- Enviar pedido ----------
function enviar(e) {
  e.preventDefault();
  const f = e.target;
  const d = new FormData(f);
  const t = calcular();
  const erro = $("#erro");
  erro.textContent = "";

  if (!t.itens) return (erro.textContent = "Adicione pelo menos um item ao pedido.");
  if (!d.get("nome").trim()) return (erro.textContent = "Coloque seu nome.");
  if (!t.bairro.retirada && !d.get("endereco").trim()) return (erro.textContent = "Coloque o endereço de entrega.");

  const linhas = [`*Novo pedido · ${NEGOCIO}*`, ""];
  carrinho.forEach((qtd, id) => {
    const p = PRODUTOS.find((x) => x.id === id);
    linhas.push(`${qtd}x ${p.nome} · ${fmt(p.preco * qtd)}`);
  });
  linhas.push("", `Subtotal: ${fmt(t.subtotal)}`);
  linhas.push(t.bairro.retirada ? "Retirada no balcão" : `Entrega (${t.bairro.nome}): ${fmt(t.taxa)}`);
  linhas.push(`*Total: ${fmt(t.total)}*`, "");
  linhas.push(`Nome: ${d.get("nome").trim()}`);
  if (!t.bairro.retirada) linhas.push(`Endereço: ${d.get("endereco").trim()}`);
  let pagamento = d.get("pagamento");
  if (pagamento === "Dinheiro" && d.get("troco").trim()) pagamento += ` (troco para R$ ${d.get("troco").trim()})`;
  linhas.push(`Pagamento: ${pagamento}`);
  if (d.get("obs").trim()) linhas.push(`Obs.: ${d.get("obs").trim()}`);

  // Na página real: window.open("https://wa.me/55DDDNUMERO?text=" + encodeURIComponent(texto))
  window.demoWhats(linhas.join("\n"));
}

// ---------- Carrinho no celular ----------
function abrirCarrinho() {
  $("#carrinho").classList.add("aberto");
  document.body.classList.add("sem-rolagem");
}
function fecharCarrinho() {
  $("#carrinho").classList.remove("aberto");
  document.body.classList.remove("sem-rolagem");
}

// ---------- Início ----------
montarCardapio();
montarBairros();
atualizarStatus();
setInterval(atualizarStatus, 60000);
ajustarCampos();

$("#itens-carrinho").addEventListener("click", (e) => {
  const menos = e.target.closest("[data-menos]");
  const mais = e.target.closest("[data-mais]");
  if (menos) alterar(menos.dataset.menos, -1);
  if (mais) alterar(mais.dataset.mais, +1);
});
$("#tipo-entrega").addEventListener("change", ajustarCampos);
$("#pagamento").addEventListener("change", ajustarCampos);
$("#form-pedido").addEventListener("submit", enviar);
$("#barra-carrinho").addEventListener("click", abrirCarrinho);
$("#fechar-carrinho").addEventListener("click", fecharCarrinho);
