# Arthur Borghi · Landing pages para pequenos negócios

[![Qualidade](https://github.com/Arthur-DBorghi/LandingPage/actions/workflows/qualidade.yml/badge.svg)](https://github.com/Arthur-DBorghi/LandingPage/actions/workflows/qualidade.yml)

Site de venda de landing pages e sites de 5 páginas para pequenos negócios locais, com três vitrines de negócios fictícios (barbearia, contabilidade e pet shop), cada uma em versão de landing page e de site completo.

- **Site:** https://arthurdefendiborghi.arthur-defborghi.workers.dev
- **Stack:** HTML, CSS e JavaScript puro, sem etapa de build. Publicado na Cloudflare (Workers static assets) a cada push; cada branch ganha uma prévia.
- **Qualidade:** testes com Playwright, axe-core (WCAG 2.1 AA) e Lighthouse CI rodando no GitHub Actions. Detalhes em [`testes/`](testes/README.md).

## Pastas

```
index.html, orcamento.html, politicas.html, 404.html   site principal
assets/                                                CSS, JS, fontes e imagens
modelos/<negócio>/                                     vitrines em landing page
modelos/<negócio>-completo/                            vitrines em site completo (5 páginas)
modelos/comum/                                         peças compartilhadas pelas vitrines
testes/                                                testes automáticos (não são publicados)
```
