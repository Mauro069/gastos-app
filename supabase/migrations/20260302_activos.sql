-- ── Activos: Cuentas ──────────────────────────────────────────────────────────
-- Configurable accounts (e.g. Binance, Lemon, Efectivo, Uala, etc.)

CREATE TABLE IF NOT EXISTS activos_cuentas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('disponible', 'inversion')),
  orden       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE activos_cuentas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own activos_cuentas"
  ON activos_cuentas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activos_cuentas"
  ON activos_cuentas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activos_cuentas"
  ON activos_cuentas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activos_cuentas"
  ON activos_cuentas FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS activos_cuentas_user_orden
  ON activos_cuentas (user_id, orden ASC);


-- ── Activos: Snapshots ────────────────────────────────────────────────────────
-- Each snapshot is a point-in-time record of all balances + the dollar rate used

CREATE TABLE IF NOT EXISTS activos_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL,
  usd_rate    NUMERIC(12, 2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE activos_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own activos_snapshots"
  ON activos_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activos_snapshots"
  ON activos_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activos_snapshots"
  ON activos_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activos_snapshots"
  ON activos_snapshots FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS activos_snapshots_user_fecha
  ON activos_snapshots (user_id, fecha ASC);


-- ── Activos: Items ────────────────────────────────────────────────────────────
-- Per-account balance within a snapshot.
-- valor is in USD for tipo='disponible', in ARS for tipo='inversion'.

CREATE TABLE IF NOT EXISTS activos_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id  UUID NOT NULL REFERENCES activos_snapshots(id) ON DELETE CASCADE,
  cuenta_id    UUID NOT NULL REFERENCES activos_cuentas(id) ON DELETE CASCADE,
  valor        NUMERIC(18, 2) NOT NULL DEFAULT 0
);

ALTER TABLE activos_items ENABLE ROW LEVEL SECURITY;

-- Items inherit access through their parent snapshot (same user_id check via join)
CREATE POLICY "Users can select own activos_items"
  ON activos_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activos_snapshots s
      WHERE s.id = activos_items.snapshot_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own activos_items"
  ON activos_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activos_snapshots s
      WHERE s.id = activos_items.snapshot_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own activos_items"
  ON activos_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM activos_snapshots s
      WHERE s.id = activos_items.snapshot_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own activos_items"
  ON activos_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM activos_snapshots s
      WHERE s.id = activos_items.snapshot_id
        AND s.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS activos_items_snapshot
  ON activos_items (snapshot_id);
