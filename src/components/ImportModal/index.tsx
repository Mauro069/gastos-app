import { useState, useRef } from 'react'
import { X, Download, Upload, CheckCircle, AlertCircle, FileSpreadsheet, Loader2, Plus } from 'lucide-react'
import * as XLSX from 'xlsx'
import { FORMAS, CONCEPTOS } from '@/constants'
import { createGasto } from '@/api'
import type { Forma, Concepto, CreateGastoData } from '@/types'
import { useUserSettings } from '@/contexts'
import { validateRow, revalidateRow } from './parseHelpers'
import type { ParsedRow, ImportResult, RawRow } from './parseHelpers'
import FixableCell from './FixableCell'

interface Props {
  onClose: () => void
  onImported: () => void
}

export default function ImportModal({ onClose, onImported }: Props) {
  const { settings, updateFormas, updateConceptos } = useUserSettings()

  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [done, setDone] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Download template ──────────────────────────────────────────────────

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const data = [
      ['Fecha', 'Cantidad', 'Forma', 'Concepto', 'Nota'],
      ['15/01/2026', 5000, 'Efectivo', 'Comida', 'Supermercado'],
      ['20/01/2026', 12000, 'Credito', 'Fijos', 'Internet'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 24 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos')

    const formas = settings.formas.length ? settings.formas : FORMAS
    const conceptos = settings.conceptos.length ? settings.conceptos : CONCEPTOS
    const maxLen = Math.max(formas.length, conceptos.length)
    const ref = XLSX.utils.aoa_to_sheet([
      ['Formas válidas', 'Conceptos válidos'],
      ...Array.from({ length: maxLen }, (_, i) => [formas[i] ?? '', conceptos[i] ?? '']),
    ])
    ref['!cols'] = [{ wch: 18 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ref, 'Referencia')

    XLSX.writeFile(wb, 'plantilla_gastos.xlsx')
  }

  // ── Parse uploaded file ────────────────────────────────────────────────

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array', cellDates: false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: '' })
      setParsedRows(rows.map((row, i) => validateRow(row, i, settings.formas, settings.conceptos)))
      setDone(false)
      setImportResult(null)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  // ── Fix a field inline ─────────────────────────────────────────────────

  function fixField(rowIndex: number, field: 'forma' | 'concepto', value: string) {
    setParsedRows(prev => {
      if (!prev) return prev
      const updated = [...prev]
      const patched = { ...updated[rowIndex], [field]: value }
      updated[rowIndex] = revalidateRow(patched, settings.formas, settings.conceptos)
      return updated
    })
  }

  async function createAndFixForma(rowIndex: number, newForma: string) {
    const newFormas = [...settings.formas, newForma]
    await updateFormas(newFormas)
    setParsedRows(prev => {
      if (!prev) return prev
      const updated = [...prev]
      const patched = { ...updated[rowIndex], forma: newForma }
      updated[rowIndex] = revalidateRow(patched, newFormas, settings.conceptos)
      return updated
    })
  }

  async function createAndFixConcepto(rowIndex: number, newConcepto: string) {
    const newConceptos = [...settings.conceptos, newConcepto]
    await updateConceptos(newConceptos)
    setParsedRows(prev => {
      if (!prev) return prev
      const updated = [...prev]
      const patched = { ...updated[rowIndex], concepto: newConcepto }
      updated[rowIndex] = revalidateRow(patched, settings.formas, newConceptos)
      return updated
    })
  }

  // ── Import valid rows ──────────────────────────────────────────────────

  async function handleImport() {
    if (!parsedRows) return
    const valid = parsedRows.filter(r => r.valid)
    if (!valid.length) return
    setImporting(true)
    setProgress({ current: 0, total: valid.length })
    let ok = 0, fail = 0
    for (const r of valid) {
      try {
        const payload: CreateGastoData = {
          fecha: r.fecha!,
          cantidad: r.cantidad,
          forma: r.forma as Forma,
          concepto: r.concepto as Concepto,
          nota: r.nota,
        }
        await createGasto(payload)
        ok++
      } catch { fail++ }
      setProgress(p => ({ ...p, current: p.current + 1 }))
    }
    setImporting(false)
    setDone(true)
    setImportResult({ ok, fail })
    if (ok > 0) onImported()
  }

  const validCount = parsedRows ? parsedRows.filter(r => r.valid).length : 0
  const invalidCount = parsedRows ? parsedRows.filter(r => !r.valid).length : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col shadow-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)', maxHeight: '90dvh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-soft)' }}
            >
              <FileSpreadsheet size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Importar gastos</h2>
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Cargá un Excel con tus gastos en formato plantilla</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors"
            style={{ background: 'var(--surface-alt)', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={downloadTemplate}
              className="flex flex-col items-center gap-2.5 p-5 rounded-xl transition-colors"
              style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <Download size={16} style={{ color: 'var(--ink-2)' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Descargar plantilla</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>Excel con el formato correcto</p>
              </div>
            </button>

            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2.5 p-5 rounded-xl transition-colors"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', cursor: 'pointer' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <Upload size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Seleccionar archivo</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>.xlsx, .xls o .csv</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            </button>
          </div>

          {/* Preview */}
          {parsedRows && !done && (
            <div className="space-y-3">
              {/* Summary pills */}
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                  style={{ background: 'var(--pos-soft)', border: '1px solid var(--positive)' }}
                >
                  <CheckCircle size={13} style={{ color: 'var(--positive)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--positive)' }}>{validCount} válidas</span>
                </div>
                {invalidCount > 0 && (
                  <div
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                    style={{ background: 'var(--neg-soft)', border: '1px solid var(--negative)' }}
                  >
                    <AlertCircle size={13} style={{ color: 'var(--negative)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--negative)' }}>{invalidCount} con errores</span>
                  </div>
                )}
                <span className="text-xs ml-auto" style={{ color: 'var(--ink-3)' }}>{parsedRows.length} filas leídas</span>
              </div>

              {/* Table */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0" style={{ background: 'var(--surface-alt)' }}>
                      <tr>
                        {['#', 'Fecha', 'Cantidad', 'Forma', 'Concepto', 'Nota', ''].map((h, i) => (
                          <th
                            key={i}
                            className="px-3 py-2 text-left font-medium whitespace-nowrap uppercase tracking-widest"
                            style={{ color: 'var(--ink-3)', borderBottom: '1px solid var(--line)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((r, i) => {
                        const formaInvalid = r.errors.some(e => e.includes('Forma'))
                        const conceptoInvalid = r.errors.some(e => e.includes('Concepto'))
                        return (
                          <tr
                            key={i}
                            style={{
                              borderBottom: '1px solid var(--line)',
                              background: r.valid ? 'transparent' : 'var(--neg-soft)',
                            }}
                          >
                            <td className="px-3 py-2" style={{ color: 'var(--ink-3)' }}>{r.row}</td>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>
                              {r.fecha ?? <span style={{ color: 'var(--negative)' }}>—</span>}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap num" style={{ color: 'var(--ink-2)' }}>
                              {r.cantidad > 0 ? r.cantidad.toLocaleString('es-AR') : <span style={{ color: 'var(--negative)' }}>—</span>}
                            </td>
                            <td className="px-3 py-2">
                              <FixableCell
                                value={r.forma}
                                field="forma"
                                options={settings.formas}
                                isInvalid={formaInvalid}
                                onFix={val => fixField(i, 'forma', val)}
                                onCreateAndFix={val => createAndFixForma(i, val)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <FixableCell
                                value={r.concepto}
                                field="concepto"
                                options={settings.conceptos}
                                isInvalid={conceptoInvalid}
                                onFix={val => fixField(i, 'concepto', val)}
                                onCreateAndFix={val => createAndFixConcepto(i, val)}
                              />
                            </td>
                            <td className="px-3 py-2 max-w-[140px] truncate" style={{ color: 'var(--ink-3)' }}>{r.nota}</td>
                            <td className="px-3 py-2 text-center">
                              {r.valid
                                ? <CheckCircle size={14} style={{ color: 'var(--positive)', margin: 'auto' }} />
                                : (
                                  <span title={r.errors.join('\n')}>
                                    <AlertCircle size={14} style={{ color: 'var(--negative)', margin: 'auto', cursor: 'help' }} />
                                  </span>
                                )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Non-fixable errors */}
              {parsedRows.some(r => r.errors.some(e => !e.includes('Forma') && !e.includes('Concepto'))) && (
                <div
                  className="rounded-xl p-3 space-y-1"
                  style={{ background: 'var(--neg-soft)', border: '1px solid var(--negative)' }}
                >
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--negative)' }}>Errores no corregibles:</p>
                  {parsedRows
                    .filter(r => r.errors.some(e => !e.includes('Forma') && !e.includes('Concepto')))
                    .map((r, i) => (
                      <p key={i} className="text-xs" style={{ color: 'var(--negative)' }}>
                        <span className="font-semibold">Fila {r.row}:</span>{' '}
                        {r.errors.filter(e => !e.includes('Forma') && !e.includes('Concepto')).join(' · ')}
                      </p>
                    ))}
                </div>
              )}

              {/* Fixable hint */}
              {parsedRows.some(r => r.errors.some(e => e.includes('Forma') || e.includes('Concepto'))) && (
                <div
                  className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)' }}
                >
                  <Plus size={13} style={{ color: 'var(--ink-3)', marginTop: 2, flexShrink: 0 }} />
                  <p className="text-xs" style={{ color: 'var(--ink-2)' }}>
                    Las filas con <span className="font-semibold">Forma</span> o <span className="font-semibold">Concepto</span> inválidos se pueden corregir directo en la tabla — elegí uno existente o creá uno nuevo.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Done state */}
          {done && importResult && (
            <div
              className="rounded-xl p-6 text-center space-y-2"
              style={{ background: 'var(--pos-soft)', border: '1px solid var(--positive)' }}
            >
              <CheckCircle size={36} style={{ color: 'var(--positive)', margin: 'auto' }} />
              <p className="font-semibold text-base" style={{ color: 'var(--ink)' }}>{importResult.ok} gastos importados</p>
              {importResult.fail > 0 && (
                <p className="text-sm" style={{ color: 'var(--negative)' }}>{importResult.fail} no pudieron importarse</p>
              )}
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>La tabla se actualizó automáticamente</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 space-y-3" style={{ borderTop: '1px solid var(--line)' }}>
          {importing && progress.total > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--ink-3)' }}>
                <span className="flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent)' }} />
                  Importando gastos...
                </span>
                <span className="num font-semibold" style={{ color: 'var(--ink)' }}>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--surface-alt)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((progress.current / progress.total) * 100)}%`, background: 'var(--accent)' }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={importing}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-opacity disabled:opacity-40"
              style={{ background: 'var(--surface-alt)', color: 'var(--ink-2)', border: '1px solid var(--line)', cursor: 'pointer' }}
            >
              {done ? 'Cerrar' : 'Cancelar'}
            </button>
            {parsedRows && !done && !importing && (
              <button
                onClick={handleImport}
                disabled={validCount === 0}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-40"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', cursor: validCount > 0 ? 'pointer' : 'default' }}
              >
                <Upload size={14} />
                Importar {validCount} gasto{validCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
