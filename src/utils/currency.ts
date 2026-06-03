import type { Gasto, UsdRates } from '@/types'

const DEFAULT_RATE = 1000

/**
 * Returns the ARS-equivalent amount for a gasto.
 * If the gasto is in USD, it's multiplied by the rate for that month
 * (or the most recent prior rate, or DEFAULT_RATE as fallback).
 */
export function toARS(g: Gasto, usdRates: UsdRates): number {
  if (!g.moneda || g.moneda === 'ARS') return Number(g.cantidad)
  const mk = g.fecha.slice(0, 7) // "YYYY-MM"
  const rate = getRateForMonth(mk, usdRates)
  return Number(g.cantidad) * rate
}

export function getRateForMonth(mk: string, usdRates: UsdRates): number {
  if (usdRates[mk]) return usdRates[mk]
  const keys = Object.keys(usdRates).sort()
  const prior = [...keys].reverse().find((k) => k <= mk)
  return prior ? usdRates[prior] : DEFAULT_RATE
}
