import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useYearParam() {
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedYear = useMemo(() => {
    const y = parseInt(searchParams.get('year') ?? '')
    return isNaN(y) ? new Date().getFullYear() : y
  }, [searchParams])

  const setYear = (y: number) =>
    setSearchParams({ year: String(y) }, { replace: true })

  return { selectedYear, setYear }
}
