import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useYearMonthParam() {
  const [searchParams, setSearchParams] = useSearchParams()
  const now = new Date()

  const selectedYear = useMemo(() => {
    const y = parseInt(searchParams.get('year') ?? '')
    return isNaN(y) ? now.getFullYear() : y
  }, [searchParams])

  const selectedMonth = useMemo(() => {
    const m = parseInt(searchParams.get('month') ?? '')
    return isNaN(m) ? now.getMonth() : m - 1 // URL es 1-indexed, interno es 0-indexed
  }, [searchParams])

  const setYearMonth = (y: number, m: number) =>
    setSearchParams({ year: String(y), month: String(m + 1) }, { replace: true })

  return { selectedYear, selectedMonth, setYearMonth }
}
