import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'

interface AddChipInputProps {
  existing: string[]
  onAdd: (value: string) => Promise<void>
  onCancel: () => void
}

export default function AddChipInput({ existing, onAdd, onCancel }: AddChipInputProps) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const trimmed = value.trim()
  const isDuplicate = existing.some(e => e.toLowerCase() === trimmed.toLowerCase())

  const handleAdd = async () => {
    if (!trimmed || isDuplicate) return
    setLoading(true)
    try {
      await onAdd(trimmed)
      setValue('')
      onCancel()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1 bg-gray-700 rounded-full px-2 py-1.5">
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleAdd()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Nuevo..."
        maxLength={30}
        className="bg-transparent text-white text-xs w-24 outline-none placeholder-gray-500"
      />
      <button
        onClick={handleAdd}
        disabled={!trimmed || isDuplicate || loading}
        title={isDuplicate ? 'Ya existe' : 'Agregar'}
        className="text-green-400 hover:text-green-300 disabled:text-gray-600 transition-colors"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </button>
      <button onClick={onCancel} className="text-gray-400 hover:text-gray-200 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
