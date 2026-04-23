-- ─────────────────────────────────────────────────────────────────────────────
-- Presupuestos migration
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Presupuestos table (one per user per month)
create table if not exists presupuestos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  year       int  not null,
  month      int  not null check (month between 1 and 12),
  total_usd  numeric(12, 2) not null,
  usd_rate   numeric(12, 2) not null,
  created_at timestamptz default now(),
  unique (user_id, year, month)
);

-- 2. Presupuesto items (one row per budgeted category)
create table if not exists presupuesto_items (
  id             uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references presupuestos(id) on delete cascade,
  concepto       text not null,
  monto_usd      numeric(12, 2) not null,
  created_at     timestamptz default now()
);

-- 3. Row Level Security
alter table presupuestos      enable row level security;
alter table presupuesto_items enable row level security;

-- presupuestos: owner-only CRUD
create policy "presupuestos_select" on presupuestos
  for select using (auth.uid() = user_id);

create policy "presupuestos_insert" on presupuestos
  for insert with check (auth.uid() = user_id);

create policy "presupuestos_update" on presupuestos
  for update using (auth.uid() = user_id);

create policy "presupuestos_delete" on presupuestos
  for delete using (auth.uid() = user_id);

-- presupuesto_items: accessible when the parent presupuesto belongs to the user
create policy "presupuesto_items_select" on presupuesto_items
  for select using (
    exists (
      select 1 from presupuestos p
      where p.id = presupuesto_items.presupuesto_id
        and p.user_id = auth.uid()
    )
  );

create policy "presupuesto_items_insert" on presupuesto_items
  for insert with check (
    exists (
      select 1 from presupuestos p
      where p.id = presupuesto_items.presupuesto_id
        and p.user_id = auth.uid()
    )
  );

create policy "presupuesto_items_update" on presupuesto_items
  for update using (
    exists (
      select 1 from presupuestos p
      where p.id = presupuesto_items.presupuesto_id
        and p.user_id = auth.uid()
    )
  );

create policy "presupuesto_items_delete" on presupuesto_items
  for delete using (
    exists (
      select 1 from presupuestos p
      where p.id = presupuesto_items.presupuesto_id
        and p.user_id = auth.uid()
    )
  );
