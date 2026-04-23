// ── Conversiones USDC → ARS ───────────────────────────────────────────────────

export interface ConversionUsdc {
  id: string
  user_id?: string
  fecha: string           // YYYY-MM-DD
  monto_usdc: number      // cuántos USDC convirtió
  tipo_cambio: number     // precio del USDC en ARS
  monto_ars: number       // resultado: monto_usdc * tipo_cambio
  nota?: string
  created_at?: string
}

export interface ConversionFormState {
  fecha: string
  monto_usdc: number | string
  tipo_cambio: number | string
  nota: string
}

// ── Presupuesto mensual ───────────────────────────────────────────────────────

export interface CategoriaBudget {
  concepto: string   // nombre dinámico de la categoría
  monto_ars: number  // límite en ARS para ese mes
}

export interface PresupuestoMensual {
  id: string
  user_id?: string
  month_key: string           // "2026-04"
  ingreso_usd: number         // total cobrado en USD
  ahorro_usd: number          // reservado para ahorro (no convertir)
  inversion_usd: number       // reservado para inversión en USD
  categorias_budget: CategoriaBudget[]
  notas?: string
  created_at?: string
}

export interface PresupuestoFormState {
  ingreso_usd: number | string
  ahorro_usd: number | string
  inversion_usd: number | string
  categorias_budget: CategoriaBudget[]
  notas: string
}
