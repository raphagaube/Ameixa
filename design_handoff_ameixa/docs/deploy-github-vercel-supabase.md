# Infraestrutura: GitHub + Supabase + Vercel

## 1. Repositório

```bash
npx create-next-app@latest ameixa --typescript --tailwind --app --eslint
cd ameixa
git init && git add -A && git commit -m "chore: scaffold"
gh repo create ameixa --private --source=. --push
```

Branches: `main` (produção) e `dev` (integração). Proteja `main` exigindo PR e CI verde.

## 2. Supabase

```bash
npm i @supabase/supabase-js @supabase/ssr
npm i -D supabase
npx supabase init
npx supabase link --project-ref <ref-do-projeto>
```

Coloque os SQL deste pacote em `supabase/migrations/` na ordem:

1. `schema.sql` — tipos, tabelas, índices, triggers
2. `policies.sql` — RLS
3. `functions.sql` — geração de séries e views
4. `seed.sql` — categorias, subcategorias e formas padrão

```bash
npx supabase db push
```

**Auth** — Authentication › Providers: e-mail e senha ligados, "Confirm email" ligado.
Em URL Configuration, adicione `https://<projeto>.vercel.app/auth/callback` e
`http://localhost:3000/auth/callback`. A recuperação de senha usa
`supabase.auth.resetPasswordForEmail(email, { redirectTo })`, que é exatamente o "link
por e-mail" pedido no protótipo. Personalize o template em Authentication › Emails.

**Storage** — bucket privado `importacoes` para guardar os OFX/planilhas enviados
(opcional, útil para reprocessar).

**Realtime** — habilite em `lancamentos` se quiser que dois dispositivos do mesmo perfil
sincronizem sozinhos.

## 3. Vercel

```bash
npm i -g vercel
vercel link
```

Ou conecte o repositório em vercel.com/new — cada PR ganha um deploy de preview.

Variáveis de ambiente (Production, Preview e Development):

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role>   # apenas em rotas de servidor
```

Nunca exponha a service role no cliente. Use-a só em Route Handlers / Server Actions.

**PWA** — o app é para celular: adicione `manifest.json`, ícones a partir de
`ameixa-icone-crop.png` e `display: standalone`, para instalar na tela inicial.

## 4. CI (`.github/workflows/ci.yml`)

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test --if-present
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

## 5. Bibliotecas sugeridas

| Necessidade | Pacote |
| --- | --- |
| Estado de servidor e cache | `@tanstack/react-query` |
| Formulários e validação | `react-hook-form` + `zod` |
| Gráficos | `recharts` (ou SVG próprio, como no protótipo) |
| Excel | `xlsx` (ler .xlsx/.xls e escrever a exportação) |
| CSV | `papaparse` |
| OFX | parser próprio de ~40 linhas (regex sobre `STMTTRN`) — veja o protótipo |
| PDF | `window.print()` com CSS `@media print` (já resolvido no protótipo) |
| Datas | `date-fns` com locale `pt-BR` |
| Ícones | `lucide-react`, stroke 1.5 |

## 6. Planilhas Google
Duas rotas possíveis:
- **Simples**: o usuário publica a planilha como CSV e cola o link; o servidor faz fetch
  do CSV (evita CORS fazendo o fetch em Route Handler).
- **Completa**: OAuth do Google + Sheets API, com `drive.readonly`. Mais trabalho e exige
  tela de consentimento; só vale se o usuário quiser sincronização contínua.
