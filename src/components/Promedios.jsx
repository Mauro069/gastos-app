import { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'
import { RefreshCw } from 'lucide-react'
import { CONCEPTOS, CONCEPTO_COLORS } from '../constants'

const MONTH_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
const fmtShort = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}
const fmtUSD = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  )
}

const BarTooltipMonth = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
      <p className="text-green-300">{fmt(payload[0].value)}</p>
    </div>
  )
}

const BarTooltipCat = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
      <p className="text-gray-300">{fmt(payload[0].value)}</p>
    </div>
  )
}

function getRateForMonth(usdRates, year, monthIdx) {
  const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`
  if (usdRates[key]) return usdRates[key]
  const keys = Object.keys(usdRates).sort()
  const prior = [...keys].reverse().find(k => k <= key)
  return prior ? usdRates[prior] : 1000
}

// ─── Tendencia de gastos ──────────────────────────────────────────────────────
function Tendencia({ monthlyData, promedio, selectedYear }) {
  const withData = monthlyData.filter(m => m.total > 0)
  if (withData.length < 2) return null

  return (
    <div className="bg-gray-800/30 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Tendencia de gastos {selectedYear}
        </h3>
        <span className="text-xs text-gray-500">
          Promedio: <span className="text-yellow-400 font-semibold">{fmt(promedio)}</span>
        </span>
      </div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData.filter(m => m.total > 0)} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="short" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={fmtShort} width={72} />
            <Tooltip content={<TrendTooltip />} />
            <ReferenceLine
              y={promedio}
              stroke="#EAB308"
              strokeDasharray="5 3"
              label={{ value: 'Promedio', fill: '#EAB308', fontSize: 10, position: 'right' }}
            />
            <Area
              type="monotone"
              dataKey="total"
              name="Total"
              stroke="#3B82F6"
              strokeWidth={2.5}
              fill="url(#gradTotal)"
              dot={{ fill: '#3B82F6', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Gastos recurrentes ───────────────────────────────────────────────────────
function GastosRecurrentes({ gastosAno, allGastos, selectedYear }) {
  const recurrentes = useMemo(() => {
    // Group by normalized nota (lowercase, trimmed)
    // Only keep those that appear in 2+ different months
    const map = {}

    gastosAno.forEach(g => {
      const key = (g.nota || g.concepto).toLowerCase().trim()
      if (!map[key]) map[key] = { nota: g.nota || g.concepto, concepto: g.concepto, months: new Set(), amounts: [], total: 0 }
      const month = new Date(g.fecha + 'T12:00:00').getMonth()
      map[key].months.add(month)
      map[key].amounts.push(Number(g.cantidad))
      map[key].total += Number(g.cantidad)
    })

    return Object.values(map)
      .filter(d => d.months.size >= 2)
      .map(d => ({
        ...d,
        monthCount: d.months.size,
        avg: d.total / d.amounts.length,
        minAmt: Math.min(...d.amounts),
        maxAmt: Math.max(...d.amounts),
      }))
      .sort((a, b) => b.monthCount - a.monthCount || b.total - a.total)
      .slice(0, 15)
  }, [gastosAno])

  if (recurrentes.length === 0) {
    return (
      <div className="bg-gray-800/30 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Gastos recurrentes</h3>
        </div>
        <p className="text-gray-500 text-sm">No se detectaron gastos que se repitan en 2+ meses todavía.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/30 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Gastos recurrentes — {selectedYear}
        </h3>
        <span className="ml-auto text-xs text-gray-500">Se repiten en 2+ meses</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-2 mb-1 text-xs text-gray-600 uppercase tracking-wider">
        <span className="flex-1">Concepto / Nota</span>
        <span className="w-10 text-center">Meses</span>
        <span className="w-28 text-right">Promedio</span>
        <span className="w-28 text-right">Total año</span>
      </div>

      <div className="space-y-0.5">
        {recurrentes.map((r, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-800/50 text-sm">
            <div className="flex-1 min-w-0">
              <p className="text-gray-200 truncate text-sm">{r.nota || r.concepto}</p>
              <p className="text-xs mt-0.5" style={{ color: CONCEPTO_COLORS[r.concepto] || '#6B7280' }}>{r.concepto}</p>
            </div>
            {/* Month dots */}
            <div className="w-10 flex justify-center">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                r.monthCount >= 6 ? 'bg-green-900 text-green-300' :
                r.monthCount >= 3 ? 'bg-blue-900 text-blue-300' :
                'bg-gray-700 text-gray-400'
              }`}>
                {r.monthCount}x
              </span>
            </div>
            <div className="w-28 text-right">
              <p className="text-gray-300 text-sm font-semibold">{fmt(r.avg)}</p>
              {r.minAmt !== r.maxAmt && (
                <p className="text-gray-600 text-xs">{fmt(r.minAmt)} – {fmt(r.maxAmt)}</p>
              )}
            </div>
            <span className="text-white font-bold text-sm w-28 text-right">{fmt(r.total)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Promedios({ gastos, selectedYear, usdRates }) {
  const gastosAno = useMemo(() =>
    gastos.filter(g => new Date(g.fecha + 'T12:00:00').getFullYear() === selectedYear),
    [gastos, selectedYear]
  )

  const monthlyData = useMemo(() => {
    return MONTH_FULL.map((name, idx) => {
      const items = gastosAno.filter(g => new Date(g.fecha + 'T12:00:00').getMonth() === idx)
      const total = items.reduce((a, g) => a + Number(g.cantidad), 0)
      const rate = getRateForMonth(usdRates, selectedYear, idx)
      const mk = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`
      const hasCustomRate = !!usdRates[mk]
      return { name, short: MONTH_SHORT[idx], total, count: items.length, rate, hasCustomRate }
    })
  }, [gastosAno, usdRates, selectedYear])

  const catData = useMemo(() => {
    return CONCEPTOS.map(c => {
      const items = gastosAno.filter(g => g.concepto === c)
      const total = items.reduce((a, g) => a + Number(g.cantidad), 0)
      return { name: c, total, count: items.length }
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total)
  }, [gastosAno])

  const totalAno = gastosAno.reduce((a, g) => a + Number(g.cantidad), 0)
  const totalAnoUSD = monthlyData.reduce((a, m) => a + (m.rate > 0 ? m.total / m.rate : 0), 0)
  const monthsWithData = monthlyData.filter(m => m.total > 0).length
  const promedio = monthsWithData > 0 ? totalAno / monthsWithData : 0
  const maxMonth = monthlyData.reduce((a, b) => b.total > a.total ? b : a, { total: 0 })
  const minMonth = monthlyData.filter(m => m.total > 0).reduce((a, b) => b.total < a.total ? b : a, { total: Infinity })

  return (
    <div className="space-y-6">

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total {selectedYear}</p>
          <p className="text-xl font-bold text-white">{fmt(totalAno)}</p>
          <p className="text-sm text-green-400 mt-0.5">{fmtUSD(totalAnoUSD)}</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Promedio mensual</p>
          <p className="text-xl font-bold text-white">{fmt(promedio)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{monthsWithData} mes{monthsWithData !== 1 ? 'es' : ''} con datos</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Mes más caro</p>
          <p className="text-xl font-bold text-red-400">{maxMonth.total > 0 ? fmt(maxMonth.total) : '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{maxMonth.name || '—'}</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Mes más barato</p>
          <p className="text-xl font-bold text-green-400">{minMonth.total !== Infinity ? fmt(minMonth.total) : '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{minMonth.total !== Infinity ? minMonth.name : '—'}</p>
        </div>
      </div>

      {/* Tendencia — line chart (full width) */}
      <Tendencia monthlyData={monthlyData} promedio={promedio} selectedYear={selectedYear} />

      {/* Monthly table + bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800/30 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            Totales por mes — {selectedYear}
          </h3>
          <div className="space-y-1">
            <div className="flex items-center py-1 px-2 text-xs text-gray-500 uppercase tracking-wider">
              <span className="w-20">Mes</span>
              <span className="flex-1 text-right">ARS</span>
              <span className="w-28 text-right">USD</span>
            </div>
            {monthlyData.map((m, i) => (
              <div key={i} className={`flex items-center py-1.5 px-2 rounded-lg text-sm ${m.total > 0 ? 'hover:bg-gray-700/40' : ''}`}>
                <span className={`w-20 ${m.total > 0 ? 'text-gray-200' : 'text-gray-600'}`}>{m.name}</span>
                <span className={`flex-1 text-right font-semibold ${m.total > 0 ? 'text-white' : 'text-gray-700'}`}>
                  {m.total > 0 ? fmt(m.total) : '—'}
                </span>
                <span className={`w-28 text-right text-xs ${m.total > 0 ? (m.hasCustomRate ? 'text-green-400' : 'text-gray-500') : 'text-gray-700'}`}>
                  {m.total > 0 ? <>{fmtUSD(m.total / m.rate)}{!m.hasCustomRate && <span className="ml-0.5 text-yellow-700">*</span>}</> : '—'}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-700 pt-2 mt-2 flex items-center px-2">
              <span className="text-gray-400 font-semibold text-sm w-20">TOTAL</span>
              <span className="flex-1 text-right text-green-400 font-bold text-sm">{fmt(totalAno)}</span>
              <span className="w-28 text-right text-green-400 font-bold text-sm">{fmtUSD(totalAnoUSD)}</span>
            </div>
            <p className="text-xs text-gray-600 px-2 mt-1">* Rate estimado del mes anterior</p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-800/30 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            Gasto mensual {selectedYear}
          </h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="short" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={fmtShort} width={72} />
                <Tooltip content={<BarTooltipMonth />} />
                <ReferenceLine y={promedio} stroke="#EAB308" strokeDasharray="4 3" />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((m, i) => <Cell key={i} fill={m.total > 0 ? '#3B82F6' : '#1F2937'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gastos recurrentes */}
      <GastosRecurrentes gastosAno={gastosAno} allGastos={gastos} selectedYear={selectedYear} />

      {/* Category section */}
      {catData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800/30 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Categorías {selectedYear}
            </h3>
            <div className="space-y-1">
              {catData.map(d => (
                <div key={d.name} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-700/40 text-sm">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CONCEPTO_COLORS[d.name] || '#6B7280' }} />
                  <span className="text-gray-300 flex-1 truncate">{d.name}</span>
                  <span className="text-white font-semibold">{fmt(d.total)}</span>
                </div>
              ))}
              <div className="border-t border-gray-700 pt-2 mt-2 flex items-center justify-between px-2">
                <span className="text-gray-400 font-semibold text-sm">TOTAL</span>
                <span className="text-green-400 font-bold text-sm">{fmt(totalAno)}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-gray-800/30 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Gasto por categoría {selectedYear}
            </h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catData} margin={{ top: 5, right: 10, left: 10, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} height={65} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={fmtShort} width={72} />
                  <Tooltip content={<BarTooltipCat />} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {catData.map(d => <Cell key={d.name} fill={CONCEPTO_COLORS[d.name] || '#6B7280'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {gastosAno.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No hay datos para {selectedYear}</p>
          <p className="text-sm mt-1">Agregá gastos en los meses del año</p>
        </div>
      )}
    </div>
  )
}
