import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from 'recharts'
import type { Gasto } from '@/types'
import { fmt, fmtShort, MONTH_SHORT } from './utils'
import { LineTooltipComp } from './Tooltips'

interface ComparacionAnualProps {
  gastos: Gasto[]
  prevYearGastos: Gasto[]
  selectedYear: number
  prevYear: number
}

export default function ComparacionAnual({
  gastos,
  prevYearGastos,
  selectedYear,
  prevYear,
}: ComparacionAnualProps) {
  const data = useMemo(() => {
    return MONTH_SHORT.map((short, idx) => {
      const curr = gastos
        .filter(g => {
          const d = new Date(g.fecha + 'T12:00:00')
          return d.getFullYear() === selectedYear && d.getMonth() === idx
        })
        .reduce((a, g) => a + Number(g.cantidad), 0)

      const prev = prevYearGastos
        .filter(g => {
          const d = new Date(g.fecha + 'T12:00:00')
          return d.getFullYear() === prevYear && d.getMonth() === idx
        })
        .reduce((a, g) => a + Number(g.cantidad), 0)

      const delta = prev > 0 ? ((curr - prev) / prev) * 100 : null

      return { short, curr: curr || null, prev: prev || null, delta, currRaw: curr, prevRaw: prev }
    })
  }, [gastos, prevYearGastos, selectedYear, prevYear])

  const hasCurr = data.some(d => d.currRaw > 0)
  const hasPrev = data.some(d => d.prevRaw > 0)

  if (!hasCurr && !hasPrev) return null

  const totalCurr = data.reduce((a, d) => a + d.currRaw, 0)
  const totalPrev = data.reduce((a, d) => a + d.prevRaw, 0)
  const totalDelta = totalPrev > 0 ? ((totalCurr - totalPrev) / totalPrev) * 100 : null

  return (
    <div className="bg-gray-800/30 border border-gray-800 rounded-2xl p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Comparación {prevYear} vs {selectedYear}
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-gray-500 inline-block rounded" />
            <span className="text-gray-400">{prevYear}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-400 inline-block rounded" />
            <span className="text-gray-200">{selectedYear}</span>
          </span>
        </div>
      </div>

      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="short" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={fmtShort} width={72} />
            <Tooltip content={<LineTooltipComp />} />
            <Legend formatter={value => <span style={{ color: '#9CA3AF', fontSize: 12 }}>{value}</span>} />
            {hasPrev && (
              <Line
                type="monotone"
                dataKey="prev"
                name={String(prevYear)}
                stroke="#6B7280"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ fill: '#6B7280', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            )}
            {hasCurr && (
              <Line
                type="monotone"
                dataKey="curr"
                name={String(selectedYear)}
                stroke="#3B82F6"
                strokeWidth={2.5}
                dot={{ fill: '#3B82F6', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <div className="flex items-center py-1 px-2 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700/50">
          <span className="w-16">Mes</span>
          <span className="flex-1 text-right">{prevYear}</span>
          <span className="flex-1 text-right">{selectedYear}</span>
          <span className="w-20 text-right">Δ%</span>
        </div>
        <div className="space-y-0.5 mt-1">
          {data.map((m, i) => {
            const hasAny = m.currRaw > 0 || m.prevRaw > 0
            if (!hasAny) return null
            const isDecrease = m.delta !== null && m.delta < 0
            const isIncrease = m.delta !== null && m.delta > 0
            return (
              <div key={i} className="flex items-center py-1.5 px-2 rounded-lg hover:bg-gray-700/30 text-sm">
                <span className="w-16 text-gray-400 text-xs">{MONTH_SHORT[i]}</span>
                <span className="flex-1 text-right text-gray-500 text-sm">
                  {m.prevRaw > 0 ? fmt(m.prevRaw) : '—'}
                </span>
                <span className="flex-1 text-right text-white font-semibold text-sm">
                  {m.currRaw > 0 ? fmt(m.currRaw) : '—'}
                </span>
                <span className={`w-20 text-right text-xs font-semibold ${
                  isDecrease ? 'text-green-400' : isIncrease ? 'text-red-400' : 'text-gray-500'
                }`}>
                  {m.delta !== null ? `${isIncrease ? '+' : ''}${m.delta.toFixed(1)}%` : '—'}
                </span>
              </div>
            )
          })}
        </div>
        <div className="border-t border-gray-700 pt-2 mt-2 flex items-center px-2">
          <span className="w-16 text-gray-400 font-semibold text-sm">TOTAL</span>
          <span className="flex-1 text-right text-gray-400 font-bold text-sm">
            {totalPrev > 0 ? fmt(totalPrev) : '—'}
          </span>
          <span className="flex-1 text-right text-green-400 font-bold text-sm">
            {totalCurr > 0 ? fmt(totalCurr) : '—'}
          </span>
          <span className={`w-20 text-right text-xs font-bold ${
            totalDelta !== null && totalDelta < 0
              ? 'text-green-400'
              : totalDelta !== null && totalDelta > 0
                ? 'text-red-400'
                : 'text-gray-500'
          }`}>
            {totalDelta !== null ? `${totalDelta > 0 ? '+' : ''}${totalDelta.toFixed(1)}%` : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
