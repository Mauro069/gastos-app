import { useState, useRef } from 'react'
import { Plus, LogOut, Trash2, AlertTriangle, Loader2, Pencil, Check, Wallet, TrendingUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts'
import { useUserSettings } from '@/contexts'
import { AppShell } from '@/components'
import { deleteAccount, fetchActivoCuentas, createActivoCuenta, updateActivoCuenta, deleteActivoCuenta } from '@/api'
import { getChipHex } from '@/utils/chipColor'
import type { ActivoCuenta, CuentaTipo } from '@/types'

// ── Inline editable row for formas/conceptos ─────────────────────────────────

function TagRow({
  name,
  color,
  onRename,
  onColorChange,
  onDelete,
}: {
  name: string
  color: string
  onRename: (next: string) => void
  onColorChange: (hex: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)
  const colorRef = useRef<HTMLInputElement>(null)

  const commit = () => {
    const val = draft.trim()
    if (val && val !== name) onRename(val)
    else setDraft(name)
    setEditing(false)
  }

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ borderBottom: '1px solid var(--line)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Color swatch */}
      <button
        type="button"
        onClick={() => colorRef.current?.click()}
        className="w-5 h-5 rounded-full flex-shrink-0 transition-transform hover:scale-110"
        style={{ background: color, border: '2px solid var(--surface)', boxShadow: '0 0 0 1px var(--line)' }}
        title="Cambiar color"
      />
      <input
        ref={colorRef}
        type="color"
        value={color}
        onChange={e => onColorChange(e.target.value)}
        className="sr-only"
      />

      {/* Name / editor */}
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setDraft(name); setEditing(false) }
          }}
          onBlur={commit}
          className="flex-1 text-sm rounded-lg px-2 py-1 outline-none"
          style={{ background: 'var(--surface-alt)', border: '1px solid var(--accent)', color: 'var(--ink)' }}
          maxLength={30}
        />
      ) : (
        <span className="flex-1 text-sm" style={{ color: 'var(--ink)' }}>{name}</span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {editing ? (
          <button
            type="button"
            onClick={commit}
            className="p-1.5 rounded-lg"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}
          >
            <Check size={13} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { setDraft(name); setEditing(true) }}
            className="p-1.5 rounded-lg"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
          >
            <Pencil size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-lg"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--negative)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Inline editable row for cuentas ──────────────────────────────────────────

function CuentaRow({
  cuenta,
  onRename,
  onDelete,
}: {
  cuenta: ActivoCuenta
  onRename: (id: string, nombre: string) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(cuenta.nombre)

  const commit = () => {
    const val = draft.trim()
    if (val && val !== cuenta.nombre) onRename(cuenta.id, val)
    else setDraft(cuenta.nombre)
    setEditing(false)
  }

  const isDisponible = cuenta.tipo === 'disponible'

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ borderBottom: '1px solid var(--line)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Tipo icon */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: isDisponible ? 'var(--accent-soft)' : 'var(--pos-soft)',
          color: isDisponible ? 'var(--accent)' : 'var(--positive)',
        }}
      >
        {isDisponible
          ? <Wallet size={13} />
          : <TrendingUp size={13} />
        }
      </div>

      {/* Name / editor */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setDraft(cuenta.nombre); setEditing(false) }
          }}
          onBlur={commit}
          className="flex-1 text-sm rounded-lg px-2 py-1 outline-none"
          style={{ background: 'var(--surface-alt)', border: '1px solid var(--accent)', color: 'var(--ink)' }}
          maxLength={40}
        />
      ) : (
        <span className="flex-1 text-sm" style={{ color: 'var(--ink)' }}>{cuenta.nombre}</span>
      )}

      {/* Tipo badge */}
      <span
        className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0"
        style={{
          background: isDisponible ? 'var(--accent-soft)' : 'var(--pos-soft)',
          color: isDisponible ? 'var(--accent)' : 'var(--positive)',
        }}
      >
        {isDisponible ? 'Disponible' : 'Inversión'}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => { setDraft(cuenta.nombre); setEditing(true) }}
          className="p-1.5 rounded-lg"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(cuenta.id)}
          className="p-1.5 rounded-lg"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--negative)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Add row (shared) ──────────────────────────────────────────────────────────

