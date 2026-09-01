# Ameixa — instruções do projeto

App de finanças pessoais, mobile-first, PT-BR. Stack: Next.js (App Router) +
TypeScript + Tailwind + Supabase, hospedado na Vercel.

## Referência de design
`design_handoff_ameixa/README.md` é a especificação. `Financas.dc.html` é o protótipo
navegável — abra no navegador para conferir comportamento e aparência antes de implementar
uma tela. O design é alta fidelidade: respeite cores, tamanhos e espaçamentos.

## Regras invioláveis
- **Aportes em meta não são despesa.** Nunca entram em receitas, despesas, gráficos,
  orçamentos, saldo ou relatórios.
- **Valores sempre positivos** no banco; o sinal vem de `tipo`.
- **RLS é a segurança**, não o filtro no cliente. Toda tabela nova nasce com política.
- **`fitid` único por usuário** — é o que impede duplicação na reimportação de OFX.
- **Elementos coloridos usam `--deep`**, nunca `--ac` puro.
- **Moeda em pt-BR**: `R$ 1.234,56`. Datas `dd/mm/aaaa`.
- Nenhum texto da interface em inglês.

## Convenções
- Componentes de servidor por padrão; `"use client"` só onde há interação.
- Acesso a dados por Server Actions ou Route Handlers; nada de service role no cliente.
- Formulários com `react-hook-form` + `zod`; mensagens de erro em português.
- Ícones `lucide-react` com `strokeWidth={1.5}`.
- Alvos de toque com no mínimo 44px.
- Respeite `prefers-reduced-motion` em qualquer animação.

## Comandos
```
npm run dev         # desenvolvimento
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # testes
npx supabase db push
```
