# 💰 Sistema de Controle Financeiro

Aplicação web full-stack para gestão de finanças pessoais — transações, orçamentos, metas, investimentos e relatórios, com autenticação e persistência multi-usuário via Supabase.

<p align="left">
  <img alt="React" src="https://img.shields.io/badge/React-18.3-149ECA?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-Private-lightgrey">
</p>

🔗 **Deploy:** [software-financeiro.vercel.app](https://software-financeiro.vercel.app/)

---

## Visão geral

O projeto organiza toda a vida financeira do usuário em um único painel: lançamentos de receitas/despesas, visão mensal, categorias customizáveis, metas de economia, carteira de investimentos, planejamento orçamentário e relatórios exportáveis — tudo protegido por autenticação e isolado por usuário via Row Level Security no banco de dados.

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Dashboard** | Visão consolidada de saldo, receitas, despesas e indicadores do período |
| **Transações** | CRUD completo de lançamentos, com categorização e busca |
| **Mensal** | Recorte financeiro por mês, comparando entradas e saídas |
| **Categorias** | Categorias padrão e customizadas, com ícone e cor próprios |
| **Gráficos** | Visualizações (pizza, barras, linhas) por categoria e período, construídas com Recharts |
| **Metas** | Definição de metas de economia com prazo, progresso e valor-alvo |
| **Planejamento** | Orçamento por categoria com limites de gasto |
| **Investimentos** | Acompanhamento de aportes, valor atual e rentabilidade por instituição |
| **Relatórios** | Exportação de dados para Excel (`xlsx-js-style`) |
| **Perfil** | Dados da conta e preferências do usuário |
| **Autenticação** | Login e cadastro com Supabase Auth, rotas protegidas por sessão |

## Stack técnica

**Front-end**
- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite 6](https://vitejs.dev/)
- [React Router 7](https://reactrouter.com/) — roteamento com layouts aninhados e rotas protegidas
- [Tailwind CSS 4](https://tailwindcss.com/) + tema custom (`theme.css`)
- [Radix UI](https://www.radix-ui.com/) + componentes próprios em `src/app/components/ui` (padrão shadcn/ui)
- [MUI](https://mui.com/) para componentes complementares
- [Recharts](https://recharts.org/) para gráficos
- [Motion](https://motion.dev/) para animações e transições de layout
- [React Hook Form](https://react-hook-form.com/) para formulários
- [date-fns](https://date-fns.org/) para manipulação de datas
- [xlsx-js-style](https://www.npmjs.com/package/xlsx-js-style) para exportação de relatórios

**Back-end / dados**
- [Supabase](https://supabase.com/) — PostgreSQL, Auth e client JS (`@supabase/supabase-js`)
- Row Level Security (RLS) em todas as tabelas de domínio (`categories`, `goals`, `investments`, `budgets`), garantindo isolamento por `user_id`
- Triggers de `updated_at` automáticos via função `set_updated_at`

**Infra**
- Deploy na [Vercel](https://vercel.com/) (SPA rewrite configurado em `vercel.json`)

## Arquitetura

```
src/
├── app/
│   ├── components/       # Telas e componentes de domínio (Dashboard, Transactions, Goals, ...)
│   │   └── ui/            # Design system (baseado em Radix + shadcn/ui)
│   ├── context/            # FinanceContext — estado global de finanças
│   ├── layouts/            # MainLayout (com Sidebar) e DashboardLayout
│   └── pages/              # Login e Cadastro (rotas públicas)
├── hooks/                # Hooks customizados (ex: useUser)
├── lib/                  # Cliente Supabase
├── routes/               # ProtectedRoute — guarda de autenticação
└── styles/               # Tailwind, fontes e tema

supabase/
└── schema.sql            # DDL das tabelas de domínio, RLS e policies
```

O estado financeiro (transações, categorias, metas, investimentos, orçamentos) é centralizado no `FinanceContext`, que abstrai as chamadas ao Supabase e expõe os dados já normalizados para os componentes de tela. O acesso é protegido por `ProtectedRoute`, que verifica a sessão do Supabase Auth antes de liberar as rotas privadas dentro de `MainLayout`.

## Como rodar localmente

### Pré-requisitos
- Node.js 18+
- Um projeto no [Supabase](https://supabase.com/) com as tabelas de `transactions` e `profiles` já criadas

### Passos

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente (veja abaixo)

# 3. Rodar o schema no SQL Editor do Supabase
#    (arquivo: supabase/schema.sql)

# 4. Iniciar o servidor de desenvolvimento
npm run dev
```

### Variáveis de ambiente

Crie um arquivo `.env` na raiz com:

```env
VITE_SUPABASE_URL=sua-url-do-projeto
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### Build de produção

```bash
npm run build
```

## Banco de dados

O schema (`supabase/schema.sql`) provisiona as tabelas `categories`, `goals`, `investments` e `budgets`, todas com:
- Chave estrangeira para `auth.users`
- **Row Level Security** habilitado, com policies que restringem cada usuário aos seus próprios registros
- Triggers de `updated_at` automáticos
- Índices otimizados para as consultas mais comuns (por usuário + data/categoria)

As tabelas `transactions` e `profiles` são pré-existentes e assumidas pelo schema — ajuste os nomes de colunas no `FinanceContext` caso divirjam do seu banco.

## Roadmap

- [ ] Testes automatizados (unitários e E2E)
- [ ] CI/CD com validação de lint/build em PRs
- [ ] Internacionalização (i18n)
- [ ] Modo escuro persistente por usuário

---

<p align="center">Desenvolvido por <strong>Nicolas</strong></p>
