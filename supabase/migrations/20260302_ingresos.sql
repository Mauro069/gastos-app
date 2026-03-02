-- ============================================================
-- Tabla: ingresos
-- ============================================================

create table if not exists public.ingresos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  fecha       date not null,
  descripcion text not null,
  monto_usd   numeric(12, 2) not null check (monto_usd > 0),
  usd_rate    numeric(12, 2) not null check (usd_rate > 0),
  monto_ars   numeric(16, 2) not null,
  created_at  timestamptz not null default now()
);

-- Índice para queries por año (usamos .gte / .lte sobre fecha)
create index if not exists ingresos_user_fecha_idx
  on public.ingresos (user_id, fecha desc);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.ingresos enable row level security;

-- Cada usuario solo ve y opera sobre sus propios registros
create policy "ingresos: select own"
  on public.ingresos for select
  using (auth.uid() = user_id);

create policy "ingresos: insert own"
  on public.ingresos for insert
  with check (auth.uid() = user_id);

create policy "ingresos: update own"
  on public.ingresos for update
  using (auth.uid() = user_id);

create policy "ingresos: delete own"
  on public.ingresos for delete
  using (auth.uid() = user_id);
