import {
  ResponsiveContainer, AreaChart, Area,
  CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine,
} from 'recharts'
import { fmt, fmtShort } from './utils'
import { TrendTooltip } from './Tooltips'

interface TendenciaProps {
  monthlyData: Array<{ name: string; short: string; total: number; count: number }>
  promedio: number
  selectedYear: number
}

export default function Tendencia({ monthlyData, promedio, selectedYear }: TendenciaProps) {
  const withData = monthlyData.filter(m => m.total > 0)
  if (withData.length < 2) return null

  return (
    <div className="bg-gray-800/30 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Tendencia de gastos {selectedYear}
        </h3>
        <span className="text-xs text-gray-500">
          Promedio:{' '}
          <span className="text-yellow-400 font-semibold">{fmt(promedio)}</span>
        </span>
      </div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={monthlyData.filter(m => m.total > 0)}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          >
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
