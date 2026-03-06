import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import type { Gasto } from '@/types'
import { fmt } from './utils'

interface TopGastosProps {
  gastos: Gasto[]
  monthLabel: string
  conceptoColorMap: Record<string, string>
}

export default function TopGastos({ gastos, monthLabel, conceptoColorMap }: TopGastosProps) {
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
                    style={{ color: conceptoColorMap[g.concepto] || '#6B7280' }}
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
                        backgroundColor: conceptoColorMap[g.concepto] || '#6B7280',
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
