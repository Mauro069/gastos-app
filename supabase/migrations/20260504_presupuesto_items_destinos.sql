-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add destino support to presupuesto_items
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Make concepto nullable (destinos sin categoría vinculada envían null)
alter table presupuesto_items
  alter column concepto drop not null;

-- 2. Add alias (display name for destinos and grupos)
alter table presupuesto_items
  add column if not exists alias text;

-- 3. Add conceptos (array of categories for grupo items)
alter table presupuesto_items
  add column if not exists conceptos text[];

-- 4. Add es_destino flag
alter table presupuesto_items
  add column if not exists es_destino boolean default false;
