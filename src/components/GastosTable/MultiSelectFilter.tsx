import { useState, useEffect, useRef } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'

interface MultiSelectFilterProps {
  placeholder: string
  options: string[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}

export default function MultiSelectFilter({
  placeholder,
  options,
  selected,
  onChange,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (opt: string) => {
    const next = new Set(selected)
    next.has(opt) ? next.delete(opt) : next.add(opt)
    onChange(next)
  }

  const isActive = selected.size > 0
  const label =
    selected.size === 0
      ? placeholder
      : selected.size === 1
        ? [...selected][0]
        : `${placeholder} · ${selected.size}`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
        style={{
          background: isActive ? 'var(--accent-soft)' : 'var(--surface)',
          color: isActive ? 'var(--accent)' : 'var(--ink-2)',
          border: `1px solid ${isActive ? 'var(--accent)' : 'var(--line)'}`,
          cursor: 'pointer',
        }}
      >
        <span>{label}</span>
        {isActive ? (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(new Set()) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', padding: 0 }}
          >
            <X size={11} />
          </button>
        ) : (
          <ChevronDown
            size={11}
            style={{
              color: 'var(--ink-3)',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s',
            }}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 left-0 rounded-xl shadow-xl z-30 overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            minWidth: 180,
          }}
        >
          {options.map(opt => {
            const isSel = selected.has(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors"
                style={{
                  background: isSel ? 'var(--accent-soft)' : 'transparent',
                  color: isSel ? 'var(--accent)' : 'var(--ink-2)',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--line)',
                }}
                onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--surface-alt)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSel ? 'var(--accent-soft)' : 'transparent' }}
              >
                <span
                  className="flex-shrink-0 flex items-center justify-center rounded"
                  style={{
                    width: 14, height: 14,
                    background: isSel ? 'var(--accent)' : 'var(--surface-alt)',
                    border: isSel ? 'none' : '1px solid var(--line)',
                  }}
                >
                  {isSel && <Check size={9} style={{ color: 'var(--accent-ink)', strokeWidth: 3 }} />}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            )
          })}
          {isActive && (
            <button
              type="button"
              onClick={() => { onChange(new Set()); setOpen(false); }}
              className="w-full text-center py-2 text-xs transition-colors"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-3)',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
            >
              Limpiar filtro
            </button>
          )}
        </div>
      )}
    </div>
  )
}