function AddRow({
  placeholder,
  onAdd,
  extra,
}: {
  placeholder: string
  onAdd: (val: string) => void
  extra?: React.ReactNode
}) {
  const [val, setVal] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const submit = () => {
    const v = val.trim()
    if (!v) return
    onAdd(v)
    setVal('')
    ref.current?.focus()
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      {extra}
      <input
        ref={ref}
        type="text"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder={placeholder}
        maxLength={40}
        className="flex-1 text-sm rounded-xl px-3 py-2 outline-none"
        style={{
          background: 'var(--surface-alt)',
          border: '1px solid var(--line)',
          color: 'var(--ink)',
        }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!val.trim()}
        className="rounded-xl px-3 py-2 transition-opacity disabled:opacity-40"
        style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', cursor: 'pointer' }}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { settings, renameForma, deleteForma, updateFormaColor, renameConcepto, deleteConcepto, updateConceptoColor, updateFormas, updateConceptos } = useUserSettings()
  const queryClient = useQueryClient()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [newCuentaTipo, setNewCuentaTipo] = useState<CuentaTipo>('disponible')

  const name = (user?.user_metadata?.full_name as string) || user?.email || 'Usuario'
  const email = user?.email || ''
  const avatar = user?.user_metadata?.avatar_url as string | undefined

  // ── Cuentas queries ───────────────────────────────────────────────────────
  const { data: cuentas = [] } = useQuery({
    queryKey: ['activos_cuentas', user?.id],
    queryFn: fetchActivoCuentas,
    enabled: !!user,
  })

  const invalidateCuentas = () => queryClient.invalidateQueries({ queryKey: ['activos_cuentas', user?.id] })
  const createCuentaMut = useMutation({ mutationFn: createActivoCuenta, onSuccess: invalidateCuentas })
  const updateCuentaMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ActivoCuenta> }) => updateActivoCuenta(id, data),
    onSuccess: invalidateCuentas,
  })
  const deleteCuentaMut = useMutation({ mutationFn: deleteActivoCuenta, onSuccess: invalidateCuentas })

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddForma = (val: string) => {
    if (settings.formas.includes(val)) return
    updateFormas([...settings.formas, val])
  }

  const handleAddConcepto = (val: string) => {
    if (settings.conceptos.includes(val)) return
    updateConceptos([...settings.conceptos, val])
  }

  const handleAddCuenta = (nombre: string) => {
    createCuentaMut.mutate({ nombre, tipo: newCuentaTipo, orden: cuentas.length })
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteAccount()
    } catch {
      setDeleteError('Error al eliminar la cuenta. Intentá de nuevo.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const disponibles = cuentas.filter(c => c.tipo === 'disponible')
  const inversiones = cuentas.filter(c => c.tipo === 'inversion')

  return (
    <AppShell user={user}>
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

        {/* Top bar */}
        <header
          className="sticky top-0 z-20 px-4 py-3"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}
        >
          <h1 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Perfil</h1>
        </header>

        {/* Content */}
        <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

          {/* ── User card ── */}
          <div
            className="flex items-center gap-4 px-5 py-4 rounded-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            {avatar ? (
              <img src={avatar} alt={name} className="w-14 h-14 rounded-2xl flex-shrink-0" style={{ border: '2px solid var(--line)' }} />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
              >
                {name[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-base truncate" style={{ color: 'var(--ink)' }}>{name}</p>
              <p className="text-sm truncate mt-0.5" style={{ color: 'var(--ink-3)' }}>{email}</p>
            </div>
            <button
              onClick={signOut}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 transition-colors"
              style={{ background: 'var(--surface-alt)', color: 'var(--ink-2)', border: '1px solid var(--line)', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-2)')}
            >
              <LogOut size={13} />
              Salir
            </button>
          </div>

          {/* ── Métodos de pago ── */}
          <SectionCard title="Métodos de pago">
            {settings.formas.length === 0 && (
              <p className="px-4 py-3 text-sm" style={{ color: 'var(--ink-3)' }}>Sin métodos de pago.</p>
            )}
            {settings.formas.map(f => (
              <TagRow
                key={f}
                name={f}
                color={getChipHex(f, 'forma', settings)}
                onRename={next => renameForma(f, next)}
                onColorChange={hex => updateFormaColor(f, hex)}
                onDelete={() => deleteForma(f)}
              />
            ))}
            <AddRow placeholder="Nuevo método de pago..." onAdd={handleAddForma} />
          </SectionCard>

          {/* ── Categorías ── */}
          <SectionCard title="Categorías">
            {settings.conceptos.length === 0 && (
              <p className="px-4 py-3 text-sm" style={{ color: 'var(--ink-3)' }}>Sin categorías.</p>
            )}
            {settings.conceptos.map(c => (
              <TagRow
                key={c}
                name={c}
                color={getChipHex(c, 'concepto', settings)}
                onRename={next => renameConcepto(c, next)}
                onColorChange={hex => updateConceptoColor(c, hex)}
                onDelete={() => deleteConcepto(c)}
              />
            ))}
            <AddRow placeholder="Nueva categoría..." onAdd={handleAddConcepto} />
          </SectionCard>

          {/* ── Cuentas ── */}
          <SectionCard title="Cuentas">
            {/* Disponibles */}
            {disponibles.length > 0 && (
              <div>
                <div
                  className="flex items-center gap-2 px-4 py-2"
                  style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-alt)' }}
                >
                  <Wallet size={11} style={{ color: 'var(--accent)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>
                    Disponible
                  </span>
                </div>
                {disponibles.map(c => (
                  <CuentaRow
                    key={c.id}
                    cuenta={c}
                    onRename={(id, nombre) => updateCuentaMut.mutate({ id, data: { nombre } })}
                    onDelete={id => deleteCuentaMut.mutate(id)}
                  />
                ))}
              </div>
            )}

            {/* Inversiones */}
            {inversiones.length > 0 && (
              <div>
                <div
                  className="flex items-center gap-2 px-4 py-2"
                  style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-alt)' }}
                >
                  <TrendingUp size={11} style={{ color: 'var(--positive)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>
                    Inversiones
                  </span>
                </div>
                {inversiones.map(c => (
                  <CuentaRow
                    key={c.id}
                    cuenta={c}
                    onRename={(id, nombre) => updateCuentaMut.mutate({ id, data: { nombre } })}
                    onDelete={id => deleteCuentaMut.mutate(id)}
                  />
                ))}
              </div>
            )}

            {cuentas.length === 0 && (
              <p className="px-4 py-3 text-sm" style={{ color: 'var(--ink-3)' }}>Sin cuentas registradas.</p>
            )}

            {/* Add cuenta */}
            <AddRow
              placeholder="Nueva cuenta..."
              onAdd={handleAddCuenta}
              extra={
                <div className="flex rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--line)' }}>
                  {(['disponible', 'inversion'] as CuentaTipo[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewCuentaTipo(t)}
                      className="px-2.5 py-1.5 text-[10px] font-medium transition-colors flex items-center gap-1"
                      style={{
                        background: newCuentaTipo === t ? 'var(--accent)' : 'var(--surface-alt)',
                        color: newCuentaTipo === t ? 'var(--accent-ink)' : 'var(--ink-3)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {t === 'disponible' ? <Wallet size={10} /> : <TrendingUp size={10} />}
                      {t === 'disponible' ? 'Disponible' : 'Inversión'}
                    </button>
                  ))}
                </div>
              }
            />
          </SectionCard>

          {/* ── Danger zone ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--negative)' }}>
                Zona peligrosa
              </h3>
            </div>

            {!confirmDelete ? (
              <div className="px-4 py-4">
                <p className="text-xs mb-3" style={{ color: 'var(--ink-3)' }}>
                  Eliminar la cuenta borra todos tus gastos, tipos de cambio y configuración de forma permanente.
                </p>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: 'var(--neg-soft)',
                    color: 'var(--negative)',
                    border: '1px solid var(--negative)',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                  Eliminar cuenta
                </button>
              </div>
            ) : (
              <div className="px-4 py-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--negative)' }} />
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                    Se eliminarán <strong style={{ color: 'var(--ink)' }}>todos tus gastos, tipos de cambio y configuración</strong>. Esta acción no se puede deshacer.
                  </p>
                </div>
                {deleteError && <p className="text-xs" style={{ color: 'var(--negative)' }}>{deleteError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-xl py-2.5 text-sm transition-colors"
                    style={{ background: 'var(--surface-alt)', color: 'var(--ink-2)', border: '1px solid var(--line)', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: 'var(--negative)', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {deleting ? 'Eliminando...' : 'Sí, eliminar todo'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  )
}
