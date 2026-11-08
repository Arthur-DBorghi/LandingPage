// @ts-check
// O que é fictício em cada vitrine e o que perguntar para cada tipo de negócio.

/**
 * @typedef {"nome" | "whatsapp" | "cidade" | "bairro" | "endereco" | "profissional" | "email" | "dominio"} Campo
 * @typedef {{
 *   rotulo: string,
 *   perguntas: Campo[],
 *   nome: { curto: string, completo: string },
 *   bairro?: string,
 *   endereco?: string,
 *   profissional?: { completo: string, primeiro: string, iniciais: string },
 *   email?: string,
 *   seoLandingPage: { titulo: string, descricao: string },
 *   ficticios: string[],
 *   palavrasParaRevisar?: string[],
 *   revisar: string[],
 * }} Modelo
 */

/** @type {Record<string, Modelo>} */
export const MODELOS = {
  barbearia: {
    rotulo: "Barbearia e estética",
    perguntas: ["nome", "whatsapp", "cidade", "bairro", "endereco", "dominio"],
    nome: { curto: "Navalha Fina", completo: "Navalha Fina Barbearia" },
    bairro: "Centro",
    endereco: "Rua Exemplo, 123",
    // A landing page da vitrine tem título de demonstração; o cliente recebe o mesmo da página inicial do site completo
    seoLandingPage: {
      titulo: "Navalha Fina Barbearia | Corte e barba no Centro",
      descricao: "Barbearia no Centro com hora marcada: corte, barba, combos e clube do corte. Agende pelo WhatsApp em menos de um minuto.",
    },
    ficticios: ["Rafa", "Léo", "Dudu"],
    revisar: [
      "Preços e tempos dos serviços e do clube do corte",
      "Horários de funcionamento (rodapé, contato e dúvidas)",
      "Equipe: nomes, especialidades e dias de cada um",
      "Fotos reais nos espaços marcados",
      "Selo que gira no topo da página inicial: conferir se o nome coube no círculo",
    ],
  },
  consultoria: {
    rotulo: "Consultoria e serviços",
    perguntas: ["nome", "profissional", "whatsapp", "email", "dominio"],
    nome: { curto: "Clara Andrade Contabilidade", completo: "Clara Andrade Contabilidade" },
    profissional: { completo: "Clara Andrade", primeiro: "Clara", iniciais: "CA" },
    email: "clara@exemplo.com.br",
    seoLandingPage: {
      titulo: "Clara Andrade Contabilidade | Contabilidade online para MEI e pequenas empresas",
      descricao: "Contabilidade online para MEI, prestadores de serviço e pequenas empresas de todo o Brasil. Preço fechado e atendimento direto no WhatsApp.",
    },
    ficticios: [],
    palavrasParaRevisar: ["contadora"],
    revisar: [
      "Profissão e gênero no texto (\"contadora\", \"a contadora\"): ajustar ao cliente",
      "Planos, preços e serviços avulsos",
      "Formação e registro profissional na página Sobre",
      "Foto da profissional no lugar de \"Sua foto aqui\"",
    ],
  },
  petshop: {
    rotulo: "Pet shop e serviços com agenda",
    perguntas: ["nome", "whatsapp", "cidade", "bairro", "endereco", "dominio"],
    nome: { curto: "Focinho Feliz", completo: "Focinho Feliz Pet Shop" },
    bairro: "Vila Nova",
    endereco: "Rua Exemplo, 456",
    seoLandingPage: {
      titulo: "Focinho Feliz Pet Shop | Banho e tosa na Vila Nova",
      descricao: "Pet shop na Vila Nova com banho e tosa por porte, clube do banho e leva e traz grátis até 3 km. Agende pelo WhatsApp.",
    },
    ficticios: ["Bia", "Marcos", "Juliana"],
    revisar: [
      "Preços por porte (atributos data-p, data-m e data-g) e do clube do banho",
      "Regras do leva e traz (distância e valor)",
      "Horários de funcionamento",
      "Equipe e fotos dos pets (com autorização dos tutores)",
    ],
  },
};

/** Textos que denunciam conteúdo de demonstração em qualquer vitrine. */
export const SINAIS_DE_DEMONSTRACAO = [
  "Rua Exemplo",
  "exemplo.com",
  "Modelo de demonstração",
  "Modelo de landing page",
  "fictíci",
  "Na sua página",
  "Na página real",
  "Sua foto aqui",
];

/** Arquivos que só existem para a demonstração e não vão para o cliente. */
export const SO_DEMONSTRACAO = ["modelos/comum/demo.css", "modelos/comum/demo.js", "assets/img/favicon.png"];
