import { useState, useEffect, useRef } from 'react'
import { Check } from 'lucide-react'

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#EC4899', '#6B7280', '#FFD700', '#009EE3',
]

const PICKER_WIDTH = 194

interface ColorPickerProps {
  currentHex: string
  onSelect: (hex: string) => void
  onClose: () => void
  anchorRect: DOMRect
}

export default function ColorPicker({ currentHex, onSelect, onClose, anchorRect }: ColorPickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [custom, setCustom] = useState(currentHex)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const top = anchorRect.bottom + 6
  const left = Math.min(anchorRect.left, window.innerWidth - PICKER_WIDTH - 8)

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, width: PICKER_WIDTH, zIndex: 9999 }}
      className="bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-2xl"
    >
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {PRESET_COLORS.map(hex => (
          <button
            key={hex}
            type="button"
            onClick={() => { onSelect(hex); onClose() }}
            className="w-9 h-9 rounded-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/40"
            style={{ backgroundColor: hex }}
            title={hex}
          >
            {currentHex === hex && (
              <span className="flex items-center justify-center w-full h-full">
                <Check className="w-4 h-4 text-white drop-shadow" />
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-gray-700 pt-2.5">
        <div
          className="w-7 h-7 rounded-md border border-gray-600 flex-shrink-0 overflow-hidden cursor-pointer relative"
          style={{ backgroundColor: custom }}
          title="Color personalizado"
        >
          <input
            type="color"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onBlur={e => { onSelect(e.target.value); onClose() }}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={custom}
          onChange={e => {
            const val = e.target.value
            setCustom(val)
            if (/^#[0-9a-fA-F]{6}$/.test(val)) onSelect(val)
          }}
          className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
          maxLength={7}
          placeholder="#RRGGBB"
        />
      </div>
    </div>
  )
}
