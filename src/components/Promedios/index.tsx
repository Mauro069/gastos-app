import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, ReferenceLine,
} from 'recharts'
import type { PromediosProps, PromediosTab } from '@/types'
import { useUserSettings } from '@/contexts'
import { getChipHex } from '@/utils/chipColor'
import {
  MONTH_FULL, fmt, fmtShort, fmtUSD, fmtShortUSD, getRateForMonth,
} from './utils'
import type { Currency } from './utils'
import { BarTooltipMonth, BarTooltipCat } from './Tooltips'
import Tendencia from './Tendencia'
import GastosRecurrentes from './GastosRecurrentes'
import ComparacionAnual from './ComparacionAnual'

function CurrencyToggle({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <div
      className="flex rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--line)', background: 'var(--surface-alt)', padding: 2, gap: 2 }}
    >
      {(['USD', 'ARS'] as Currency[]).map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all"
          style={{
            background: value === c ? 'var(--surface)' : 'transparent',
            color: value === c ? 'var(--ink)' : 'var(--ink-3)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: value === c ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
          }}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

export default function Promedios({
  gastos,
  selectedYear,
  usdRates,
  prevYearGastos,
  prevYear,
  activeTab,
  onTabChange,
}: PromediosProps) {
  const { settings } = useUserSettings()
  const [currency, setCurrency] = useState<Currency>('ARS')
  const isUSD = currency === 'USD'
  const formatter = isUSD ? fmtUSD : fmt
  const shortFmt = isUSD ? fmtShortUSD : fmtShort

  const gastosAno = useMemo(
    () => gastos.filter(g => new Date(g.fecha + 'T12:00:00').getFullYear() === selectedYear),
    [gastos, selectedYear],
  )

  const monthlyData = useMemo(() => {
    return MONTH_FULL.map((name, idx) => {
      const items = gastosAno.filter(g => new Date(g.fecha + 'T12:00:00').getMonth() === idx)
      const total = items.reduce((a, g) => a + Number(g.cantidad), 0)
      const rate = getRateForMonth(usdRates, selectedYear, idx)
      const totalUsd = rate > 0 ? total / rate : 0
      const mk = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`
      const hasCustomRate = !!usdRates[mk]
      return { name, short: name.slice(0, 3), total, totalUsd, count: items.length, rate, hasCustomRate }
    })
  }, [gastosAno, usdRates, selectedYear])

  const catData = useMemo(() => {
    return settings.conceptos
      .map(c => {
        const items = gastosAno.filter(g => g.concepto === c)
        const total = items.reduce((a, g) => a + Number(g.cantidad), 0)
        const totalUsd = items.reduce((a, g) => {
          const monthIdx = new Date(g.fecha + 'T12:00:00').getMonth()
          const rate = getRateForMonth(usdRates, selectedYear, monthIdx)
          return a + Number(g.cantidad) / (rate > 0 ? rate : 1)
        }, 0)
        return { name: c, total, totalUsd, count: items.length }
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [gastosAno, settings.conceptos, usdRates, selectedYear])

  const totalAno = gastosAno.reduce((a, g) => a + Number(g.cantidad), 0)
  const totalAnoUSD = monthlyData.reduce((a, m) => a + m.totalUsd, 0)
  const monthsWithData = monthlyData.filter(m => m.total > 0).length
  const promedio = monthsWithData > 0 ? totalAno / monthsWithData : 0
  const promedioUsd = monthsWithData > 0 ? totalAnoUSD / monthsWithData : 0

  const TABS: { id: PromediosTab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'categorias', label: 'Categorías' },
    { id: 'comparacion', label: 'Comparación' },
  ]

  const card: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 16,
    overflow: 'hidden',
  }

  return (
    <div className="space-y-6">

      {/* ── Tabs + Currency Toggle ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: 'var(--surface-alt)', width: 'fit-content' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
                color: activeTab === tab.id ? 'var(--ink)' : 'var(--ink-3)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <CurrencyToggle value={currency} onChange={setCurrency} />
      </div>

      {/* ── Tab: Resumen ── */}
      {activeTab === 'resumen' && (
        <div className="space-y-4">
          <Tendencia
            monthlyData={monthlyData}
            promedio={promedio}
            promedioUsd={promedioUsd}
            selectedYear={selectedYear}
            currency={currency}
          />

          {gastosAno.length === 0 ? (
            <div className="py-16 text-center" style={{ color: 'var(--ink-3)' }}>
              <p className="text-sm">No hay datos para {selectedYear}</p>
              <p className="text-xs mt-1">Agregá gastos en los meses del año</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Monthly list */}
              <div style={card}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>
                    Totales {selectedYear}
                  </h3>
                </div>
                <div
                  className="grid text-[10px] uppercase tracking-widest font-medium px-5 py-2"
                  style={{ color: 'var(--ink-3)', borderBottom: '1px solid var(--line)', gridTemplateColumns: '80px 1fr' }}
                >
                  <span>Mes</span>
                  <span className="text-right">{currency}</span>
                </div>
                {monthlyData.map((m, i) => (
                  <div
                    key={i}
                    className="grid items-center px-5 py-2.5 transition-colors"
                    style={{
                      gridTemplateColumns: '80px 1fr',
                      borderBottom: '1px solid var(--line)',
                      opacity: m.total > 0 ? 1 : 0.35,
                    }}
                    onMouseEnter={e => { if (m.total > 0) (e.currentTarget as HTMLElement).style.background = 'var(--surface-alt)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{m.name}</span>
                    <span
                      className="num text-sm font-semibold text-right"
                      style={{ color: isUSD && m.hasCustomRate ? 'var(--positive)' : 'var(--ink)' }}
                    >
                      {m.total > 0 ? (
                        <>
                          {isUSD ? fmtUSD(m.totalUsd) : fmt(m.total)}
                          {isUSD && !m.hasCustomRate && <span style={{ color: 'var(--warn)', marginLeft: 2 }}>*</span>}
                        </>
                      ) : '—'}
                    </span>
                  </div>
                ))}
                <div
                  className="grid items-center px-5 py-3"
                  style={{ gridTemplateColumns: '80px 1fr', background: 'var(--surface-alt)' }}
                >
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>Total</span>
                  <span className="num text-sm font-bold text-right" style={{ color: 'var(--accent)' }}>
                    {isUSD ? fmtUSD(totalAnoUSD) : fmt(totalAno)}
                  </span>
                </div>
                {isUSD && (
                  <p className="text-[10px] px-5 py-2" style={{ color: 'var(--ink-3)' }}>* Rate estimado del mes anterior</p>
                )}
              </div>

              {/* Bar chart */}
              <div className="lg:col-span-2" style={card}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>
                    Gasto mensual {selectedYear}
                  </h3>
                </div>
                <div className="px-4 pt-4 pb-2" style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="short" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 10 }} tickFormatter={shortFmt} width={68} axisLine={false} tickLine={false} />
                      <Tooltip content={<BarTooltipMonth formatter={formatter} />} cursor={{ fill: 'var(--surface-alt)' }} />
                      <ReferenceLine y={isUSD ? promedioUsd : promedio} stroke="var(--warn)" strokeDasharray="4 3" strokeWidth={1.5} />
                      <Bar dataKey={isUSD ? 'totalUsd' : 'total'} radius={[4, 4, 0, 0]}>
                        {monthlyData.map((m, i) => (
                          <Cell key={i} fill={m.total > 0 ? 'var(--accent)' : 'var(--surface-alt)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Categorías ── */}
      {activeTab === 'categorias' && (
        <div className="space-y-4">
          {catData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* List */}
              <div style={card}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>
                    Categorías {selectedYear}
                  </h3>
                </div>
                {catData.map(d => {
                  const color = getChipHex(d.name, 'concepto', settings)
                  return (
                    <div
                      key={d.name}
                      className="flex items-center gap-3 px-5 py-3 transition-colors"
                      style={{ borderBottom: '1px solid var(--line)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-sm flex-1 truncate" style={{ color: 'var(--ink-2)' }}>{d.name}</span>
                      <span className="num text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                        {isUSD ? fmtUSD(d.totalUsd) : fmt(d.total)}
                      </span>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--surface-alt)' }}>
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>Total</span>
                  <span className="num text-sm font-bold" style={{ color: 'var(--accent)' }}>
                    {isUSD ? fmtUSD(totalAnoUSD) : fmt(totalAno)}
                  </span>
                </div>
              </div>

              {/* Bar chart */}
              <div className="lg:col-span-2" style={card}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>
                    Por categoría {selectedYear}
                  </h3>
                </div>
                <div className="px-4 pt-4 pb-2" style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catData} margin={{ top: 5, right: 10, left: 10, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} height={65} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 10 }} tickFormatter={shortFmt} width={68} axisLine={false} tickLine={false} />
                      <Tooltip content={<BarTooltipCat formatter={formatter} />} cursor={{ fill: 'var(--surface-alt)' }} />
                      <Bar dataKey={isUSD ? 'totalUsd' : 'total'} radius={[4, 4, 0, 0]}>
                        {catData.map(d => (
                          <Cell key={d.name} fill={getChipHex(d.name, 'concepto', settings)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center" style={{ color: 'var(--ink-3)' }}>
              <p className="text-sm">Sin datos de categorías para {selectedYear}</p>
            </div>
          )}
          <GastosRecurrentes
            gastosAno={gastosAno}
            allGastos={gastos}
            selectedYear={selectedYear}
            usdRates={usdRates}
            currency={currency}
          />
        </div>
      )}

      {/* ── Tab: Comparación ── */}
      {activeTab === 'comparacion' && (
        prevYearGastos && prevYear ? (
          <ComparacionAnual
            gastos={gastosAno}
            prevYearGastos={prevYearGastos}
            selectedYear={selectedYear}
            prevYear={prevYear}
            usdRates={usdRates}
            currency={currency}
          />
        ) : (
          <div className="py-16 text-center" style={{ color: 'var(--ink-3)' }}>
            <p className="text-sm">No hay datos del año anterior para comparar</p>
          </div>
        )
      )}
    </div>
  )
}
