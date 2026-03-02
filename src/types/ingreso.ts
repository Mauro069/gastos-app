export interface Ingreso {
  id: string
  fecha: string        // YYYY-MM-DD
  descripcion: string  // texto libre
  monto_usd: number    // ingresado manualmente
  usd_rate: number     // valor del dólar ese mes
  monto_ars: number    // calculado: monto_usd * usd_rate
  user_id?: string
  created_at?: string
}

export interface IngresoFormState {
  fecha: string
  descripcion: string
  monto_usd: number | string
  usd_rate: number | string
}
