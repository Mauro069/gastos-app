import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Gasto } from '@/types'
import { fmt } from './utils'

interface ComparacionMesProps {
  gastos: Gasto[]
  prevGastos: Gasto[]
  monthLabel: string
  prevMonthLabel: string
  conceptos: string[]
  conceptoColorMap: Record<string, string>
}

function DeltaCell({ delta, pct, small }: { delta: number; pct: number; small?: boolean }) {
  if (delta === 0)
    return (
      <span className="text-gray-500 flex items-center gap-0.5">
        <Minus className="w-3 h-3" /> 0%
      </span>
    )
  const up = delta > 0
  const cls = up ? 'text-red-400' : 'text-green-400'
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={`flex items-center gap-0.5 ${cls} ${small ? 'text-xs' : 'text-sm'}`}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      {up ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  )
}

export default function ComparacionMes({
  gastos,
  prevGastos,
  monthLabel,
  prevMonthLabel,
  conceptos,
  conceptoColorMap,
}: ComparacionMesProps) {
  const data = useMemo(() => {
    return conceptos.map(c => {
      const curr = gastos.filter(g => g.concepto === c).reduce((a, g) => a + Number(g.cantidad), 0)
      const prev = prevGastos.filter(g => g.concepto === c).reduce((a, g) => a + Number(g.cantidad), 0)
      const delta = curr - prev
      const pct = prev > 0 ? (delta / prev) * 100 : curr > 0 ? 100 : 0
      return { name: c, curr, prev, delta, pct }
    })
      .filter(d => d.curr > 0 || d.prev > 0)
      .sort((a, b) => b.curr - a.curr)
  }, [gastos, prevGastos])

  const totalCurr = gastos.reduce((a, g) => a + Number(g.cantidad), 0)
  const totalPrev = prevGastos.reduce((a, g) => a + Number(g.cantidad), 0)
  const totalDelta = totalCurr - totalPrev
  const totalPct = totalPrev > 0 ? (totalDelta / totalPrev) * 100 : 0

  if (prevGastos.length === 0) {
    return (
      <div className="bg-gray-800/30 rounded-2xl p-4 border border-gray-800">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          vs. mes anterior
        </h3>
        <p className="text-gray-600 text-xs">Sin datos de {prevMonthLabel}.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/30 rounded-2xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          vs. mes anterior
        </h3>
        <span className="text-xs text-gray-600">
          {prevMonthLabel} → {monthLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2.5 mb-3">
        <span className="text-gray-300 text-xs flex-1 font-semibold">Total</span>
        <span className="text-white font-bold text-sm tabular-nums">{fmt(totalCurr)}</span>
        <span className="w-16 text-right">
          <DeltaCell delta={totalDelta} pct={totalPct} />
        </span>
      </div>

      <div className="space-y-0.5">
        {data.map(d => (
          <div
            key={d.name}
            className="flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-gray-800/50"
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: conceptoColorMap[d.name] || '#6B7280' }}
            />
            <span className="text-gray-300 text-xs flex-1 truncate">{d.name}</span>
            <span className={`text-xs font-semibold tabular-nums ${d.curr > 0 ? 'text-gray-200' : 'text-gray-700'}`}>
              {d.curr > 0 ? fmt(d.curr) : '—'}
            </span>
            <span className="w-16 text-right">
              {d.curr > 0 && d.prev > 0 ? (
                <DeltaCell delta={d.delta} pct={d.pct} small />
              ) : (
                <span className="text-gray-700 text-xs">—</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
