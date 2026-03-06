import { useState, useRef } from 'react'
import { X, Pencil, Check, Loader2, Palette } from 'lucide-react'
import ColorPicker from './ColorPicker'

interface ChipProps {
  value: string
  chipStyle: { backgroundColor: string; color: string }
  currentHex: string
  onRename: (newName: string) => Promise<void>
  onDelete: () => Promise<void>
  onColorChange: (hex: string) => Promise<void>
  existing: string[]
}

export default function Chip({
  value,
  chipStyle,
  currentHex,
  onRename,
  onDelete,
  onColorChange,
  existing,
}: ChipProps) {
  const [mode, setMode] = useState<'view' | 'rename' | 'delete'>('view')
  const [renameVal, setRenameVal] = useState(value)
  const [loading, setLoading] = useState(false)
  const [colorPickerAnchor, setColorPickerAnchor] = useState<DOMRect | null>(null)
  const paletteButtonRef = useRef<HTMLButtonElement>(null)

  const isDuplicate =
    renameVal.trim().toLowerCase() !== value.toLowerCase() &&
    existing.some(e => e.toLowerCase() === renameVal.trim().toLowerCase())

  const handleRename = async () => {
    const trimmed = renameVal.trim()
    if (!trimmed || trimmed === value || isDuplicate) {
      setRenameVal(value)
      setMode('view')
      return
    }
    setLoading(true)
    try {
      await onRename(trimmed)
      setMode('view')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await onDelete()
    } finally {
      setLoading(false)
    }
  }

  const handleColorSelect = async (hex: string) => {
    await onColorChange(hex)
    setColorPickerAnchor(null)
  }

  if (mode === 'rename') {
    return (
      <div className="flex items-center gap-1 rounded-full px-2 py-1.5 ring-2 ring-blue-500/50" style={chipStyle}>
        <input
          autoFocus
          value={renameVal}
          onChange={e => setRenameVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleRename()
            if (e.key === 'Escape') { setRenameVal(value); setMode('view') }
          }}
          className="bg-transparent text-inherit text-xs outline-none w-24"
          style={{ color: chipStyle.color }}
          maxLength={30}
        />
        {isDuplicate && <span className="text-red-400 text-[10px]">ya existe</span>}
        <button
          onClick={handleRename}
          disabled={loading || isDuplicate}
          className="opacity-80 hover:opacity-100 disabled:opacity-30 transition-opacity"
          style={{ color: chipStyle.color }}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => { setRenameVal(value); setMode('view') }}
          className="opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: chipStyle.color }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  if (mode === 'delete') {
    return (
      <div className="flex items-center gap-1.5 bg-red-900/40 border border-red-700/60 rounded-full px-2.5 py-1.5">
        <span className="text-red-200 text-xs font-medium">{value}</span>
        <span className="text-red-500 text-[10px]">¿borrar?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-red-400 hover:text-red-300 disabled:text-gray-600 transition-colors"
          title="Confirmar"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => setMode('view')} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="group flex items-center gap-0.5 rounded-full px-2.5 py-1.5" style={chipStyle}>
        <span className="text-xs font-semibold">{value}</span>

        <button
          ref={paletteButtonRef}
          type="button"
          onClick={() =>
            setColorPickerAnchor(prev =>
              prev ? null : paletteButtonRef.current?.getBoundingClientRect() ?? null
            )
          }
          className="opacity-0 group-hover:opacity-70 hover:!opacity-100 ml-1 transition-all"
          style={{ color: chipStyle.color }}
          title="Cambiar color"
        >
          <Palette className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={() => { setRenameVal(value); setMode('rename') }}
          className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-all"
          style={{ color: chipStyle.color }}
          title="Renombrar"
        >
          <Pencil className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={() => setMode('delete')}
          className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-all"
          style={{ color: chipStyle.color }}
          title="Eliminar"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {colorPickerAnchor && (
        <ColorPicker
          currentHex={currentHex}
          onSelect={handleColorSelect}
          onClose={() => setColorPickerAnchor(null)}
          anchorRect={colorPickerAnchor}
        />
      )}
    </div>
  )
}
