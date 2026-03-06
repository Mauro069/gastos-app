import { fmt } from './utils'

export default function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { pct: string } }>
}) {
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
