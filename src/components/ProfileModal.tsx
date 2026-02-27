import { useState, useRef } from 'react'
import { X, Plus, LogOut, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts'
import { useUserSettings } from '@/contexts'
import { deleteAccount } from '@/api'

interface Props {
  onClose: () => void
}

export default function ProfileModal({ onClose }: Props) {
  const { user, signOut } = useAuth()
  const { settings, updateFormas, updateConceptos } = useUserSettings()

  const [newForma, setNewForma] = useState('')
  const [newConcepto, setNewConcepto] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const formaInputRef = useRef<HTMLInputElement>(null)
  const conceptoInputRef = useRef<HTMLInputElement>(null)

  const name = (user?.user_metadata?.full_name as string) || user?.email || 'Usuario'
  const email = user?.email || ''
  const avatar = user?.user_metadata?.avatar_url as string | undefined

  // ── Formas ──────────────────────────────────────────────────────────────

  const addForma = () => {
    const val = newForma.trim()
    if (!val || settings.formas.includes(val)) return
    updateFormas([...settings.formas, val])
    setNewForma('')
    formaInputRef.current?.focus()
  }

  const removeForma = (f: string) => {
    updateFormas(settings.formas.filter(x => x !== f))
  }

  // ── Conceptos ────────────────────────────────────────────────────────────

  const addConcepto = () => {
    const val = newConcepto.trim()
    if (!val || settings.conceptos.includes(val)) return
    updateConceptos([...settings.conceptos, val])
    setNewConcepto('')
    conceptoInputRef.current?.focus()
  }

  const removeConcepto = (c: string) => {
    updateConceptos(settings.conceptos.filter(x => x !== c))
  }

  // ── Delete account ───────────────────────────────────────────────────────

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setError('')
    try {
      await deleteAccount()
      onClose()
    } catch {
      setError('Error al eliminar la cuenta. Intentá de nuevo.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            {avatar ? (
              <img src={avatar} alt={name} className="w-14 h-14 rounded-2xl ring-2 ring-gray-700" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-gray-700">
                {name[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-white font-bold text-base leading-tight">{name}</p>
              <p className="text-gray-400 text-sm mt-0.5">{email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Formas de pago */}
          <section>
            <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
              Métodos de pago
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {settings.formas.map(f => (
                <span
                  key={f}
                  className="flex items-center gap-1.5 bg-gray-800 text-gray-200 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-700"
                >
                  {f}
                  <button
                    onClick={() => removeForma(f)}
                    className="text-gray-500 hover:text-red-400 transition-colors ml-0.5"
                    title={`Eliminar ${f}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                ref={formaInputRef}
                type="text"
                value={newForma}
                onChange={e => setNewForma(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addForma()}
                placeholder="Nuevo método..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={30}
              />
              <button
                onClick={addForma}
                disabled={!newForma.trim()}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-lg px-3 py-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Categorías */}
          <section>
            <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
              Categorías
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {settings.conceptos.map(c => (
                <span
                  key={c}
                  className="flex items-center gap-1.5 bg-gray-800 text-gray-200 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-700"
                >
                  {c}
                  <button
                    onClick={() => removeConcepto(c)}
                    className="text-gray-500 hover:text-red-400 transition-colors ml-0.5"
                    title={`Eliminar ${c}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                ref={conceptoInputRef}
                type="text"
                value={newConcepto}
                onChange={e => setNewConcepto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addConcepto()}
                placeholder="Nueva categoría..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={30}
              />
              <button
                onClick={addConcepto}
                disabled={!newConcepto.trim()}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-lg px-3 py-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Danger zone */}
          <section className="border-t border-gray-800 pt-5 space-y-3">
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-900 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar cuenta
              </button>
            ) : (
              <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-sm">
                    Se eliminarán <strong>todos tus gastos, tipos de cambio y configuración</strong>. Esta acción no se puede deshacer.
                  </p>
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {deleting ? 'Eliminando...' : 'Sí, eliminar todo'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
