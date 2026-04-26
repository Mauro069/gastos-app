import { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import type { Gasto, UsdRates } from '@/types'
import { useUserSettings } from '@/contexts'
import { getChipHex } from '@/utils/chipColor'
import { fmt, fmtUSD, getRateForMonth } from './utils'
import type { Currency } from './utils'

interface GastosRecurrentesProps {
  gastosAno: Gasto[]
  allGastos: Gasto[]
  selectedYear: number
  usdRates: UsdRates
  currency: Currency
}

export default function GastosRecurrentes({ gastosAno, selectedYear, usdRates, currency }: GastosRecurrentesProps) {
  const { settings } = useUserSettings()
  const isUSD = currency === 'USD'
  const formatter = isUSD ? fmtUSD : fmt

  const recurrentes = useMemo(() => {
    const map: Record<string, {
      nota: string
      concepto: string
      months: Set<number>
      amounts: number[]
      amountsUsd: number[]
      total: number
      totalUsd: number
    }> = {}

    gastosAno.forEach(g => {
      const key = (g.nota || g.concepto).toLowerCase().trim()
      if (!map[key])
        map[key] = { nota: g.nota || g.concepto, concepto: g.concepto, months: new Set(), amounts: [], amountsUsd: [], total: 0, totalUsd: 0 }
      const month = new Date(g.fecha + 'T12:00:00').getMonth()
      const rate = getRateForMonth(usdRates, selectedYear, month)
      const ars = Number(g.cantidad)
      const usd = rate > 0 ? ars / rate : 0
      map[key].months.add(month)
      map[key].amounts.push(ars)
      map[key].amountsUsd.push(usd)
      map[key].total += ars
      map[key].totalUsd += usd
    })

    return Object.values(map)
      .filter(d => d.months.size >= 2)
      .map(d => ({
        ...d,
        monthCount: d.months.size,
        avg: d.total / d.amounts.length,
        avgUsd: d.totalUsd / d.amountsUsd.length,
        minAmt: Math.min(...d.amounts),
        maxAmt: Math.max(...d.amounts),
        minAmtUsd: Math.min(...d.amountsUsd),
        maxAmtUsd: Math.max(...d.amountsUsd),
      }))
      .sort((a, b) => b.monthCount - a.monthCount || b.total - a.total)
      .slice(0, 15)
  }, [gastosAno, usdRates, selectedYear])

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <RefreshCw size={13} style={{ color: 'var(--accent)' }} />
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>
          Gastos recurrentes — {selectedYear}
        </h3>
        <span className="ml-auto text-xs" style={{ color: 'var(--ink-3)' }}>2+ meses</span>
      </div>

      {recurrentes.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
            No se detectaron gastos que se repitan en 2+ meses todavía.
          </p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div
            className="grid text-[10px] uppercase tracking-widest font-medium px-5 py-2"
            style={{ color: 'var(--ink-3)', borderBottom: '1px solid var(--line)', gridTemplateColumns: '1fr 48px 120px 120px' }}
          >
            <span>Concepto / Nota</span>
            <span className="text-center">Meses</span>
            <span className="text-right">Promedio</span>
            <span className="text-right">Total año</span>
          </div>

          {recurrentes.map((r, i) => {
            const color = getChipHex(r.concepto, 'concepto', settings)
            const badgeBg = r.monthCount >= 6
              ? 'var(--pos-soft)' : r.monthCount >= 3
              ? 'var(--accent-soft)' : 'var(--surface-alt)'
            const badgeColor = r.monthCount >= 6
              ? 'var(--positive)' : r.monthCount >= 3
              ? 'var(--accent)' : 'var(--ink-3)'

            const avgDisplay = isUSD ? r.avgUsd : r.avg
            const totalDisplay = isUSD ? r.totalUsd : r.total
            const minDisplay = isUSD ? r.minAmtUsd : r.minAmt
            const maxDisplay = isUSD ? r.maxAmtUsd : r.maxAmt

            return (
              <div
                key={i}
                className="grid items-center px-5 py-3 transition-colors"
                style={{
                  gridTemplateColumns: '1fr 48px 120px 120px',
                  borderBottom: '1px solid var(--line)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Nota + concepto */}
                <div className="min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>{r.nota || r.concepto}</p>
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5"
                    style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
                  >
                    <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                    {r.concepto}
                  </span>
                </div>

                {/* Frecuencia */}
                <div className="flex justify-center">
                  <span
                    className="num text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: badgeBg, color: badgeColor }}
                  >
                    {r.monthCount}×
                  </span>
                </div>

                {/* Promedio */}
                <div className="text-right">
                  <p className="num text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{formatter(avgDisplay)}</p>
                  {minDisplay !== maxDisplay && (
                    <p className="num text-[10px]" style={{ color: 'var(--ink-3)' }}>
                      {formatter(minDisplay)} – {formatter(maxDisplay)}
                    </p>
                  )}
                </div>

                {/* Total */}
                <span className="num text-sm font-semibold text-right" style={{ color: 'var(--ink)' }}>
                  {formatter(totalDisplay)}
                </span>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
