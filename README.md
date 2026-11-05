# landora-proposta

Proposta comercial da Landora em formato de site: o cliente monta o app dele escolhendo módulos, separados em dois carrinhos.

- **Contrato (agora):** o que entra desde o início, com assinatura na própria página.
- **Depois (reservado):** o que o cliente tem interesse, mas não agora. Mostra só uma estimativa futura.

Site estático (HTML, CSS e JS puro), sem build.

## Estrutura

| Arquivo | Função |
|---|---|
| `data.js` | Módulos, preços, validade, WhatsApp e condições. **É aqui que você edita.** |
| `index.html` / `admin.js` / `admin.css` | **Painel administrativo** (abre na raiz do site, pede login Google) |
| `proposta.html` / `styles.css` / `app.js` | Modelo da proposta (base), identidade visual da Landora e lógica dos carrinhos |
| `store.js` | Acesso aos dados (Firestore ou modo demonstração) |
| `firebase-config.js` | Config do Firebase (opcional). Se `null`, a assinatura não é gravada online |
| `firebase.json` / `firestore.rules` | Hosting e regras do Firestore |

## Painel de propostas (`/admin`)

O endereço principal (`https://SEU-DOMINIO/`) abre o painel: login, criar proposta, cadastrar módulos, valores e imagens. O painel cria propostas novas usando este site como base: módulos, valores, categorias e até 4 imagens por módulo (aparecem no card e em "Ver detalhes").

- **Importar proposta (.json):** na lista de propostas, o botão abre um arquivo `.json` (slug, titulo, cliente, logo, validadeDias, whatsapp, instagram, termos e modulos com id, categoria, icone, nome, desc, detalhes, preco e mensal) direto no editor; ela só é gravada ao clicar em *Salvar proposta*. Use para propostas prontas sem deixar dados de cliente no repositório público.
- Cada proposta gera um link curto para o cliente: `https://SEU-DOMINIO/slug` (ex.: `https://proposta-landora.web.app/garrote-academia`). O Hosting reescreve qualquer caminho para o `proposta.html` (o modelo). Em modo demonstração local o link é `proposta.html?p=slug`.
- Endereços reservados: admin, index, proposta, assets, styles, app, data, store, firebase-config.
- Dados em `modelos/{slug}` e `modelos/{slug}/modulos/{id}` no Firestore.
- Login com Google. Quem pode editar é definido em `isAdmin()` no `firestore.rules` (lista de e-mails).
- Sem `firebase-config.js` preenchido, o painel roda em modo demonstração (localStorage).
- Precisa de: Authentication > Google ativado, Firestore criado e `npm run deploy:all`.

## Personalizar por cliente

Use o link com o nome do cliente (as seleções ficam salvas por cliente no navegador dele):

```
https://SEU-DOMINIO/?cliente=Nome%20do%20Cliente
```

Os valores em `data.js` são **exemplos**. Ajuste preços, módulos e o `whatsapp` (DDI+DDD, só números) antes de enviar.

## Testar localmente (Codespaces)

```bash
python3 -m http.server 8080
```

## Publicar (Firebase Hosting)

No Codespaces (o Firebase CLI já é instalado pelo `.devcontainer`; se não for: `npm i -g firebase-tools`):

```bash
git pull
firebase login --no-localhost      # só na primeira vez
firebase use --add                 # só na primeira vez: escolha o projeto
npm run deploy                     # = firebase deploy --only hosting
# se mudar firestore.rules:
npm run deploy:all
```

Domínio próprio: Console do Firebase > Hosting > Adicionar domínio personalizado.

### Deploy automático a cada merge na main (opcional)

```bash
firebase init hosting:github
```

Isso cria o workflow do GitHub Actions e o secret da service account.

## Gravar propostas assinadas no Firestore (opcional)

1. No Console do Firebase, crie um app Web e cole o `firebaseConfig` em `firebase-config.js`.
2. Ative o Firestore e publique `firestore.rules`.
3. Cada assinatura vira um documento em `propostas` (cliente, nome, documento, assinatura, módulos e totais).

As regras permitem apenas **criar** documentos pelo site. A leitura é restrita a usuários autenticados com a claim `admin` (ou pelo Console do Firebase).

> A assinatura desenhada na página registra o aceite, mas não substitui uma assinatura eletrônica com validade jurídica reforçada (ex.: ICP-Brasil, Autentique, D4Sign). Se precisar disso, dá para integrar depois.
