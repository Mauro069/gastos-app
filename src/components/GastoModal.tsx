import { useState, useEffect } from 'react'
import { X, Save, Plus } from 'lucide-react'
import { FORMA_BG, CONCEPTO_BG } from '@/constants'
import type { GastoModalProps, GastoFormState, Forma, Concepto } from '@/types'
import { useUserSettings } from '@/contexts'

const today = (): string => new Date().toISOString().split('T')[0]

const emptyForm = (): GastoFormState => ({
  fecha: today(),
  cantidad: '',
  forma: 'Lemon',
  concepto: 'Salidas',
  nota: '',
})

export default function GastoModal({ gasto, defaultDate, onClose, onSave }: GastoModalProps) {
  const { settings } = useUserSettings()
  const [form, setForm] = useState<GastoFormState>(emptyForm())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (gasto) {
      setForm({ ...gasto, cantidad: gasto.cantidad, nota: gasto.nota ?? '' })
    } else {
      setForm({ ...emptyForm(), fecha: defaultDate || today() })
    }
  }, [gasto, defaultDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fecha || form.cantidad === '' || !form.forma || !form.concepto) {
      setError('Completá todos los campos obligatorios')
      return
    }
    const amount = parseFloat(String(form.cantidad).replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      setError('La cantidad debe ser un número positivo')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSave({ ...form, cantidad: amount })
      onClose()
    } catch {
      setError('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">
              {gasto ? 'Editar gasto' : 'Nuevo gasto'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">
                Fecha *
              </label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">
                Cantidad * (ARS)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cantidad}
                onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
              Forma de pago *
            </label>
            <div className="flex flex-wrap gap-2">
              {settings.formas.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, forma: f as Forma }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    form.forma === f
                      ? (FORMA_BG[f as Forma] ?? 'bg-gray-600 text-white') + ' ring-2 ring-white/30 scale-105'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
              Concepto *
            </label>
            <div className="flex flex-wrap gap-2">
              {settings.conceptos.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, concepto: c as Concepto }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    form.concepto === c
                      ? (CONCEPTO_BG[c as Concepto] ?? 'bg-gray-600 text-white') + ' ring-2 ring-white/30 scale-105'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">
              Nota
            </label>
            <input
              type="text"
              value={form.nota}
              onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Descripción del gasto..."
              maxLength={200}
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl py-2.5 font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : gasto ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
