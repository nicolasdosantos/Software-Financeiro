-- Rode este arquivo no SQL Editor do Supabase.
-- Ele assume que voce JA TEM as tabelas public.transactions e public.profiles/perfil.
--
-- A tabela public.transactions precisa ter, no minimo, as colunas usadas pelo app:
-- id, user_id, type, amount, description, category, date, notes.
-- Se os nomes forem diferentes no seu Supabase, me manda o print/DDL que eu adapto o FinanceContext.

create extension if not exists pgcrypto;

create table if not exists public.categories (
  id text not null default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '📦',
  color text not null default '#94a3b8',
  type text not null default 'custom' check (type in ('default', 'custom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target numeric(12, 2) not null check (target > 0),
  current numeric(12, 2) not null default 0 check (current >= 0),
  deadline date not null,
  color text not null default '#204bca',
  icon text not null default '🎯',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  invested numeric(12, 2) not null check (invested >= 0),
  current_value numeric(12, 2) not null check (current_value >= 0),
  start_date date not null,
  institution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id text not null,
  limit_amount numeric(12, 2) not null default 0 check (limit_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id),
  foreign key (user_id, category_id) references public.categories(user_id, id) on delete cascade
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists set_investments_updated_at on public.investments;
create trigger set_investments_updated_at
before update on public.investments
for each row execute function public.set_updated_at();

drop trigger if exists set_budgets_updated_at on public.budgets;
create trigger set_budgets_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.goals enable row level security;
alter table public.investments enable row level security;
alter table public.budgets enable row level security;

drop policy if exists "Users can manage own categories" on public.categories;
create policy "Users can manage own categories"
on public.categories
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own goals" on public.goals;
create policy "Users can manage own goals"
on public.goals
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own investments" on public.investments;
create policy "Users can manage own investments"
on public.investments
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own budgets" on public.budgets;
create policy "Users can manage own budgets"
on public.budgets
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists categories_user_name_idx on public.categories(user_id, name);

-- Impede duas categorias com o mesmo nome para o mesmo usuário. Também é a
-- trava que resolve a race condition de criação das categorias padrão: se
-- duas abas tentarem criar as 11 categorias padrão ao mesmo tempo para um
-- usuário novo, a segunda leva erro de violação de unicidade em vez de
-- duplicar tudo (ver ensureDefaultCategories em FinanceContext.tsx).
-- ATENÇÃO: se você já tiver categorias duplicadas (mesmo nome) para o mesmo
-- usuário, este comando falha — nesse caso seria preciso limpar as
-- duplicatas antes de rodar esta linha.
create unique index if not exists categories_user_name_unique_idx on public.categories(user_id, name);
create index if not exists goals_user_deadline_idx on public.goals(user_id, deadline);
create index if not exists investments_user_start_date_idx on public.investments(user_id, start_date desc);
create index if not exists budgets_user_category_idx on public.budgets(user_id, category_id);

-- IMPORTANTE: transactions e a tabela mais sensivel do sistema (valores, descricoes,
-- categorias e notas financeiras de cada usuario). Sem RLS habilitado aqui, o filtro
-- por user_id feito no frontend (FinanceContext.tsx) e apenas cosmetico: qualquer
-- cliente HTTP que fale direto com a API REST do Supabase pode ler/editar/apagar
-- transacoes de QUALQUER usuario. Rode este bloco antes de usar dados reais.
alter table public.transactions enable row level security;

drop policy if exists "Users can manage own transactions" on public.transactions;
drop policy if exists "select_own_transactions" on public.transactions;
drop policy if exists "insert_own_transactions" on public.transactions;
drop policy if exists "update_own_transactions" on public.transactions;
drop policy if exists "delete_own_transactions" on public.transactions;

create policy "select_own_transactions"
on public.transactions
for select
using (auth.uid() = user_id);

create policy "insert_own_transactions"
on public.transactions
for insert
with check (auth.uid() = user_id);

create policy "update_own_transactions"
on public.transactions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "delete_own_transactions"
on public.transactions
for delete
using (auth.uid() = user_id);

create index if not exists transactions_user_date_idx on public.transactions(user_id, date desc);

-- ============================================================================
-- MIGRAÇÃO: orçamento por mês (rode este bloco mesmo se o resto do arquivo já
-- foi aplicado antes — é seguro rodar de novo, todos os comandos são
-- idempotentes). Sem isso, a tela de Planejamento não funciona: o código do
-- app já espera a coluna "month" existir na tabela budgets.
--
-- Antes, um limite de orçamento por categoria valia para sempre, em todos os
-- meses — não dava para, por exemplo, ter um limite maior em dezembro sem
-- mudar o limite do ano inteiro. Agora cada linha de budgets tem um "month":
--   month = ''        -> limite PADRÃO, vale em qualquer mês sem override
--   month = 'YYYY-MM' -> limite só daquele mês, tem prioridade sobre o padrão
-- Os limites já cadastrados viram automaticamente o padrão (month = '').
-- ============================================================================

alter table public.budgets add column if not exists month text not null default '';

-- A unique constraint antiga era só (user_id, category_id) — précisa sair
-- para permitir uma linha "padrão" (month = '') e, opcionalmente, uma linha
-- por mês específico para a mesma categoria. O nome exato da constraint
-- gerada pelo Postgres pode variar, então este bloco encontra e remove
-- qualquer unique constraint em (user_id, category_id) na tabela budgets,
-- em vez de assumir um nome fixo.
do $$
declare
  found_constraint text;
begin
  select c.conname into found_constraint
  from pg_constraint c
  where c.conrelid = 'public.budgets'::regclass
    and c.contype = 'u'
    and pg_get_constraintdef(c.oid) = 'UNIQUE (user_id, category_id)';

  if found_constraint is not null then
    execute format('alter table public.budgets drop constraint %I', found_constraint);
  end if;
end $$;

drop index if exists budgets_user_category_idx;

alter table public.budgets drop constraint if exists budgets_user_category_month_unique;
alter table public.budgets add constraint budgets_user_category_month_unique unique (user_id, category_id, month);

create index if not exists budgets_user_category_month_idx on public.budgets(user_id, category_id, month);

-- ============================================================================
-- CORREÇÃO DE SEGURANÇA (2026-09-10): public.profiles e as funções auxiliares
-- não são criadas por este arquivo (profiles veio do template padrão de Auth
-- do Supabase, de antes deste schema.sql existir) — mas as correções abaixo
-- são registradas aqui pra ficar documentado no repositório. Já aplicadas
-- direto no projeto via MCP do Supabase, com aprovação prévia.
--
-- profiles estava com policies cadastradas (select/insert/update, todas
-- auth.uid() = id) mas RLS DESLIGADO — ou seja, as policies nunca valiam de
-- verdade: qualquer requisição com a anon key conseguia ler/escrever
-- qualquer linha. O app não usa essa tabela em nenhum lugar do código (usa
-- user_metadata do Auth em vez dela), e o trigger que a popula no cadastro
-- (handle_new_user, SECURITY DEFINER) contorna RLS — então habilitar RLS não
-- teve nenhum efeito colateral.
-- ============================================================================

alter table public.profiles enable row level security;

-- A policy de UPDATE só tinha USING, sem WITH CHECK — um UPDATE poderia em
-- teoria reatribuir o "id" da linha pra outro valor sem validação no que é
-- de fato gravado.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Proteção padrão contra search_path hijacking. Seguro aqui: as duas funções
-- já qualificam tudo que usam (set_updated_at só mexe em campos do próprio
-- registro; handle_new_user referencia public.profiles com schema explícito,
-- e now()/insert são resolvidos via pg_catalog, sempre pesquisado independente
-- do search_path) — nenhuma mudança de comportamento.
alter function public.set_updated_at() set search_path = '';
alter function public.handle_new_user() set search_path = '';
