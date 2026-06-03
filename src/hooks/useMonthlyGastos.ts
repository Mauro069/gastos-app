import { useMemo } from 'react'
import type { Gasto, UsdRates } from '@/types'
import { MONTH_NAMES } from '@/constants'
import { toARS } from '@/utils/currency'

export function useMonthlyGastos(
  allGastos: Gasto[],
  selectedYear: number,
  selectedMonth: number,
  usdRates: UsdRates = {},
) {
  const gastosDelMes = useMemo(
    () =>
      allGastos.filter(g => {
        const d = new Date(g.fecha + 'T12:00:00')
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
      }),
    [allGastos, selectedYear, selectedMonth],
  )

  const { prevYear, prevMonthIdx } = useMemo(() => {
    if (selectedMonth === 0) return { prevYear: selectedYear - 1, prevMonthIdx: 11 }
    return { prevYear: selectedYear, prevMonthIdx: selectedMonth - 1 }
  }, [selectedYear, selectedMonth])

  const gastosDelMesAnterior = useMemo(
    () =>
      allGastos.filter(g => {
        const d = new Date(g.fecha + 'T12:00:00')
        return d.getFullYear() === prevYear && d.getMonth() === prevMonthIdx
      }),
    [allGastos, prevYear, prevMonthIdx],
  )

  const prevMonthLabel = `${MONTH_NAMES[prevMonthIdx]}${String(prevYear).slice(2)}`
  const currMonthLabel = `${MONTH_NAMES[selectedMonth]}${String(selectedYear).slice(2)}`

  const totalMes = useMemo(
    () =>
      gastosDelMes
        .filter(g => g.concepto !== 'Inversiones')
        .reduce((acc, g) => acc + toARS(g, usdRates), 0),
    [gastosDelMes, usdRates],
  )

  return {
    gastosDelMes,
    gastosDelMesAnterior,
    prevYear,
    prevMonthIdx,
    prevMonthLabel,
    currMonthLabel,
    totalMes,
  }
}
