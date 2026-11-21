# Testes do site

Testes automáticos que rodam a cada push e pull request (GitHub Actions, arquivo `.github/workflows/qualidade.yml`).
Esta pasta não é publicada na Cloudflare (está no `.assetsignore`), então o site continua sem `package.json` e sem etapa de build.

## O que é testado

| Arquivo | O quê |
|---|---|
| `specs/paginas.spec.ts` | Todas as páginas em computador (1366px), tablet (900px) e celular (390px): sem erro no console, sem arquivo faltando, sem rolagem lateral, todo elemento animado termina visível |
| `specs/interacoes.spec.ts` | Menu e gaveta do site completo, formulários que montam a mensagem do WhatsApp, preço por porte do pet shop, botões de WhatsApp das vitrines, alternância do portfólio (abrindo em outra guia), "Fundo fixo" pelo card e pela URL (`?fundo=`), troca de página (view transition, speculation rules, sem animação vindo do próprio site), orçamento com `?modelo=` e `?plano=` |
| `specs/links.spec.ts` | Todo link interno abre, toda âncora (`#secao`) existe, redirecionamentos do `_redirects` e página 404 |
| `specs/seo.spec.ts` | Idioma, título, descrição e um único `h1` por página; `noindex` nas vitrines; títulos sem repetição; canonical e prévia de link com o domínio, `robots.txt` e `sitemap.xml` |
| `specs/acessibilidade.spec.ts` | axe-core com as regras WCAG 2.1 níveis A e AA, no computador e no celular, e ordem dos títulos (h1 → h2 → h3) em todas as páginas |
| `specs/painel.spec.ts` | Painel de vendas (só no computador): validação, prévia, edição de textos, cores e layout, fundo fixo, .zip e acessibilidade |
| `lighthouserc.json` | Lighthouse CI em 10 páginas (3 execuções cada): desempenho ≥ 90, acessibilidade ≥ 95, boas práticas ≥ 90, SEO ≥ 90 e CLS ≤ 0,1 |

`servidor.mjs` é um servidor estático sem dependências que imita a Cloudflare: `/pasta/` abre `index.html`, endereço inexistente devolve a página 404, as regras do `_redirects` funcionam e o que o `.assetsignore` não publica fica escondido. O `_headers` (cache) não é aplicado aqui.

## Rodar no computador

```bash
cd testes
npm install
npx playwright install chromium   # só na primeira vez
npm test                          # todos os testes do Playwright
npm run relatorio                 # abre o relatório no navegador
npm run lighthouse                # Lighthouse CI (precisa do Chrome instalado)
npm run tipos                     # confere os tipos do TypeScript
npm run imagens                   # regrava os GIFs do README em docs/img (precisa do ffmpeg)
```

Para ver o site como os testes veem: `npm run servidor` e abrir http://localhost:4173.
