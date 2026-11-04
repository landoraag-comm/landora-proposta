# landora-proposta

Proposta comercial da Landora em formato de site: o cliente monta o app dele escolhendo módulos, separados em dois carrinhos.

- **Contrato (agora):** o que entra desde o início, com assinatura na própria página.
- **Depois (reservado):** o que o cliente tem interesse, mas não agora. Mostra só uma estimativa futura.

Site estático (HTML, CSS e JS puro), sem build.

## Estrutura

| Arquivo | Função |
|---|---|
| `data.js` | Módulos, preços, validade, WhatsApp e condições. **É aqui que você edita.** |
| `index.html` / `styles.css` / `app.js` | Página, identidade visual da Landora e lógica dos carrinhos |
| `firebase-config.js` | Config do Firebase (opcional). Se `null`, a assinatura não é gravada online |
| `firebase.json` / `firestore.rules` | Hosting e regras do Firestore |

## Personalizar por cliente

Use o link com o nome do cliente (as seleções ficam salvas por cliente no navegador dele):

```
https://SEU-DOMINIO/?cliente=Academia%20Force
```

Os valores em `data.js` são **exemplos**. Ajuste preços, módulos e o `whatsapp` (DDI+DDD, só números) antes de enviar.

## Testar localmente (Codespaces)

```bash
python3 -m http.server 8080
```

## Publicar (Firebase Hosting)

```bash
git pull
firebase deploy --only hosting
# se mudar firestore.rules:
firebase deploy --only firestore:rules
```

## Gravar propostas assinadas no Firestore (opcional)

1. No Console do Firebase, crie um app Web e cole o `firebaseConfig` em `firebase-config.js`.
2. Ative o Firestore e publique `firestore.rules`.
3. Cada assinatura vira um documento em `propostas` (cliente, nome, documento, assinatura, módulos e totais).

As regras permitem apenas **criar** documentos pelo site. A leitura é restrita a usuários autenticados com a claim `admin` (ou pelo Console do Firebase).

> A assinatura desenhada na página registra o aceite, mas não substitui uma assinatura eletrônica com validade jurídica reforçada (ex.: ICP-Brasil, Autentique, D4Sign). Se precisar disso, dá para integrar depois.
