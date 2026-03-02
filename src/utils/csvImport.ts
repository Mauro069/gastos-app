import * as XLSX from 'xlsx'
import type { Gasto, Forma, Concepto } from '@/types/gasto'

const FORMAS: Forma[] = [
  'Lemon', 'Credito', 'Wise', 'Uala', 'Mercado Pago', 'Efectivo', 'Transferencia',
]

export interface ParseResult {
  gastos: Gasto[]
  errors: number
  total: number
}

/** Accepts DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD → returns YYYY-MM-DD */
function parseDate(s: string): string | null {
  const str = String(s ?? '').trim()
  const dmY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmY) {
    const [, d, m, y] = dmY
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    if (isNaN(new Date(iso + 'T12:00:00').getTime())) return null
    return iso
  }
  const yMD = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (yMD) {
    if (isNaN(new Date(str + 'T12:00:00').getTime())) return null
    return str
  }
  // Excel serial date (number)
  if (/^\d+$/.test(str)) {
    const serial = parseInt(str, 10)
    if (serial > 40000 && serial < 60000) {
      const date = XLSX.SSF.parse_date_code(serial)
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
      }
    }
  }
  return null
}

function normalizeForma(s: string): Forma | null {
  const t = String(s ?? '').trim()
  return FORMAS.find(f => f.toLowerCase() === t.toLowerCase()) ?? null
}

/** Minimal CSV line parser that handles quoted fields */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function normalizeHeader(h: string): string {
  return String(h).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '')
}

function findCol(header: string[], names: string[]): number {
  return header.findIndex(h => names.includes(h))
}

function parseAmount(raw: string): number {
  let s = String(raw ?? '').replace(/[$\s]/g, '')
  // Argentine format: 5.200,50 → comma is decimal
  if (/,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    s = s.replace(/,/g, '')
  }
  return parseFloat(s)
}

let idCounter = 0

/** Process an array of {header: value} row objects (from XLSX or CSV) */
function processRows(
  rows: Record<string, string>[],
  total: number
): ParseResult {
  const gastos: Gasto[] = []
  let errors = 0

  for (const row of rows) {
    // Normalize keys
    const normalized: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) {
      normalized[normalizeHeader(k)] = String(v ?? '').trim()
    }

    const fechaRaw   = normalized['fecha'] ?? ''
    const concepto   = normalized['concepto'] ?? normalized['categoria'] ?? ''
    const cantidadRaw = normalized['cantidad'] ?? normalized['monto'] ?? normalized['importe'] ?? ''
    const formaRaw   = normalized['forma'] ?? normalized['pago'] ?? normalized['formadepago'] ?? normalized['mediopago'] ?? ''
    const nota       = normalized['nota'] ?? normalized['notas'] ?? normalized['descripcion'] ?? undefined

    const fecha    = parseDate(fechaRaw)
    const cantidad = parseAmount(cantidadRaw)
    const forma    = normalizeForma(formaRaw)

    if (!fecha || !concepto || isNaN(cantidad) || cantidad <= 0 || !forma) {
      errors++
      continue
    }

    gastos.push({
      id: `import-${Date.now()}-${++idCounter}`,
      fecha,
      cantidad,
      // concepto is free-form — cast to satisfy TypeScript
      concepto: concepto as Concepto,
      forma,
      nota: nota || undefined,
    })
  }

  return { gastos, errors, total }
}

/** Parse a CSV text string */
export function parseCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { gastos: [], errors: 0, total: 0 }

  const header = parseCsvLine(lines[0]).map(normalizeHeader)
  const dataLines = lines.slice(1).filter(l => l.trim())

  const rows: Record<string, string>[] = dataLines.map(line => {
    const cols = parseCsvLine(line)
    const obj: Record<string, string> = {}
    header.forEach((h, i) => { obj[h] = cols[i] ?? '' })
    return obj
  })

  return processRows(rows, dataLines.length)
}

/** Parse an XLSX ArrayBuffer */
export function parseXlsx(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    raw: false,     // convert everything to strings
    defval: '',
  })
  if (rawRows.length === 0) return { gastos: [], errors: 0, total: 0 }

  const rows: Record<string, string>[] = rawRows.map(r => {
    const obj: Record<string, string> = {}
    for (const [k, v] of Object.entries(r)) obj[k] = String(v ?? '').trim()
    return obj
  })

  return processRows(rows, rows.length)
}

export const FORMAS_LIST = FORMAS
