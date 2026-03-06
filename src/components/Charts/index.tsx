import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import type { ChartsProps } from '@/types'
import { useUserSettings } from '@/contexts'
import { getChipHex } from '@/utils/chipColor'
import { fmtShort } from './utils'
import CustomTooltip from './CustomTooltip'
import BarTooltip from './BarTooltip'
import SummaryTable from './SummaryTable'
import ComparacionMes from './ComparacionMes'
import TopGastos from './TopGastos'

export default function Charts({
  gastos,
  prevGastos = [],
  monthLabel = '',
  prevMonthLabel = '',
}: ChartsProps) {
  const { settings } = useUserSettings()

  const formaColorMap = useMemo(() =>
    Object.fromEntries(settings.formas.map(f => [f, getChipHex(f, 'forma', settings)])),
    [settings]
  )
  const conceptoColorMap = useMemo(() =>
    Object.fromEntries(settings.conceptos.map(c => [c, getChipHex(c, 'concepto', settings)])),
    [settings]
  )

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
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total)
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
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total)
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
                      <Cell key={d.name} fill={formaColorMap[d.name] || '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <SummaryTable title="" data={byForma} colorMap={formaColorMap} />
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
                      <Cell key={d.name} fill={conceptoColorMap[d.name] || '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <SummaryTable title="" data={byConcepto} colorMap={conceptoColorMap} />
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
                  <Cell key={d.name} fill={conceptoColorMap[d.name] || '#6B7280'} />
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
        conceptoColorMap={conceptoColorMap}
      />
      <TopGastos gastos={gastos} monthLabel={monthLabel} conceptoColorMap={conceptoColorMap} />
    </div>
  )
}
