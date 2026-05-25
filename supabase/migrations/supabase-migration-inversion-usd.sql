-- Migración: agregar tipo 'inversion_usd' a activos_cuentas
-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard)
--
-- Solo necesario si la columna 'tipo' tiene una restricción CHECK.
-- Si la columna es TEXT libre, esta migración NO es necesaria.

-- Verificar si existe la constraint (ejecutar primero esto para ver):
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name = 'activos_cuentas' AND constraint_type = 'CHECK';

-- Si existe una constraint llamada algo como activos_cuentas_tipo_check, ejecutar:
ALTER TABLE activos_cuentas
  DROP CONSTRAINT IF EXISTS activos_cuentas_tipo_check;

ALTER TABLE activos_cuentas
  ADD CONSTRAINT activos_cuentas_tipo_check
    CHECK (tipo IN ('disponible', 'inversion', 'inversion_usd'));
