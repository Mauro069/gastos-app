import { useState, useMemo, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react'
import { FORMA_BG, CONCEPTO_BG } from '@/constants'
import GastoModal from './GastoModal'
import { createGasto, updateGasto, deleteGasto, deleteManyGastos } from '@/api'
import type { GastosTableProps, Gasto } from '@/types'
import { useAuth } from '@/contexts'
import { useUserSettings } from '@/contexts'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)

// ── Sub-components ─────────────────────────────────────────────────────────

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string; sortDir: 'asc' | 'desc' }) {
  if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-600" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-green-400" />
    : <ChevronDown className="w-3.5 h-3.5 text-green-400" />
}

/** Checkbox que soporta estado indeterminado (via ref al DOM) */
function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
  className = '',
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={`w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900 cursor-pointer accent-green-500 ${className}`}
    />
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function GastosTable({ gastos, selectedYear, selectedMonth, demo }: GastosTableProps) {
  const { user } = useAuth()
  const { settings } = useUserSettings()
  const queryClient = useQueryClient()

  const [modal, setModal] = useState<null | 'new' | Gasto>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Gasto | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [filterForma, setFilterForma] = useState('')
  const [filterConcepto, setFilterConcepto] = useState('')
  const [sortField, setSortField] = useState('fecha')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const queryKey = ['gastos', user?.id, selectedYear]

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createGasto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Gasto }) => updateGasto(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGasto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: deleteManyGastos,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setSelectedIds(new Set())
      setBulkDeleteConfirm(false)
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
  }

  const handleSave = async (
    data: Partial<Gasto> & { fecha: string; cantidad: number; forma: string; concepto: string; nota?: string }
  ) => {
    if (modal && modal !== 'new') {
      await updateMutation.mutateAsync({ id: modal.id, data: { ...modal, ...data } as Gasto })
    } else {
      await createMutation.mutateAsync(data)
    }
    setModal(null)
  }

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id)
    setDeleteConfirm(null)
  }

  const handleBulkDelete = async () => {
    await bulkDeleteMutation.mutateAsync([...selectedIds])
  }

  const defaultDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(g => g.id)))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  // ── Derived data ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...gastos]
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(
        g => g.nota?.toLowerCase().includes(s) || g.concepto?.toLowerCase().includes(s) || g.forma?.toLowerCase().includes(s)
      )
    }
    if (filterForma) result = result.filter(g => g.forma === filterForma)
    if (filterConcepto) result = result.filter(g => g.concepto === filterConcepto)
    result.sort((a, b) => {
      let va: string | number = a[sortField as keyof Gasto] as string | number
      let vb: string | number = b[sortField as keyof Gasto] as string | number
      if (sortField === 'cantidad') { va = Number(va); vb = Number(vb) }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [gastos, search, filterForma, filterConcepto, sortField, sortDir])

  const totalFiltered = filtered.reduce((acc, g) => acc + Number(g.cantidad), 0)
  const allSelected = filtered.length > 0 && filtered.every(g => selectedIds.has(g.id))
  const someSelected = filtered.some(g => selectedIds.has(g.id)) && !allSelected
  const selectedTotal = filtered
    .filter(g => selectedIds.has(g.id))
    .reduce((acc, g) => acc + Number(g.cantidad), 0)

  // Columnas: checkbox + fecha + cantidad + forma + concepto + nota + acciones = 7
  // Demo:                  fecha + cantidad + forma + concepto + nota         = 5
  const colSpan = demo ? 5 : 7

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en notas, conceptos..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <select
          value={filterForma}
          onChange={e => setFilterForma(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Todas las formas</option>
          {settings.formas.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <select
          value={filterConcepto}
          onChange={e => setFilterConcepto(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Todos los conceptos</option>
          {settings.conceptos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {!demo && (
          <button
            onClick={() => setModal('new')}
            className="bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nuevo gasto
          </button>
        )}
      </div>

      {/* ── Stats / Selection bar ── */}
      {!demo && selectedIds.size > 0 ? (
        <div className="flex items-center justify-between mb-3 px-3 py-2 bg-green-900/30 border border-green-700/50 rounded-xl text-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              className="text-gray-400 hover:text-white transition-colors"
              title="Limpiar selección"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-green-400 font-medium">
              {selectedIds.size} {selectedIds.size === 1 ? 'gasto seleccionado' : 'gastos seleccionados'}
            </span>
            <span className="text-gray-500">·</span>
            <span className="text-white font-semibold">{fmt(selectedTotal)}</span>
          </div>
          <button
            onClick={() => setBulkDeleteConfirm(true)}
            className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar seleccionados
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-3 text-sm text-gray-400">
          <span>
            {filtered.length} gastos
            {search || filterForma || filterConcepto ? ' (filtrado)' : ''}
          </span>
          <span className="font-semibold text-white">{fmt(totalFiltered)}</span>
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto scrollbar-thin rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              {!demo && (
                <th className="pl-4 pr-2 py-3 w-8">
                  <IndeterminateCheckbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                  />
                </th>
              )}
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('fecha')}
              >
                <div className="flex items-center gap-1">
                  Fecha <SortIcon field="fecha" sortField={sortField} sortDir={sortDir} />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('cantidad')}
              >
                <div className="flex items-center justify-end gap-1">
                  Cantidad <SortIcon field="cantidad" sortField={sortField} sortDir={sortDir} />
                </div>
              </th>
              <th className="px-4 py-3 text-left">Forma</th>
              <th className="px-4 py-3 text-left">Concepto</th>
              <th className="px-4 py-3 text-left">Nota</th>
              {!demo && <th className="px-4 py-3 text-center">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="text-center py-12 text-gray-500">
                  No hay gastos que coincidan con los filtros
                </td>
              </tr>
            ) : (
              filtered.map((g, i) => {
                const isSelected = selectedIds.has(g.id)
                return (
                  <tr
                    key={g.id}
                    onClick={!demo ? () => toggleRow(g.id) : undefined}
                    className={`transition-colors ${!demo ? 'cursor-pointer' : ''} ${
                      isSelected
                        ? 'bg-green-900/20 hover:bg-green-900/30'
                        : i % 2 === 0
                          ? 'bg-gray-900 hover:bg-gray-800/50'
                          : 'bg-gray-900/60 hover:bg-gray-800/50'
                    }`}
                  >
                    {!demo && (
                      <td className="pl-4 pr-2 py-3" onClick={e => e.stopPropagation()}>
                        <IndeterminateCheckbox
                          checked={isSelected}
                          onChange={() => toggleRow(g.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white whitespace-nowrap">
                      {fmt(g.cantidad)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${FORMA_BG[g.forma] || 'bg-gray-600 text-white'}`}>
                        {g.forma}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${CONCEPTO_BG[g.concepto] || 'bg-gray-600 text-white'}`}>
                        {g.concepto}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[260px] truncate" title={g.nota}>
                      {g.nota || <span className="text-gray-600 italic">Sin nota</span>}
                    </td>
                    {!demo && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setModal(g)}
                            className="text-gray-400 hover:text-blue-400 transition-colors p-1 rounded hover:bg-blue-400/10"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(g)}
                            className="text-gray-400 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-400/10"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Edit / Create modal ── */}
      {modal && !demo && (
        <GastoModal
          gasto={modal === 'new' ? null : modal}
          defaultDate={modal === 'new' ? defaultDate : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* ── Single delete confirm ── */}
      {deleteConfirm && !demo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Eliminar gasto</h3>
            <p className="text-gray-400 text-sm mb-1">¿Seguro que querés eliminar este gasto?</p>
            <p className="text-white font-semibold text-sm mb-1">
              {fmt(deleteConfirm.cantidad)} — {deleteConfirm.concepto}
            </p>
            {deleteConfirm.nota && (
              <p className="text-gray-500 text-xs mb-4 italic">&quot;{deleteConfirm.nota}&quot;</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-xl py-2.5 font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl py-2.5 font-medium text-sm transition-colors"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk delete confirm ── */}
      {bulkDeleteConfirm && !demo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Eliminar gastos</h3>
            <p className="text-gray-400 text-sm mb-3">
              ¿Seguro que querés eliminar{' '}
              <span className="text-white font-semibold">{selectedIds.size} gastos</span>?
            </p>
            <div className="bg-gray-800 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-gray-500 mb-0.5">Total a eliminar</p>
              <p className="text-white font-bold text-lg">{fmt(selectedTotal)}</p>
            </div>
            <p className="text-red-400/80 text-xs mb-4">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                disabled={bulkDeleteMutation.isPending}
                className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-xl py-2.5 font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl py-2.5 font-medium text-sm transition-colors"
              >
                {bulkDeleteMutation.isPending ? 'Eliminando...' : `Eliminar ${selectedIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
