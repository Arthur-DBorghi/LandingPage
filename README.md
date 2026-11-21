# Landing pages for small local businesses

[![Quality](https://github.com/Arthur-DBorghi/LandingPage/actions/workflows/qualidade.yml/badge.svg)](https://github.com/Arthur-DBorghi/LandingPage/actions/workflows/qualidade.yml)

**Live:** https://arthurborghi.com.br · [Versão em português](README.pt-BR.md)

A side business I run alongside a full-time IT job: ready-made landing pages and 5-page websites for barbershops, nail salons, pet shops, accountants and other local businesses around Cotia and Barueri, near São Paulo. This repository is the sales site, four demo businesses (all fictional) and a private sales panel. Each demo exists as a one-page landing page and as a full 5-page site, with an optional fixed background, so a prospect can compare versions of the same business.

![Portfolio cards switching between the landing page and the full site, and turning on the fixed background](docs/img/portfolio.gif)

## The problem

Most small businesses in my area live on Instagram and WhatsApp. They want a page that shows up on Google and sends customers straight to a WhatsApp chat, but agency prices are out of reach, and site builders still leave them doing the work.

My constraints shaped every decision:

- **Time:** about 4 hours a week to build, more only when there is a paying client.
- **Support:** each client must cost almost nothing to keep online, or the monthly maintenance plan stops making sense.
- **Price:** R$ 500 for a landing page, R$ 850 for a 5-page site. That only works if a new client starts from a finished, tested template.

## Key decisions

**1. Plain HTML, CSS and JavaScript, no framework and no build step.**
These pages are mostly content with a few interactions (a mobile drawer, a price selector, forms that compose a WhatsApp message). A framework would add a build, dependency updates and page weight, and buy nothing a visitor would notice. The audited pages weigh between 84 and 356 KB. The trade-off is repetition: the header, drawer and footer of the 5-page sites were generated once and are now plain HTML edited by hand. For a handful of pages per client, that is cheaper than maintaining a component system.

**2. Cloudflare instead of Netlify, Vercel or GitHub Pages.**
The site started on Netlify, whose free plan moved to monthly credits (15 per deploy, roughly 20 deploys a month) and pauses sites when they run out. Vercel's free tier and GitHub Pages both restrict commercial use. Cloudflare Workers static assets serve static files at no cost, allow commercial use and give every Git branch its own preview URL, which became the review workflow: every change ships to a branch, gets checked on the preview, and only then merges to `main`. Branch previews and the sales panel sit behind Cloudflare Access.

**3. One stylesheet per business, two products on top of it.**
The 5-page sites load the landing page's own stylesheet and add one shared file (`modelos/comum/site.css`) for menus, page headers, the drawer and the footer. That shared file reads colors through CSS custom properties, so the barbershop's dark gold theme came from overriding 11 variables, not from writing a second set of components.

**4. The demo layer is removable by design.**
Every WhatsApp button in the demos carries a `data-whats` attribute. On the demos, `demo.js` adds the "this is a fictional business" banner and shows the message that would be sent. To turn a demo into a client site, you delete that script and swap the attributes for real `wa.me` links. Nothing else in the code knows the demo exists.

**5. Animations that cannot hide content.**
Scroll animations only switch on once JavaScript runs (a class on `<html>`), so with JavaScript off nothing is left invisible. They respect the system's reduced-motion setting, and they use the individual `translate`/`scale` properties so they never fight with hover effects that use `transform`.

**6. No JSON template engine, but layout variations.**
I considered a JSON-driven editor that would generate each client's page and dropped it: every client wants something slightly different, and editing HTML directly is faster than growing a schema to cover every case. Each client starts from a copy of a demo. To keep client sites from looking alike, one stylesheet (`modelos/comum/variacoes.css`) adds variations that work on every demo: four hero layouts, a fixed background that the page scrolls over, and sections that can be reordered or hidden. It only uses classes and variables that all four demos share.

## Quality

Every push and pull request runs three jobs in GitHub Actions ([`qualidade.yml`](.github/workflows/qualidade.yml)). The browser tests live in [`testes/`](testes/README.md), which has its own `package.json` and is excluded from deployment, so the site itself stays dependency-free.

- **Playwright (TypeScript):** all 34 pages at desktop, tablet and phone sizes. The checks:
  - no console errors, missing files or horizontal scroll, and every animated element ends up visible;
  - every internal link and `#anchor` resolves, and the `_redirects` rules and the 404 page work;
  - the drawer, forms, price selector, portfolio toggles and fixed background behave as expected;
  - page changes on the 5-page sites: transition rules loaded, the next page prepared on hover, no entrance animation when arriving from the same site;
  - the quote form builds the right WhatsApp message;
  - SEO: language, title, description length, a single `h1`, `noindex` only on the demos, canonical URLs, `robots.txt` and `sitemap.xml`;
  - the sales panel, end to end (see below).
- **axe-core:** WCAG 2.1 A and AA rules on every page, on desktop and phone, plus heading order.
- **Lighthouse CI:** 10 pages, 3 runs each, with minimum scores and a layout-shift budget (CLS ≤ 0.1).
- **Client tool:** converts all eight demos on every push (see below).

A zero-dependency Node server (`testes/servidor.mjs`) mimics Cloudflare's behavior for the tests: directory indexes, the 404 page and the `_redirects` file.

**What the tests caught:**
- **Color contrast below 4.5:1** in three places: green labels on a tinted background, yellow text on blue and a muted price suffix.
- **Heading order:** pages that jumped from `h1` to `h3`. Lighthouse flagged one; a new axe check then found eight across the demos. Each got a screen-reader-only `h2`, and the check now runs on every page.
- **An unnamed link:** on phones the logo link in the header had no accessible name.
- **A layout shift of 0.10 that only showed up sometimes.** Tracing the shift entries showed the whole `<main>` moving down about 90 px: the demo banner was inserted by a deferred script after the first paint. Loading that small demo-only script at the top of `<body>` and preloading the body font brought CLS to 0, and the CLS budget now keeps it there.
- **A home page LCP that jumped between 0.9 and 2.6 s across runs.** The largest element was the animated hero title. Leaving the title out of the entrance animation made it a steady 0.9 s.

![The 5-page barbershop site on a phone: drawer menu and page change](docs/img/gaveta-celular.gif)

## Fast page changes

On the 5-page sites, the first visit and every page change were tuned with web platform features only, no framework:

- **Speculation Rules:** in Chrome and Edge, hovering a menu link prerenders the next page, so the click opens it instantly. Other browsers get a `<link rel="prefetch">` on hover, touch or focus. Only pages of the same site qualify; WhatsApp buttons never do.
- **Cross-document View Transitions:** `@view-transition { navigation: auto; }` replaces the white flash between pages with a short fade. The header, the demo banner and the WhatsApp button keep their place (`view-transition-name`); only the content changes. Reduced-motion users get no animation.
- **No waiting for animations:** arriving from another page of the same site, whatever is already on screen shows up at once. The entrance animation stays for the first visit and for content revealed on scroll.
- **Caching:** by default every asset is revalidated on every page. A `_headers` file keeps CSS and JS for 10 minutes, images for a day and fonts for a year, and the client tool writes the same file into every client site.

On a simulated slow 4G phone with a 4× slower CPU, a 5-page demo shows its content in about 0.95 s and is fully settled at about 1 s (it was 1.4 s before the animation was shortened).

## A sales panel and a one-command client tool

Turning a demo into a client's site used to be a six-step manual checklist, and forgetting one step is expensive: leave the `noindex` tag and the client never shows up on Google. [`ferramentas/novo-cliente`](ferramentas/README.md) does the mechanical part in seconds:

- **Copies only what the pages use** into a clean `assets/` structure, rewriting paths in both the HTML and the CSS.
- **Strips the demo layer** and wires every button and form to the client's real WhatsApp number.
- **Swaps the fictional business for the client's.** Portuguese articles change with the new name's gender ("da Navalha Fina" → "do Studio Corte"), so the copy still reads naturally.
- **Lists everything still fictional,** with file and line, in the new site's to-do file, and writes the Cloudflare config and cache headers.

The same core runs in two places. The CLI is there for scripting. The private **sales panel** (`/painel`) is what I use in front of a prospect:

- fill in the business name and WhatsApp number, and get a live preview at phone and desktop sizes;
- **click any text to edit it** in place (Enter saves, Esc undoes);
- **change brand colors**, with a warning when text contrast drops below 4.5:1;
- **change the layout:** hero style, fixed background, section order, hidden sections;
- present it full screen, then download the client's site as a .zip that matches the preview.

![The sales panel: generating a site, editing the title in place, then switching the hero and the background](docs/img/painel.gif)

The core never touches Node APIs: each entry point hands it a file reader (`fetch` in the browser, `fs` in Node), and both produce byte-identical sites. The panel's .zip writer is about 100 lines of dependency-free JavaScript. HTML edits are surgical, in the tool and in the panel: parse5 reports the exact position of every tag and attribute, and changes are applied at those offsets, so the client gets the same hand-formatted HTML instead of serializer output. Text typed in the panel is sanitized down to plain text plus the inline tags the demo already uses. Types are checked with JSDoc and `tsc`, still without a build step. On every push, CI converts all eight demos and checks that no demo leftovers remain, every referenced file exists and every button opens the right WhatsApp chat with the same message.

## Results

| | |
|---|---|
| Lighthouse (mobile, simulated throttling) | Performance 99–100 · Accessibility 100 · Best Practices 100 · SEO 100 on the sales site (demos are `noindex` on purpose) |
| Cumulative Layout Shift | 0 on all audited pages |
| Largest Contentful Paint (simulated mobile) | 0.9–1.5 s |
| Page weight | 84–356 KB (the largest is the home page, with the phone mockups) |
| Automated checks | 209 browser checks per push, 30 Lighthouse runs and 47 tests for the client tool and panel |
| Hosting cost | Zero (plus R$ 40 a year for the domain) |

As of November 2026 the business has no paying clients yet. This site and its demos are the first thing a prospect sees.

## What's next

- **Version 2 of the client tool:** generate `sitemap.xml`, `robots.txt`, canonical URLs and LocalBusiness structured data, and run the Playwright and axe suites against each generated site.
- **A small backend on Cloudflare:** store quote requests in D1, block spam with Turnstile and add a private dashboard behind Cloudflare Access. This goes on my own site only, so client sites keep zero moving parts.
- **One landing page per niche** for local search ("websites for pet shops in Cotia").

## How it's built

I work with Claude (Anthropic's AI assistant) as a pair programmer. I set the direction, review every change on a preview branch and decide what ships. That's why some commits list it as co-author.

## Run it locally

The site needs no build: open it with any static server (for example VS Code's Live Server). To run the tests:

```bash
cd testes
npm install
npx playwright install chromium
npm test             # Playwright + axe
npm run lighthouse   # Lighthouse CI (needs Chrome)
npm run imagens      # re-record the GIFs in this README (needs ffmpeg)

cd ../ferramentas
npm install
npm test             # client tool and panel (node:test)
npm run tipos        # type check (tsc over JSDoc)
```

## Project structure

```
index.html, orcamento.html, politicas.html, 404.html   sales site (Portuguese)
robots.txt, sitemap.xml, _headers, _redirects          search engines, caching and old URLs
assets/                                                CSS, JS, self-hosted fonts, images
modelos/<business>/                                    demo as a landing page
modelos/<business>-completo/                           demo as a 5-page site
modelos/comum/                                         shared pieces: demo layer, animations, multi-page, layout variations
painel/                                                private sales panel (behind Cloudflare Access)
ferramentas/                                           the "new client" tool: shared core is deployed for the panel, CLI and tests are not
testes/                                                automated tests (not deployed)
docs/img/                                              images for this README (not deployed)
```
