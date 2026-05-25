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

-- 4. Tabla de settings por usuario (formas y categorías personalizadas)
create table if not exists user_settings (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  settings  jsonb not null default '{"formas": [], "conceptos": []}'::jsonb
);

alter table user_settings enable row level security;

create policy "user_settings: select own" on user_settings
  for select using (auth.uid() = user_id);

create policy "user_settings: insert own" on user_settings
  for insert with check (auth.uid() = user_id);

create policy "user_settings: update own" on user_settings
  for update using (auth.uid() = user_id);

create policy "user_settings: delete own" on user_settings
  for delete using (auth.uid() = user_id);

-- 5. Función para que el usuario pueda borrar su propia cuenta
create or replace function delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- 6. Índices para performance
create index if not exists gastos_user_fecha    on gastos(user_id, fecha);
create index if not exists gastos_user_concepto on gastos(user_id, concepto);

-- ============================================================
-- NUEVAS TABLAS: Presupuesto y Conversiones USDC
-- ============================================================

-- 7. Tabla de conversiones USDC → ARS
--    Registra cada vez que el usuario convierte USDC a pesos
create table if not exists conversiones_usdc (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  fecha         date not null,
  monto_usdc    numeric(14, 2) not null,   -- cuántos USDC convirtió
  tipo_cambio   numeric(10, 2) not null,   -- precio del USDC en ARS ese día
  monto_ars     numeric(14, 2) not null,   -- resultado: monto_usdc * tipo_cambio
  nota          text default '',
  created_at    timestamptz default now()
);

alter table conversiones_usdc enable row level security;

create policy "conversiones: select own" on conversiones_usdc
  for select using (auth.uid() = user_id);

create policy "conversiones: insert own" on conversiones_usdc
  for insert with check (auth.uid() = user_id);

create policy "conversiones: update own" on conversiones_usdc
  for update using (auth.uid() = user_id);

create policy "conversiones: delete own" on conversiones_usdc
  for delete using (auth.uid() = user_id);

-- 8. Tabla de presupuesto mensual
--    Una fila por mes por usuario con la distribución del ingreso en USD
--    y los límites de gasto por categoría en ARS
create table if not exists presupuesto_mensual (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  month_key       text not null,             -- formato "2026-04"
  ingreso_usd     numeric(10, 2) not null,   -- total cobrado en USD
  ahorro_usd      numeric(10, 2) default 0,  -- cuánto queda en USD (sin convertir)
  inversion_usd   numeric(10, 2) default 0,  -- cuánto se destina a inversiones en USD
  -- disponible_usd se calcula: ingreso_usd - ahorro_usd - inversion_usd
  -- categorias_budget: array JSON de { concepto: string, monto_ars: number }
  categorias_budget jsonb not null default '[]'::jsonb,
  notas           text default '',
  created_at      timestamptz default now(),
  unique (user_id, month_key)
);

alter table presupuesto_mensual enable row level security;

create policy "presupuesto: select own" on presupuesto_mensual
  for select using (auth.uid() = user_id);

create policy "presupuesto: insert own" on presupuesto_mensual
  for insert with check (auth.uid() = user_id);

create policy "presupuesto: update own" on presupuesto_mensual
  for update using (auth.uid() = user_id);

create policy "presupuesto: delete own" on presupuesto_mensual
  for delete using (auth.uid() = user_id);

-- Índices
create index if not exists conversiones_user_fecha on conversiones_usdc(user_id, fecha);
create index if not exists presupuesto_user_month  on presupuesto_mensual(user_id, month_key);
