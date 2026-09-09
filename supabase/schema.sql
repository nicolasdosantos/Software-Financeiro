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
