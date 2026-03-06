import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, LogOut, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts'
import { useUserSettings } from '@/contexts'
import { deleteAccount } from '@/api'

export default function ProfilePage() {
  const navigate = useNavigate()
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
      navigate('/')
    } catch {
      setError('Error al eliminar la cuenta. Intentá de nuevo.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white font-bold text-base">Perfil</h1>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-lg mx-auto p-6 space-y-8">

        {/* Avatar + info */}
        <div className="flex items-center gap-4">
          {avatar ? (
            <img src={avatar} alt={name} className="w-16 h-16 rounded-2xl ring-2 ring-gray-700" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-gray-700">
              {name[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-bold text-lg leading-tight">{name}</p>
            <p className="text-gray-400 text-sm mt-0.5">{email}</p>
          </div>
        </div>

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
                  <span className="text-xs leading-none">✕</span>
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
                  <span className="text-xs leading-none">✕</span>
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
        <section className="border-t border-gray-800 pt-6 space-y-3">
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
  )
}
