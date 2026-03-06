import { fmt } from './utils'

interface SummaryTableProps {
  title: string
  data: Array<{ name: string; count: number; total: number }>
  colorMap: Record<string, string>
}

export default function SummaryTable({ title, data, colorMap }: SummaryTableProps) {
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
