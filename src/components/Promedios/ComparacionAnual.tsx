import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip,
} from 'recharts'
import type { Gasto, UsdRates } from '@/types'
import { fmt, fmtUSD, fmtShort, fmtShortUSD, MONTH_SHORT, getRateForMonth } from './utils'
import type { Currency } from './utils'

interface ComparacionAnualProps {
  gastos: Gasto[]
  prevYearGastos: Gasto[]
  selectedYear: number
  prevYear: number
  usdRates: UsdRates
  currency: Currency
}

const tooltipStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  padding: '8px 12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  fontSize: 12,
}

function LineTooltip({
  active, payload, label, currency,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  currency: Currency
}) {
  if (!active || !payload?.length) return null
  const formatter = currency === 'USD' ? fmtUSD : fmt
  return (
    <div style={tooltipStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} className="num" style={{ color: p.color }}>
          {p.name}: {formatter(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function ComparacionAnual({
  gastos, prevYearGastos, selectedYear, prevYear, usdRates, currency,
}: ComparacionAnualProps) {
  const data = useMemo(() => {
    return MONTH_SHORT.map((short, idx) => {
      const currRaw = gastos
        .filter(g => {
          const d = new Date(g.fecha + 'T12:00:00')
          return d.getFullYear() === selectedYear && d.getMonth() === idx
        })
        .reduce((a, g) => a + Number(g.cantidad), 0)

      const prevRaw = prevYearGastos
        .filter(g => {
          const d = new Date(g.fecha + 'T12:00:00')
          return d.getFullYear() === prevYear && d.getMonth() === idx
        })
        .reduce((a, g) => a + Number(g.cantidad), 0)

      const currRate = getRateForMonth(usdRates, selectedYear, idx)
      const prevRate = getRateForMonth(usdRates, prevYear, idx)

      const currUsd = currRate > 0 ? currRaw / currRate : 0
      const prevUsd = prevRate > 0 ? prevRaw / prevRate : 0

      const delta = prevRaw > 0 ? ((currRaw - prevRaw) / prevRaw) * 100 : null

      return { short, currRaw, prevRaw, currUsd, prevUsd, delta }
    })
  }, [gastos, prevYearGastos, selectedYear, prevYear, usdRates])

  const chartData = useMemo(() => data.map(d => ({
    short: d.short,
    curr: currency === 'USD' ? (d.currUsd || null) : (d.currRaw || null),
    prev: currency === 'USD' ? (d.prevUsd || null) : (d.prevRaw || null),
  })), [data, currency])

  const hasCurr = data.some(d => d.currRaw > 0)
  const hasPrev = data.some(d => d.prevRaw > 0)
  if (!hasCurr && !hasPrev) return null

  const totalCurrRaw = data.reduce((a, d) => a + d.currRaw, 0)
  const totalPrevRaw = data.reduce((a, d) => a + d.prevRaw, 0)
  const totalCurrUsd = data.reduce((a, d) => a + d.currUsd, 0)
  const totalPrevUsd = data.reduce((a, d) => a + d.prevUsd, 0)
  const totalDelta = totalPrevRaw > 0 ? ((totalCurrRaw - totalPrevRaw) / totalPrevRaw) * 100 : null

  const displayVal = (ars: number, usd: number) =>
    currency === 'USD' ? (usd > 0 ? fmtUSD(usd) : '—') : (ars > 0 ? fmt(ars) : '—')

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>
          {prevYear} vs {selectedYear}
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded inline-block" style={{ background: 'var(--ink-3)' }} />
            <span style={{ color: 'var(--ink-3)' }}>{prevYear}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded inline-block" style={{ background: 'var(--accent)' }} />
            <span style={{ color: 'var(--ink)' }}>{selectedYear}</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pt-4 pb-2" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="short" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: 'var(--ink-3)', fontSize: 10 }}
              tickFormatter={currency === 'USD' ? fmtShortUSD : fmtShort}
              width={68}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<LineTooltip currency={currency} />}
              cursor={{ stroke: 'var(--line)', strokeWidth: 1 }}
            />
            {hasPrev && (
              <Line
                type="monotone"
                dataKey="prev"
                name={String(prevYear)}
                stroke="var(--ink-3)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={{ fill: 'var(--ink-3)', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            )}
            {hasCurr && (
              <Line
                type="monotone"
                dataKey="curr"
                name={String(selectedYear)}
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={{ fill: 'var(--accent)', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: 'var(--accent)' }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div style={{ borderTop: '1px solid var(--line)' }}>
        <div
          className="grid text-[10px] uppercase tracking-widest font-medium px-5 py-2"
          style={{ color: 'var(--ink-3)', borderBottom: '1px solid var(--line)', gridTemplateColumns: '56px 1fr 1fr 72px' }}
        >
          <span>Mes</span>
          <span className="text-right">{prevYear}</span>
          <span className="text-right">{selectedYear}</span>
          <span className="text-right">Δ%</span>
        </div>

        {data.map((m, i) => {
          const hasAny = m.currRaw > 0 || m.prevRaw > 0
          if (!hasAny) return null
          const isDecrease = m.delta !== null && m.delta < 0
          const isIncrease = m.delta !== null && m.delta > 0
          return (
            <div
              key={i}
              className="grid items-center px-5 py-2.5 transition-colors"
              style={{ gridTemplateColumns: '56px 1fr 1fr 72px', borderBottom: '1px solid var(--line)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{MONTH_SHORT[i]}</span>
              <span className="num text-sm text-right" style={{ color: 'var(--ink-3)' }}>
                {displayVal(m.prevRaw, m.prevUsd)}
              </span>
              <span className="num text-sm font-semibold text-right" style={{ color: 'var(--ink)' }}>
                {displayVal(m.currRaw, m.currUsd)}
              </span>
              <span
                className="num text-xs font-semibold text-right px-1.5 py-0.5 rounded justify-self-end"
                style={{
                  color: isDecrease ? 'var(--positive)' : isIncrease ? 'var(--negative)' : 'var(--ink-3)',
                  background: isDecrease ? 'var(--pos-soft)' : isIncrease ? 'var(--neg-soft)' : 'transparent',
                }}
              >
                {m.delta !== null ? `${isIncrease ? '+' : ''}${m.delta.toFixed(1)}%` : '—'}
              </span>
            </div>
          )
        })}

        <div
          className="grid items-center px-5 py-3"
          style={{ gridTemplateColumns: '56px 1fr 1fr 72px', background: 'var(--surface-alt)' }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>Total</span>
          <span className="num text-sm font-semibold text-right" style={{ color: 'var(--ink-3)' }}>
            {displayVal(totalPrevRaw, totalPrevUsd)}
          </span>
          <span className="num text-sm font-bold text-right" style={{ color: 'var(--accent)' }}>
            {displayVal(totalCurrRaw, totalCurrUsd)}
          </span>
          <span
            className="num text-xs font-bold text-right px-1.5 py-0.5 rounded justify-self-end"
            style={{
              color: totalDelta !== null && totalDelta < 0
                ? 'var(--positive)' : totalDelta !== null && totalDelta > 0
                ? 'var(--negative)' : 'var(--ink-3)',
              background: totalDelta !== null && totalDelta < 0
                ? 'var(--pos-soft)' : totalDelta !== null && totalDelta > 0
                ? 'var(--neg-soft)' : 'transparent',
            }}
          >
            {totalDelta !== null ? `${totalDelta > 0 ? '+' : ''}${totalDelta.toFixed(1)}%` : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
