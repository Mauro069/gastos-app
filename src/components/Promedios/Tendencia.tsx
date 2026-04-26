import {
  ResponsiveContainer, AreaChart, Area,
  CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine,
} from 'recharts'
import { fmt, fmtShort, fmtUSD, fmtShortUSD } from './utils'
import type { Currency } from './utils'
import { TrendTooltip } from './Tooltips'

interface TendenciaProps {
  monthlyData: Array<{ name: string; short: string; total: number; totalUsd: number; count: number }>
  promedio: number
  promedioUsd: number
  selectedYear: number
  currency: Currency
}

export default function Tendencia({ monthlyData, promedio, promedioUsd, selectedYear, currency }: TendenciaProps) {
  const withData = monthlyData.filter(m => m.total > 0)
  if (withData.length < 2) return null

  const isUSD = currency === 'USD'
  const dataKey = isUSD ? 'totalUsd' : 'total'
  const avgVal = isUSD ? promedioUsd : promedio
  const formatter = isUSD ? fmtUSD : fmt
  const shortFormatter = isUSD ? fmtShortUSD : fmtShort

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>
          Tendencia {selectedYear}
        </h3>
        <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
          Promedio:{' '}
          <span className="num font-semibold" style={{ color: 'var(--warn)' }}>{formatter(avgVal)}</span>
        </span>
      </div>
      <div className="px-4 pt-4 pb-2" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={monthlyData.filter(m => m.total > 0)}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="short" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 10 }} tickFormatter={shortFormatter} width={68} axisLine={false} tickLine={false} />
            <Tooltip content={<TrendTooltip formatter={formatter} />} cursor={{ stroke: 'var(--line)', strokeWidth: 1 }} />
            <ReferenceLine
              y={avgVal}
              stroke="var(--warn)"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{ value: 'Prom.', fill: 'var(--warn)', fontSize: 10, position: 'right' }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              name="Total"
              stroke="var(--accent)"
              strokeWidth={2.5}
              fill="url(#gradTotal)"
              dot={{ fill: 'var(--accent)', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: 'var(--accent)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
