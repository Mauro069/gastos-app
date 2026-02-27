-- ============================================================
-- GASTOS APP — Supabase Schema
-- Corré esto en el SQL Editor de tu proyecto de Supabase
-- ============================================================

-- 1. Tabla de gastos
create table if not exists gastos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  fecha       date not null,
  cantidad    numeric(14, 2) not null,
  forma       text not null,
  concepto    text not null,
  nota        text default '',
  created_at  timestamptz default now()
);

-- 2. Tabla de tipos de cambio por mes
create table if not exists usd_rates (
  user_id    uuid references auth.users(id) on delete cascade not null,
  month_key  text not null,   -- formato "2026-02"
  rate       numeric(10, 2) not null,
  primary key (user_id, month_key)
);

-- 3. Row Level Security — cada usuario solo ve y modifica SUS datos
alter table gastos    enable row level security;
alter table usd_rates enable row level security;

-- Policies para gastos
create policy "gastos: select own" on gastos
  for select using (auth.uid() = user_id);

create policy "gastos: insert own" on gastos
  for insert with check (auth.uid() = user_id);

create policy "gastos: update own" on gastos
  for update using (auth.uid() = user_id);

create policy "gastos: delete own" on gastos
  for delete using (auth.uid() = user_id);

-- Policies para usd_rates
create policy "usd_rates: select own" on usd_rates
  for select using (auth.uid() = user_id);

create policy "usd_rates: insert own" on usd_rates
  for insert with check (auth.uid() = user_id);

create policy "usd_rates: update own" on usd_rates
  for update using (auth.uid() = user_id);

create policy "usd_rates: delete own" on usd_rates
  for delete using (auth.uid() = user_id);

-- 4. Índices para performance
create index if not exists gastos_user_fecha on gastos(user_id, fecha);
create index if not exists gastos_user_concepto on gastos(user_id, concepto);
