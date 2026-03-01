import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react'
import { CONCEPTO_COLORS, FORMA_COLORS } from '@/constants'
import type { ChartsProps, Gasto } from '@/types'
import { useUserSettings } from '@/contexts'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { pct: string } }>
}) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1">{d.name}</p>
      <p className="text-gray-300">{fmt(d.value)}</p>
      <p className="text-gray-400">{d.payload.pct}%</p>
    </div>
  )
}

const BarTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
      <p className="text-gray-300">{fmt(payload[0].value)}</p>
    </div>
  )
}

function SummaryTable({
  title,
  data,
  colorMap,
}: {
  title: string
  data: Array<{ name: string; count: number; total: number }>
  colorMap: Record<string, string>
}) {
  const total = data.reduce((a, d) => a + d.total, 0)
  return (
    <div className="space-y-1">
      {title && <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{title}</h3>}
      {data.filter(d => d.count > 0).map(d => (
        <div key={d.name} className="flex items-center gap-2 text-xs">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: colorMap[d.name] || '#6B7280' }}
          />
          <span className="text-gray-300 flex-1 truncate">{d.name}</span>
          <span className="text-gray-600 w-4 text-right">{d.count}</span>
          <span className="text-white font-semibold w-20 text-right tabular-nums">{fmt(d.total)}</span>
        </div>
      ))}
      <div className="border-t border-gray-700/60 pt-1 mt-1 flex items-center gap-2 text-xs">
        <div className="w-2 h-2 flex-shrink-0" />
        <span className="text-gray-500 flex-1 font-semibold">Total</span>
        <span className="text-green-400 font-bold w-20 text-right tabular-nums">{fmt(total)}</span>
      </div>
    </div>
  )
}

function ComparacionMes({
  gastos,
  prevGastos,
  monthLabel,
  prevMonthLabel,
  conceptos,
}: {
  gastos: Gasto[]
  prevGastos: Gasto[]
  monthLabel: string
  prevMonthLabel: string
  conceptos: string[]
}) {
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

  const DeltaCell = ({
    delta,
    pct,
    small,
  }: {
    delta: number
    pct: number
    small?: boolean
  }) => {
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

  if (prevGastos.length === 0) {
    return (
      <div className="bg-gray-800/30 rounded-2xl p-4 border border-gray-800">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          vs. mes anterior
        </h3>
        <p className="text-gray-600 text-xs">
          Sin datos de {prevMonthLabel}.
        </p>
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

      {/* Total row */}
      <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2.5 mb-3">
        <span className="text-gray-300 text-xs flex-1 font-semibold">Total</span>
        <span className="text-white font-bold text-sm tabular-nums">{fmt(totalCurr)}</span>
        <span className="w-16 text-right">
          <DeltaCell delta={totalDelta} pct={totalPct} />
        </span>
      </div>

      {/* Category rows */}
      <div className="space-y-0.5">
        {data.map(d => (
          <div
            key={d.name}
            className="flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-gray-800/50"
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: CONCEPTO_COLORS[d.name] || '#6B7280' }}
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

function TopGastos({ gastos, monthLabel }: { gastos: Gasto[]; monthLabel: string }) {
  const top = useMemo(
    () => [...gastos].sort((a, b) => Number(b.cantidad) - Number(a.cantidad)).slice(0, 10),
    [gastos]
  )
  const total = gastos.reduce((a, g) => a + Number(g.cantidad), 0)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="bg-gray-800/30 rounded-2xl p-4 border border-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Top gastos — {monthLabel}
        </h3>
      </div>
      <div className="space-y-1">
        {top.map((g, i) => {
          const pct = total > 0 ? (Number(g.cantidad) / total) * 100 : 0
          return (
            <div
              key={g.id}
              className="flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-gray-800/50"
            >
              <span className="w-5 text-center flex-shrink-0">
                {i < 3 ? (
                  <span className="text-sm">{medals[i]}</span>
                ) : (
                  <span className="text-gray-600 text-xs font-mono">{i + 1}</span>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-200 text-xs truncate">
                  {g.nota || <span className="text-gray-600 italic">Sin nota</span>}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[10px]"
                    style={{ color: CONCEPTO_COLORS[g.concepto] || '#6B7280' }}
                  >
                    {g.concepto}
                  </span>
                  <span className="text-gray-600 text-[10px]">·</span>
                  <span className="text-gray-600 text-[10px]">
                    {new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-gray-100 font-semibold text-xs tabular-nums">{fmt(Number(g.cantidad))}</p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: CONCEPTO_COLORS[g.concepto] || '#6B7280',
                      }}
                    />
                  </div>
                  <span className="text-gray-600 text-[10px] w-7 text-right">{pct.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Charts({
  gastos,
  prevGastos = [],
  monthLabel = '',
  prevMonthLabel = '',
}: ChartsProps) {
  const { settings } = useUserSettings()

  const byForma = useMemo(() => {
    const total = gastos.reduce((a, g) => a + Number(g.cantidad), 0)
    return settings.formas.map(f => {
      const items = gastos.filter(g => g.forma === f)
      const sum = items.reduce((a, g) => a + Number(g.cantidad), 0)
      return {
        name: f,
        count: items.length,
        total: sum,
        pct: total > 0 ? ((sum / total) * 100).toFixed(1) : '0.0',
      }
    }).filter(d => d.total > 0)
  }, [gastos, settings.formas])

  const byConcepto = useMemo(() => {
    const total = gastos.reduce((a, g) => a + Number(g.cantidad), 0)
    return settings.conceptos.map(c => {
      const items = gastos.filter(g => g.concepto === c)
      const sum = items.reduce((a, g) => a + Number(g.cantidad), 0)
      return {
        name: c,
        count: items.length,
        total: sum,
        pct: total > 0 ? ((sum / total) * 100).toFixed(1) : '0.0',
      }
    }).filter(d => d.total > 0)
  }, [gastos, settings.conceptos])

  if (gastos.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        No hay datos para mostrar
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="bg-gray-800/30 rounded-2xl p-4 border border-gray-800">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Por forma de pago
          </h3>
          <div className="flex flex-col gap-3">
            <div className="w-full" style={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byForma}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {byForma.map(d => (
                      <Cell key={d.name} fill={FORMA_COLORS[d.name] || '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <SummaryTable title="" data={byForma} colorMap={FORMA_COLORS} />
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-2xl p-4 border border-gray-800">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Por concepto
          </h3>
          <div className="flex flex-col gap-3">
            <div className="w-full" style={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byConcepto}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {byConcepto.map(d => (
                      <Cell key={d.name} fill={CONCEPTO_COLORS[d.name] || '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <SummaryTable title="" data={byConcepto} colorMap={CONCEPTO_COLORS} />
          </div>
        </div>
      </div>

      <div className="bg-gray-800/30 rounded-2xl p-4 border border-gray-800">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Cantidad por concepto
        </h3>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byConcepto} margin={{ top: 5, right: 8, left: 0, bottom: 36 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#9CA3AF', fontSize: 9 }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={50}
              />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} tickFormatter={fmtShort} width={52} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {byConcepto.map(d => (
                  <Cell key={d.name} fill={CONCEPTO_COLORS[d.name] || '#6B7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ComparacionMes
        gastos={gastos}
        prevGastos={prevGastos}
        monthLabel={monthLabel}
        prevMonthLabel={prevMonthLabel}
        conceptos={settings.conceptos}
      />
      <TopGastos gastos={gastos} monthLabel={monthLabel} />
    </div>
  )
}
