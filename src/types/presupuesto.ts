export interface PresupuestoItem {
  id?: string
  presupuesto_id?: string
  concepto: string      // matches concepto string used in gastos
  monto_usd: number
}

export interface Presupuesto {
  id: string
  user_id?: string
  year: number
  month: number         // 1–12
  total_usd: number
  usd_rate: number
  created_at?: string
  presupuesto_items: PresupuestoItem[]
}

/** Presupuesto item enriched with actual spend for display */
export interface PresupuestoItemConGasto extends PresupuestoItem {
  gastado_usd: number
  restante_usd: number   // monto_usd - gastado_usd (can be negative = overspent)
}

/** Derived view model for a full month's budget */
export interface PresupuestoConGasto {
  presupuesto: Presupuesto
  items: PresupuestoItemConGasto[]
  /** "El resto": total_usd minus all explicitly budgeted items */
  resto_presupuesto_usd: number
  /** Actual spend in categories NOT listed in items */
  resto_gastado_usd: number
  /** Total actually spent this month (all categories) */
  total_gastado_usd: number
}
