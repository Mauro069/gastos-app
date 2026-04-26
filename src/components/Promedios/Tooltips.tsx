import { fmt } from './utils'

const tooltipStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  padding: '8px 12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  fontSize: 12,
}

export function TrendTooltip({
  active, payload, label, formatter = fmt,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; name: string; value: number; color: string }>
  label?: string
  formatter?: (n: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="num" style={{ color: p.color }}>
          {p.name}: {formatter(p.value)}
        </p>
      ))}
    </div>
  )
}

export function BarTooltipMonth({
  active, payload, label, formatter = fmt,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  formatter?: (n: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{label}</p>
      <p className="num" style={{ color: 'var(--accent)' }}>{formatter(payload[0].value)}</p>
    </div>
  )
}

export function BarTooltipCat({
  active, payload, label, formatter = fmt,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  formatter?: (n: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{label}</p>
      <p className="num" style={{ color: 'var(--ink-2)' }}>{formatter(payload[0].value)}</p>
    </div>
  )
}

export function LineTooltipComp({
  active, payload, label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} className="num" style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}
