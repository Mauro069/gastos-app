import type { Gasto, UsdRates, Forma, Concepto } from './gasto'

export interface FetchAllResponse {
  gastos: Gasto[]
  usdRates: UsdRates
}

export interface CreateGastoData {
  fecha: string
  cantidad: number
  forma: Forma
  concepto: Concepto
  nota?: string
  moneda?: import('./gasto').Moneda
}

export interface UpdateMonthRateResponse {
  usdRates: UsdRates
}
