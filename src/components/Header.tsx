import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Edit2, Check, X } from 'lucide-react'
import { updateMonthRate } from '@/api'
import type { HeaderProps } from '@/types'

export default function Header({
  total,
  prevTotal,
  usdRate,
  usdRates,
  setUsdRates,
  monthKey,
  monthLabel,
  user,
  demo,
  onSignIn,
  onPrevMonth,
  onNextMonth,
}: HeaderProps & { onPrevMonth?: () => void; onNextMonth?: () => void }) {
  const [editing, setEditing] = useState(false)
  const [tempRate, setTempRate] = useState(usdRate)

  useEffect(() => { setTempRate(usdRate) }, [usdRate, monthKey])

  const hasCustomRate = !!usdRates?.[monthKey]

  const handleSave = async () => {
    if (demo) return
    const rate = Number(tempRate)
    if (!isNaN(rate) && rate > 0) {
      const result = await updateMonthRate(monthKey, rate)
      setUsdRates(result.usdRates)
    }
    setEditing(false)
  }

  const delta = prevTotal && prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null
  const isUp = delta !== null && delta > 0
  const isDown = delta !== null && delta < 0

  const fmtArs = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 px-5 py-3"
      style={{ background: 'color-mix(in srgb, var(--bg) 88%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)' }}>

      {(onPrevMonth || onNextMonth) && (
        <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'var(--surface-alt)' }}>
          <button onClick={onPrevMonth} className="p-1.5 rounded-md hover:opacity-70 transition-opacity"
            style={{ color: 'var(--ink-3)', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
          <span className="text-sm font-medium px-2 min-w-[132px] text-center" style={{ color: 'var(--ink)' }}>
            {monthLabel}
          </span>
          <button onClick={onNextMonth} className="p-1.5 rounded-md hover:opacity-70 transition-opacity"
            style={{ color: 'var(--ink-3)', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <ChevronRight size={15} strokeWidth={2} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="num text-xl font-semibold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          {fmtArs(total)}
        </span>
        {delta !== null && (
          <span className="num text-xs font-semibold px-2 py-0.5 rounded"
            style={{
              background: isUp ? 'var(--neg-soft)' : isDown ? 'var(--pos-soft)' : 'var(--surface-alt)',
              color: isUp ? 'var(--negative)' : isDown ? 'var(--positive)' : 'var(--ink-3)',
            }}>
            {isUp ? '+' : ''}{delta.toFixed(0)}%
          </span>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex-shrink-0">
        {editing && !demo ? (
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
            style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)' }}>
            <span className="text-xs" style={{ color: 'var(--ink-3)' }}>$</span>
            <input type="number" value={tempRate}
              onChange={(e) => setTempRate(Number(e.target.value) || 0)}
              className="num bg-transparent w-20 text-sm focus:outline-none"
              style={{ color: 'var(--ink)', border: 'none' }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') { setTempRate(usdRate); setEditing(false) }
              }}
            />
            <button onClick={handleSave} style={{ color: 'var(--positive)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Check size={13} />
            </button>
            <button onClick={() => { setTempRate(usdRate); setEditing(false) }}
              style={{ color: 'var(--negative)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={13} />
            </button>
          </div>
        ) : (
          <button onClick={() => !demo && setEditing(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 group"
            style={{ background: 'transparent', border: 'none', cursor: demo ? 'default' : 'pointer' }}>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>USD</span>
            <span className="num text-sm font-medium" style={{ color: hasCustomRate ? 'var(--warn)' : 'var(--ink-3)' }}>
              ${usdRate.toLocaleString('es-AR')}
            </span>
            {!hasCustomRate && <span className="text-[9px]" style={{ color: 'var(--ink-3)' }}>est.</span>}
            {!demo && <Edit2 size={11} strokeWidth={1.5} style={{ color: 'var(--ink-3)', opacity: 0 }} className="group-hover:opacity-100 transition-opacity" />}
          </button>
        )}
      </div>

      {demo && onSignIn && (
        <button onClick={onSignIn} className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', cursor: 'pointer' }}>
          Entrar con Google
        </button>
      )}

      {user && !demo && (
        <button onClick={() => {}} className="flex-shrink-0 rounded-full" style={{ border: '2px solid var(--line)', cursor: 'pointer', background: 'none' }}>
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url as string} alt="" className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full grid place-items-center text-xs font-bold"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
              {((user.user_metadata?.full_name as string) || user.email || 'U')[0].toUpperCase()}
            </div>
          )}
        </button>
      )}
    </header>
  )
}
