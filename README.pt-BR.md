# Landing pages para pequenos negócios locais

[![Qualidade](https://github.com/Arthur-DBorghi/LandingPage/actions/workflows/qualidade.yml/badge.svg)](https://github.com/Arthur-DBorghi/LandingPage/actions/workflows/qualidade.yml)

**No ar:** https://arthurdefendiborghi.arthur-defborghi.workers.dev · [English version](README.md)

Um negócio paralelo que eu toco junto com meu trabalho de desenvolvedor: landing pages e sites de 5 páginas prontos para barbearias, pet shops, contadores e outros negócios locais. Este repositório tem o site de vendas e três vitrines de negócios fictícios. Cada vitrine existe como landing page de uma página e como site completo de 5 páginas, para o cliente comparar as duas versões do mesmo negócio.

![Cards do portfólio alternando entre a landing page e o site completo de cada vitrine](docs/img/portfolio.gif)

## O problema

A maioria dos pequenos negócios da minha região vive no Instagram e no WhatsApp. Eles querem uma página que apareça no Google e leve o cliente direto para uma conversa no WhatsApp, mas preço de agência não cabe no bolso, e nos construtores de site o trabalho continua sendo deles.

As minhas restrições guiaram cada decisão:

- **Tempo:** umas 4 horas por semana para construir, mais só quando há cliente pagando.
- **Suporte:** cada cliente precisa custar quase nada para ficar no ar, senão o plano de manutenção mensal deixa de fazer sentido.
- **Preço:** R$ 500 a landing page e R$ 850 o site de 5 páginas. Isso só fecha se cada cliente novo partir de um modelo pronto e testado.

## Decisões principais

**1. HTML, CSS e JavaScript puro, sem framework e sem etapa de build.**
As páginas são quase só conteúdo, com poucas interações (gaveta no celular, seletor de preço, formulários que montam a mensagem do WhatsApp). Um framework traria build, atualização de dependências e peso, sem nada que o visitante perceba. Cada página aqui pesa entre 81 e 327 KB. O custo é a repetição: o topo, a gaveta e o rodapé dos sites de 5 páginas foram gerados uma vez e hoje são HTML editado à mão. Para poucas páginas por cliente, isso sai mais barato que manter um sistema de componentes.

**2. Cloudflare em vez de Netlify, Vercel ou GitHub Pages.**
O site começou na Netlify, cujo plano grátis passou a funcionar com créditos mensais (15 por deploy, uns 20 deploys por mês) e pausa o site quando eles acabam. O plano grátis da Vercel e o GitHub Pages restringem uso comercial. Os static assets do Cloudflare Workers servem arquivos estáticos sem custo, permitem uso comercial e dão um endereço de prévia para cada branch do Git. Isso virou o fluxo de revisão: toda mudança vai para um branch, é conferida na prévia e só então entra no `main`.

**3. Um CSS por negócio, dois produtos em cima dele.**
Os sites de 5 páginas carregam o próprio CSS da landing page e somam um arquivo comum (`modelos/comum/site.css`) com menu, cabeçalhos de página, gaveta e rodapé. Esse arquivo lê as cores por variáveis de CSS. Por isso o tema escuro e dourado da barbearia saiu de 11 variáveis redefinidas, e não de um segundo conjunto de componentes.

**4. A camada de demonstração sai inteira.**
Todo botão de WhatsApp das vitrines tem um atributo `data-whats`. Nas vitrines, o `demo.js` coloca a faixa "negócio fictício" e mostra a mensagem que seria enviada. Para virar site de cliente, basta apagar esse script e trocar os atributos por links `wa.me` de verdade. Nenhuma outra parte do código sabe que a demonstração existe.

**5. Animações que não escondem conteúdo.**
As animações de rolagem só ligam quando o JavaScript roda (uma classe no `<html>`); sem JavaScript, nada fica invisível. Elas respeitam o "reduzir movimento" do sistema e usam as propriedades `translate`/`scale` separadas, para não brigar com efeitos de hover que usam `transform`.

**6. Sem motor de templates por JSON.**
Cheguei a considerar um editor que geraria a página de cada cliente a partir de um JSON e desisti: cada cliente quer algo um pouco diferente, e editar o HTML direto é mais rápido que ampliar um esquema para cobrir todos os casos. Em vez disso, cada cliente parte de uma cópia de uma vitrine.

## Qualidade

Cada push e cada pull request rodam dois jobs no GitHub Actions ([`qualidade.yml`](.github/workflows/qualidade.yml)), os dois em [`testes/`](testes/README.md). Essa pasta tem `package.json` próprio e fica fora da publicação, então o site continua sem dependências.

- **Playwright (TypeScript):** as 22 páginas em computador, tablet e celular. O que confere:
  - nenhum erro no console, arquivo faltando ou rolagem lateral, e todo elemento animado termina visível;
  - todo link interno e toda `#âncora` funcionam, assim como as regras do `_redirects` e a página 404;
  - a gaveta, os formulários, o seletor de preço e a alternância do portfólio funcionam;
  - o formulário de orçamento monta a mensagem certa para o WhatsApp;
  - SEO básico: idioma, título, tamanho da descrição, um único `h1` e `noindex` só nas vitrines.
- **axe-core:** regras WCAG 2.1 níveis A e AA em todas as páginas, no computador e no celular.
- **Lighthouse CI:** 8 páginas, 3 execuções cada, com notas mínimas e limite de deslocamento de layout (CLS ≤ 0,1).

Um servidor Node sem dependências (`testes/servidor.mjs`) imita a Cloudflare nos testes: índice de pastas, página 404 e o arquivo `_redirects`.

**O que os testes pegaram logo na primeira rodada:**
- **Contraste abaixo de 4,5:1** em três lugares: sobretítulos verdes sobre fundo esverdeado, amarelo sobre azul e um "/mês" claro demais.
- **Ordem dos títulos:** duas páginas pulavam do `h1` para o `h3`.
- **Um link sem nome:** no celular, o link do logo no topo não tinha nome acessível.
- **Um deslocamento de layout de 0,10 que aparecia só às vezes.** Rastreando os eventos de deslocamento, vi o `<main>` inteiro descer uns 90 px: a faixa de demonstração entrava por um script com `defer` depois da primeira pintura. Carregar esse script pequeno, que só existe nas vitrines, no início do `<body>` e pré-carregar a fonte do texto levou o CLS a 0, e o limite de CLS agora garante que ele fique lá.

![Site de 5 páginas da barbearia no celular: menu em gaveta e troca de página](docs/img/gaveta-celular.gif)

## Um cliente novo com um comando

Transformar uma vitrine em site de cliente era um passo a passo manual de seis etapas, e esquecer uma custa caro: se o `noindex` fica, o cliente nunca aparece no Google. A [`ferramentas/novo-cliente`](ferramentas/README.md) é uma ferramenta de linha de comando em Node.js que faz a parte mecânica em segundos:

- **Copia só o que as páginas usam** para uma estrutura `assets/` limpa, reescrevendo os caminhos no HTML e no CSS.
- **Tira a camada de demonstração** e liga todos os botões e formulários ao WhatsApp de verdade do cliente.
- **Troca o negócio fictício pelo do cliente.** Os artigos mudam conforme o gênero do nome novo ("da Navalha Fina" → "do Studio Corte"), então o texto continua natural.
- **Lista tudo o que ainda é fictício,** com arquivo e linha, no roteiro do site novo.

O mesmo núcleo roda em dois lugares. Um painel web privado no próprio site tem formulário, prévia em tamanho de celular e de computador e download em .zip, então criar o site de um cliente não exige terminal. A versão de linha de comando continua lá, para automatizar. O núcleo não usa nenhuma API do Node: cada porta de entrada entrega a ele uma função que lê arquivos (`fetch` no navegador, `fs` no Node), e as duas geram sites idênticos byte a byte. O gerador de .zip do painel tem umas 100 linhas de JavaScript, sem dependências.

As edições no HTML são cirúrgicas: o parse5 informa a posição exata de cada tag e atributo, e as mudanças entram nessas posições. Assim o cliente recebe o mesmo HTML formatado à mão, e não a saída de um serializador. Os tipos são conferidos com JSDoc e `tsc`, ainda sem etapa de build. A cada push, o CI converte as seis vitrines e confere três coisas: nenhum resto de demonstração ficou para trás, todo arquivo citado existe e todo botão abre a conversa certa no WhatsApp, com a mesma mensagem.

## Resultados

| | |
|---|---|
| Lighthouse (celular, limitação simulada) | Desempenho 97–100 · Acessibilidade 100 · Boas práticas 100 · SEO 100 |
| Deslocamento de layout (CLS) | 0 em todas as páginas auditadas |
| Maior elemento visível (LCP, celular simulado) | 0,9–1,7 s |
| Peso das páginas | 81–327 KB (a maior é a inicial, com as telas de celular) |
| Verificações automáticas | 159 verificações no navegador a cada push (cerca de 3 minutos no CI), 24 execuções do Lighthouse e 34 testes da ferramenta de clientes e do painel |
| Custo de hospedagem | Zero |

Em novembro de 2026 o negócio ainda não tem clientes pagantes. Este site e as vitrines são a primeira coisa que um possível cliente vê.

## Próximos passos

- **Versão 2 da ferramenta de clientes:** gerar `sitemap.xml`, `robots.txt`, endereço oficial (canonical) e dados estruturados de negócio local, e rodar os testes do Playwright e do axe em cada site gerado.
- **Um backend pequeno na Cloudflare:** pedidos de orçamento guardados no D1, bloqueio de spam com o Turnstile e um painel privado atrás do Cloudflare Access. Só no meu site, para os sites de clientes continuarem sem peças móveis.
- **Domínio próprio** e SEO do próprio site de vendas.

## Como é feito

Trabalho com o Claude (assistente de IA da Anthropic) como par de programação. Eu defino a direção, reviso cada mudança num branch de prévia e decido o que vai para o ar. Por isso alguns commits o listam como coautor.

## Rodar no computador

O site não precisa de build: abra com qualquer servidor estático (por exemplo, o Live Server do VS Code). Para rodar os testes:

```bash
cd testes
npm install
npx playwright install chromium
npm test             # Playwright + axe
npm run lighthouse   # Lighthouse CI (precisa do Chrome)
```

## Estrutura

```
index.html, orcamento.html, politicas.html, 404.html   site de vendas
assets/                                                CSS, JS, fontes próprias, imagens
modelos/<negócio>/                                     vitrine em landing page
modelos/<negócio>-completo/                            vitrine em site de 5 páginas
modelos/comum/                                         peças comuns: demonstração, animações e várias páginas
testes/                                                testes automáticos (não são publicados)
ferramentas/                                           ferramenta "novo cliente": o núcleo é publicado para o painel; terminal e testes não
painel/                                                painel privado para criar sites de clientes
docs/img/                                              imagens deste README (não são publicadas)
```
