import { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import type { Gasto } from '@/types'
import { useUserSettings } from '@/contexts'
import { getChipHex } from '@/utils/chipColor'
import { fmt } from './utils'

interface GastosRecurrentesProps {
  gastosAno: Gasto[]
  allGastos: Gasto[]
  selectedYear: number
}

export default function GastosRecurrentes({ gastosAno, selectedYear }: GastosRecurrentesProps) {
  const { settings } = useUserSettings()

  const recurrentes = useMemo(() => {
    const map: Record<string, {
      nota: string
      concepto: string
      months: Set<number>
      amounts: number[]
      total: number
    }> = {}

    gastosAno.forEach(g => {
      const key = (g.nota || g.concepto).toLowerCase().trim()
      if (!map[key])
        map[key] = { nota: g.nota || g.concepto, concepto: g.concepto, months: new Set(), amounts: [], total: 0 }
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
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Gastos recurrentes
          </h3>
        </div>
        <p className="text-gray-500 text-sm">
          No se detectaron gastos que se repitan en 2+ meses todavía.
        </p>
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
              <p className="text-xs mt-0.5" style={{ color: getChipHex(r.concepto, 'concepto', settings) }}>
                {r.concepto}
              </p>
            </div>
            <div className="w-10 flex justify-center">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                r.monthCount >= 6
                  ? 'bg-green-900 text-green-300'
                  : r.monthCount >= 3
                    ? 'bg-blue-900 text-blue-300'
                    : 'bg-gray-700 text-gray-400'
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
