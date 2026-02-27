import { useState, useRef } from 'react'
import { X, Download, Upload, CheckCircle, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { FORMAS, CONCEPTOS } from '@/constants'
import { createGasto } from '@/api'
import type { Forma, Concepto, CreateGastoData } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────

interface ParsedRow {
  row: number
  fecha: string | null
  cantidad: number
  forma: string
  concepto: string
  nota: string
  errors: string[]
  valid: boolean
}

interface ImportResult {
  ok: number
  fail: number
}

interface Props {
  onClose: () => void
  onImported: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseDate(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null

  // Excel serial number
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }

  const str = String(val).trim()

  // DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  // DD-MM-YYYY
  const dmyDash = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dmyDash) return `${dmyDash[3]}-${dmyDash[2].padStart(2, '0')}-${dmyDash[1].padStart(2, '0')}`

  return null
}

type RawRow = Record<string, unknown>

function validateRow(row: RawRow, idx: number): ParsedRow {
  const errors: string[] = []

  const fecha = parseDate(row['Fecha'] ?? row['fecha'])
  if (!fecha) errors.push('Fecha inválida (usar DD/MM/YYYY)')

  const cantidad = Number(row['Cantidad'] ?? row['cantidad'])
  if (isNaN(cantidad) || cantidad <= 0) errors.push('Cantidad inválida')

  const forma = String(row['Forma'] ?? row['forma'] ?? '').trim()
  if (!(FORMAS as readonly string[]).includes(forma))
    errors.push(`Forma inválida. Opciones: ${FORMAS.join(', ')}`)

  const concepto = String(row['Concepto'] ?? row['concepto'] ?? '').trim()
  if (!(CONCEPTOS as readonly string[]).includes(concepto))
    errors.push(`Concepto inválido`)

  const nota = String(row['Nota'] ?? row['nota'] ?? '').trim()

  return { row: idx + 1, fecha, cantidad, forma, concepto, nota, errors, valid: errors.length === 0 }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ImportModal({ onClose, onImported }: Props) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null)
  const [importing, setImporting] = useState(false)
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
      ['25/01/2026', 3500, 'Mercado Pago', 'Transporte', 'Uber'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 24 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos')

    const maxLen = Math.max(FORMAS.length, CONCEPTOS.length)
    const ref = XLSX.utils.aoa_to_sheet([
      ['Formas válidas', 'Conceptos válidos'],
      ...Array.from({ length: maxLen }, (_, i) => [FORMAS[i] ?? '', CONCEPTOS[i] ?? '']),
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
      setParsedRows(rows.map((row, i) => validateRow(row, i)))
      setDone(false)
      setImportResult(null)
    }
    reader.readAsArrayBuffer(file)
    // reset so same file can be re-selected
    e.target.value = ''
  }

  // ── Import valid rows ──────────────────────────────────────────────────

  async function handleImport() {
    if (!parsedRows) return
    const valid = parsedRows.filter(r => r.valid)
    if (!valid.length) return

    setImporting(true)
    let ok = 0
    let fail = 0

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
      } catch {
        fail++
      }
    }

    setImporting(false)
    setDone(true)
    setImportResult({ ok, fail })
    if (ok > 0) onImported()
  }

  const validCount = parsedRows ? parsedRows.filter(r => r.valid).length : 0
  const invalidCount = parsedRows ? parsedRows.filter(r => !r.valid).length : 0

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-600/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Importar gastos</h2>
              <p className="text-gray-500 text-xs">Cargá un Excel con tus gastos en formato plantilla</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={downloadTemplate}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border border-gray-700 hover:border-blue-500 hover:bg-blue-600/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                <Download className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-white text-sm font-semibold">Descargar plantilla</p>
                <p className="text-gray-500 text-xs mt-0.5">Excel con el formato correcto</p>
              </div>
            </button>

            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border border-gray-700 hover:border-green-500 hover:bg-green-600/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center group-hover:bg-green-600/30 transition-colors">
                <Upload className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-white text-sm font-semibold">Seleccionar archivo</p>
                <p className="text-gray-500 text-xs mt-0.5">.xlsx, .xls o .csv</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFile}
              />
            </button>
          </div>

          {/* Preview */}
          {parsedRows && !done && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-green-900/30 border border-green-800 rounded-lg px-3 py-1.5">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm font-semibold">{validCount} válidas</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-900/30 border border-red-800 rounded-lg px-3 py-1.5">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm font-semibold">{invalidCount} con errores</span>
                  </div>
                )}
                <span className="text-gray-500 text-xs ml-auto">{parsedRows.length} filas leídas</span>
              </div>

              <div className="rounded-xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-800 sticky top-0">
                      <tr>
                        {['#', 'Fecha', 'Cantidad', 'Forma', 'Concepto', 'Nota', 'Estado'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-gray-400 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((r, i) => (
                        <tr key={i} className={`border-t border-gray-800 ${r.valid ? '' : 'bg-red-950/20'}`}>
                          <td className="px-3 py-2 text-gray-500">{r.row}</td>
                          <td className="px-3 py-2 text-gray-300">{r.fecha ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-300">
                            {r.cantidad > 0 ? r.cantidad.toLocaleString('es-AR') : '—'}
                          </td>
                          <td className="px-3 py-2 text-gray-300">{r.forma || '—'}</td>
                          <td className="px-3 py-2 text-gray-300">{r.concepto || '—'}</td>
                          <td className="px-3 py-2 text-gray-400 max-w-32 truncate">{r.nota}</td>
                          <td className="px-3 py-2 text-center">
                            {r.valid ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <span title={r.errors.join('\n')}>
                                <AlertCircle className="w-4 h-4 text-red-500 mx-auto cursor-help" />
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {invalidCount > 0 && (
                <div className="bg-red-950/30 border border-red-900 rounded-xl p-3 space-y-1">
                  <p className="text-red-400 text-xs font-semibold mb-2">Errores encontrados:</p>
                  {parsedRows.filter(r => !r.valid).map((r, i) => (
                    <p key={i} className="text-red-300 text-xs">
                      <span className="font-semibold">Fila {r.row}:</span> {r.errors.join(' · ')}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Done state */}
          {done && importResult && (
            <div className="rounded-xl border border-green-800 bg-green-900/20 p-6 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
              <p className="text-white font-bold text-lg">{importResult.ok} gastos importados</p>
              {importResult.fail > 0 && (
                <p className="text-red-400 text-sm">{importResult.fail} no pudieron importarse</p>
              )}
              <p className="text-gray-500 text-xs">La tabla se actualizó automáticamente</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {done ? 'Cerrar' : 'Cancelar'}
          </button>

          {parsedRows && !done && (
            <button
              onClick={handleImport}
              disabled={validCount === 0 || importing}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Importar {validCount} gasto{validCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
