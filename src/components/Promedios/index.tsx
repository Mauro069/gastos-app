import { useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, ReferenceLine,
} from 'recharts'
import type { PromediosProps, PromediosTab } from '@/types'
import { useUserSettings } from '@/contexts'
import { getChipHex } from '@/utils/chipColor'
import {
  MONTH_FULL, fmt, fmtShort, fmtUSD, getRateForMonth,
} from './utils'
import { BarTooltipMonth, BarTooltipCat } from './Tooltips'
import Tendencia from './Tendencia'
import GastosRecurrentes from './GastosRecurrentes'
import ComparacionAnual from './ComparacionAnual'

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

  const gastosAno = useMemo(
    () => gastos.filter(g => new Date(g.fecha + 'T12:00:00').getFullYear() === selectedYear),
    [gastos, selectedYear],
  )

  const monthlyData = useMemo(() => {
    return MONTH_FULL.map((name, idx) => {
      const items = gastosAno.filter(g => new Date(g.fecha + 'T12:00:00').getMonth() === idx)
      const total = items.reduce((a, g) => a + Number(g.cantidad), 0)
      const rate = getRateForMonth(usdRates, selectedYear, idx)
      const mk = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`
      const hasCustomRate = !!usdRates[mk]
      return { name, short: name.slice(0, 3), total, count: items.length, rate, hasCustomRate }
    })
  }, [gastosAno, usdRates, selectedYear])

  const catData = useMemo(() => {
    return settings.conceptos
      .map(c => {
        const items = gastosAno.filter(g => g.concepto === c)
        const total = items.reduce((a, g) => a + Number(g.cantidad), 0)
        return { name: c, total, count: items.length }
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [gastosAno, settings.conceptos])

  const totalAno = gastosAno.reduce((a, g) => a + Number(g.cantidad), 0)
  const totalAnoUSD = monthlyData.reduce((a, m) => a + (m.rate > 0 ? m.total / m.rate : 0), 0)
  const monthsWithData = monthlyData.filter(m => m.total > 0).length
  const promedio = monthsWithData > 0 ? totalAno / monthsWithData : 0
  const maxMonth = monthlyData.reduce((a, b) => (b.total > a.total ? b : a), {
    name: '', short: '', total: 0, count: 0, rate: 0, hasCustomRate: false,
  })
  const minMonth = monthlyData
    .filter(m => m.total > 0)
    .reduce((a, b) => (b.total < a.total ? b : a), {
      name: '', short: '', total: Infinity, count: 0, rate: 0, hasCustomRate: false,
    })

  const TABS: { id: PromediosTab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'meses', label: 'Por mes' },
    { id: 'categorias', label: 'Categorías' },
    { id: 'comparacion', label: 'Comparación' },
  ]

  return (
    <div className="space-y-6">
      {/* Tarjetas de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total {selectedYear}</p>
          <p className="text-xl font-bold text-white">{fmt(totalAno)}</p>
          <p className="text-sm text-green-400 mt-0.5">{fmtUSD(totalAnoUSD)}</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Promedio mensual</p>
          <p className="text-xl font-bold text-white">{fmt(promedio)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {monthsWithData} mes{monthsWithData !== 1 ? 'es' : ''} con datos
          </p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Mes más caro</p>
          <p className="text-xl font-bold text-red-400">
            {maxMonth.total > 0 ? fmt(maxMonth.total) : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{maxMonth.name || '—'}</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Mes más barato</p>
          <p className="text-xl font-bold text-green-400">
            {minMonth.total !== Infinity ? fmt(minMonth.total) : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {minMonth.total !== Infinity ? minMonth.name : '—'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Resumen */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          <Tendencia monthlyData={monthlyData} promedio={promedio} selectedYear={selectedYear} />
          {gastosAno.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg">No hay datos para {selectedYear}</p>
              <p className="text-sm mt-1">Agregá gastos en los meses del año</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Por mes */}
      {activeTab === 'meses' && (
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
                <div
                  key={i}
                  className={`flex items-center py-1.5 px-2 rounded-lg text-sm ${m.total > 0 ? 'hover:bg-gray-700/40' : ''}`}
                >
                  <span className={`w-20 ${m.total > 0 ? 'text-gray-200' : 'text-gray-600'}`}>{m.name}</span>
                  <span className={`flex-1 text-right font-semibold ${m.total > 0 ? 'text-white' : 'text-gray-700'}`}>
                    {m.total > 0 ? fmt(m.total) : '—'}
                  </span>
                  <span className={`w-28 text-right text-xs ${m.total > 0 ? (m.hasCustomRate ? 'text-green-400' : 'text-gray-500') : 'text-gray-700'}`}>
                    {m.total > 0 ? (
                      <>
                        {fmtUSD(m.total / m.rate)}
                        {!m.hasCustomRate && <span className="ml-0.5 text-yellow-700">*</span>}
                      </>
                    ) : '—'}
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
                    {monthlyData.map((m, i) => (
                      <Cell key={i} fill={m.total > 0 ? '#3B82F6' : '#1F2937'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Categorías */}
      {activeTab === 'categorias' && (
        <div className="space-y-6">
          {catData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-gray-800/30 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                  Categorías {selectedYear}
                </h3>
                <div className="space-y-1">
                  {catData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-700/40 text-sm">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getChipHex(d.name, 'concepto', settings) }}
                      />
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
            <div className="text-center py-16 text-gray-500">
              <p className="text-sm">Sin datos de categorías para {selectedYear}</p>
            </div>
          )}
          <GastosRecurrentes gastosAno={gastosAno} allGastos={gastos} selectedYear={selectedYear} />
        </div>
      )}

      {/* Tab: Comparación */}
      {activeTab === 'comparacion' && (
        <>
          {prevYearGastos && prevYear ? (
            <ComparacionAnual
              gastos={gastosAno}
              prevYearGastos={prevYearGastos}
              selectedYear={selectedYear}
              prevYear={prevYear}
            />
          ) : (
            <div className="text-center py-16 text-gray-500">
              <p className="text-sm">No hay datos del año anterior para comparar</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
