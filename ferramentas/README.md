# Ferramentas

Ferramentas de apoio às vendas. Esta pasta não é publicada na Cloudflare (está no `.assetsignore`).

## novo-cliente

Transforma uma vitrine (`modelos/...`) num site de cliente. Roda **uma vez**, no começo de cada cliente; depois disso o site é HTML normal, editado à mão.

Tem duas portas de entrada para o mesmo núcleo (`novo-cliente/montar.mjs`):

- **Painel no navegador:** `/painel/` no próprio site. Formulário, prévia das páginas (celular e computador) e download do site em .zip. O painel não aparece em nenhum link do site e tem `noindex`; quando houver domínio próprio, fica protegido com login pelo Cloudflare Access.
- **Terminal:** o comando abaixo, que grava o site direto numa pasta.

O núcleo não usa nada do Node: lê os arquivos por uma função que cada porta fornece (o painel busca no próprio site; o terminal lê do disco) e devolve o site em memória. Por isso painel e terminal geram exatamente os mesmos arquivos.

### Pelo terminal

```bash
cd ferramentas
npm install
npm run novo-cliente            # pergunta tudo no terminal
```

Ou sem perguntas (bom para repetir):

```bash
node novo-cliente/cli.mjs --modelo barbearia --versao completo \
  --nome "a Barbearia do Zé" --whatsapp "(11) 98765-4321" \
  --cidade "São Paulo" --bairro "a Mooca" --endereco "Rua Tal, 45" \
  --dominio barbeariadoze.com.br --git --sim
```

`node novo-cliente/cli.mjs --ajuda` lista todas as opções. O site sai em `../clientes/<nome-do-negócio>` (fora deste repositório), ou onde `--saida` mandar.

### O que ela faz (nas duas portas)

1. **Copia só o que o cliente precisa:** as páginas da vitrine e os arquivos que elas usam, organizados em `assets/css`, `assets/js`, `assets/fonts`. Os caminhos são reescritos no HTML e no CSS.
2. **Tira a camada de demonstração:** faixa "negócio fictício", janela de WhatsApp de mentira, `noindex`, favicon do Arthur e atributos de demonstração.
3. **Liga o WhatsApp de verdade:**
   - cada botão com `data-whats` ganha um link `wa.me` com a mensagem (funciona até sem JavaScript);
   - entra o `assets/js/whats.js` com o número do cliente, que implementa `window.enviarWhats(msg)`, a mesma função que as vitrines usam.
4. **Troca a identidade fictícia:** nome do negócio, endereço, bairro, profissional, iniciais e e-mail. Acerta artigos e contrações pelo gênero do nome novo ("da Navalha Fina" → "do Studio Corte", "no Centro" → "na Mooca").
5. **Landing page com título de verdade:** o título e a descrição de demonstração viram os da página inicial do site completo do mesmo modelo.
6. **Lista o que ainda é fictício:** nomes da equipe, fotos de exemplo, textos "Na sua página...", palavras de profissão e gênero. A lista sai no terminal e no `LEIA-ME.md` do cliente, com arquivo e linha.
7. **Prepara a publicação:** `wrangler.jsonc` com o nome do projeto, `.assetsignore` e, com `--git`, o repositório com o primeiro commit.

### Como funciona por dentro

- **Edição cirúrgica de HTML:** o [parse5](https://github.com/inikulin/parse5) lê cada página e informa a posição exata de cada tag e atributo. As mudanças são aplicadas nessas posições, então o HTML do cliente sai com a mesma formatação da vitrine, e não reescrito por um serializador.
- **Trocas de nome sem efeito cascata:** cada troca vira um marcador e só no fim os marcadores viram texto. Assim um nome novo nunca é trocado de novo pela regra seguinte.
- **Validação na entrada:**
  - WhatsApp com DDD que existe e celular com o 9 (`(11) 98765-432` é recusado);
  - domínio e e-mail;
  - nome do projeto sem acento.

| Arquivo | Papel |
|---|---|
| `novo-cliente/montar.mjs` | Núcleo: monta o site em memória (páginas, arquivos, CSS, LEIA-ME); roda no Node e no navegador |
| `novo-cliente/gerar.mjs` | Porta do terminal: lê as vitrines do disco e grava a pasta do cliente |
| `novo-cliente/cli.mjs` | Perguntas e opções de linha de comando |
| `novo-cliente/caminhos.mjs` | Caminhos de arquivo sem depender do Node |
| `novo-cliente/arquivos.mjs` | Arquivos criados para o cliente: `whats.js`, `wrangler.jsonc`, `.assetsignore` |
| `../painel/` | Porta do navegador: `index.html`, `painel.js`, `zip.mjs` (gerador de .zip próprio) e `vendor/` (cópia do parse5) |
| `novo-cliente/html.mjs` | Leitura com posições e edições no HTML |
| `novo-cliente/texto.mjs` | Troca de nomes com artigos e contrações |
| `novo-cliente/entrada.mjs` | Validação do que a pessoa digita |
| `novo-cliente/modelos.mjs` | O que é fictício em cada vitrine e o que perguntar |

### Testes

```bash
npm test        # node:test: unitários, as 6 vitrines convertidas de verdade e o .zip do painel
npm run tipos   # TypeScript conferindo os comentários JSDoc (sem etapa de build), inclusive do painel
npm run vendor  # depois de atualizar o parse5: copia a versão nova para painel/vendor
```

O painel também tem teste no navegador (`testes/specs/painel.spec.ts`):
- validação dos campos;
- prévia, com navegação pelas páginas;
- download do .zip;
- acessibilidade.

O teste de integração gera um cliente a partir de cada uma das 6 vitrines (3 modelos × landing page e site completo). Em cada site gerado, ele confere que:
- nenhum resto de demonstração ficou para trás;
- todo arquivo citado existe;
- todo botão abre o WhatsApp do cliente com a mesma mensagem;
- os nomes entraram com o artigo certo.

Roda no GitHub Actions a cada push, junto com os testes do site.

### Ainda não faz (próxima versão)

- `sitemap.xml`, `robots.txt`, endereço oficial (canonical), tags de prévia e dados estruturados de negócio local.
- Rodar os testes do Playwright e do axe no site gerado.
