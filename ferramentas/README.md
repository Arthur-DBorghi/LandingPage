# Ferramentas

Ferramentas de apoio às vendas. Esta pasta não é publicada na Cloudflare (está no `.assetsignore`).

## novo-cliente

Transforma uma vitrine (`modelos/...`) num site de cliente, numa pasta nova. Roda **uma vez**, no começo de cada cliente; depois disso o site é HTML normal, editado à mão.

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

### O que ela faz

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
| `novo-cliente/cli.mjs` | Perguntas e opções de linha de comando |
| `novo-cliente/gerar.mjs` | Monta o site: páginas, cópia dos arquivos, CSS, LEIA-ME |
| `novo-cliente/html.mjs` | Leitura com posições e edições no HTML |
| `novo-cliente/texto.mjs` | Troca de nomes com artigos e contrações |
| `novo-cliente/entrada.mjs` | Validação do que a pessoa digita |
| `novo-cliente/modelos.mjs` | O que é fictício em cada vitrine e o que perguntar |
| `novo-cliente/arquivos/whats.js` | Modelo do `whats.js` do cliente |

### Testes

```bash
npm test        # node:test: unitários + as 6 vitrines convertidas de verdade
npm run tipos   # TypeScript conferindo os comentários JSDoc (sem etapa de build)
```

O teste de integração gera um cliente a partir de cada uma das 6 vitrines (3 modelos × landing page e site completo). Em cada site gerado, ele confere que:
- nenhum resto de demonstração ficou para trás;
- todo arquivo citado existe;
- todo botão abre o WhatsApp do cliente com a mesma mensagem;
- os nomes entraram com o artigo certo.

Roda no GitHub Actions a cada push, junto com os testes do site.

### Ainda não faz (próxima versão)

- `sitemap.xml`, `robots.txt`, endereço oficial (canonical), tags de prévia e dados estruturados de negócio local.
- Rodar os testes do Playwright e do axe no site gerado.
