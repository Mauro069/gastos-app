-- Migración: agregar columna 'fijo' a la tabla gastos
-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard)

ALTER TABLE gastos
  ADD COLUMN IF NOT EXISTS fijo BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice opcional para filtrar fijos eficientemente
CREATE INDEX IF NOT EXISTS idx_gastos_fijo ON gastos (user_id, fijo);
