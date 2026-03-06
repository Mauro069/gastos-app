import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown as ChevronDownIcon } from 'lucide-react'

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

  const label =
    selected.size === 0
      ? placeholder
      : selected.size === 1
        ? [...selected][0]
        : `${selected.size} selec.`

  const isActive = selected.size > 0

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors whitespace-nowrap ${
          isActive
            ? 'bg-green-900/40 border border-green-600 text-green-300'
            : 'bg-gray-800 border border-gray-700 text-white hover:border-gray-600'
        }`}
      >
        <span>{label}</span>
        {isActive && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(new Set()) }}
            className="text-green-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-20 min-w-[180px] py-1 max-h-64 overflow-y-auto">
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => toggle(opt)}
                className="w-3.5 h-3.5 rounded accent-green-500 cursor-pointer"
              />
              <span className="text-sm text-gray-200">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
