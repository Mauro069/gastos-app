export type CuentaTipo = 'disponible' | 'inversion'

export interface ActivoCuenta {
  id: string
  nombre: string
  tipo: CuentaTipo
  orden: number
  user_id?: string
  created_at?: string
}

export interface ActivoItem {
  id?: string
  snapshot_id?: string
  cuenta_id: string
  /** USD para cuentas de tipo 'disponible', ARS para tipo 'inversion' */
  valor: number
}

export interface ActivoSnapshot {
  id: string
  fecha: string
  usd_rate: number
  user_id?: string
  created_at?: string
  activos_items: ActivoItem[]
}
