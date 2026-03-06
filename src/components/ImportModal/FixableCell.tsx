import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'

interface FixableCellProps {
  value: string
  field: 'forma' | 'concepto'
  options: string[]
  isInvalid: boolean
  onFix: (val: string) => void
  onCreateAndFix: (val: string) => Promise<void>
}

export default function FixableCell({
  value,
  field,
  options,
  isInvalid,
  onFix,
  onCreateAndFix,
}: FixableCellProps) {
  const [creating, setCreating] = useState(false)
  const [newVal, setNewVal] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isInvalid) {
    return <span className="text-gray-300">{value || '—'}</span>
  }

  if (creating) {
    const handleConfirm = async () => {
      const trimmed = newVal.trim()
      if (!trimmed) return
      setSaving(true)
      try {
        await onCreateAndFix(trimmed)
        setCreating(false)
        setNewVal('')
      } finally {
        setSaving(false)
      }
    }

    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={newVal}
          autoFocus
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleConfirm()
            if (e.key === 'Escape') { setCreating(false); setNewVal('') }
          }}
          placeholder={field === 'forma' ? 'Nueva forma...' : 'Nuevo concepto...'}
          maxLength={30}
          className="bg-gray-700 text-white text-xs rounded px-2 py-1 w-28 outline-none focus:ring-1 focus:ring-green-500"
        />
        <button
          onClick={handleConfirm}
          disabled={!newVal.trim() || saving}
          className="text-green-400 hover:text-green-300 disabled:text-gray-600"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => { setCreating(false); setNewVal('') }}
          className="text-gray-500 hover:text-gray-300"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <select
      defaultValue=""
      onChange={e => {
        if (e.target.value === '__new__') {
          setCreating(true)
        } else if (e.target.value) {
          onFix(e.target.value)
        }
      }}
      className="bg-gray-800 border border-red-500/60 text-red-300 text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-green-500 cursor-pointer max-w-[140px]"
    >
      <option value="" disabled>{value || 'Seleccionar...'}</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
      <option disabled>──────────</option>
      <option value="__new__">+ Crear nuevo...</option>
    </select>
  )
}
