import * as XLSX from 'xlsx'

export interface ParsedRow {
  row: number
  fecha: string | null
  cantidad: number
  forma: string
  concepto: string
  nota: string
  errors: string[]
  valid: boolean
}

export interface ImportResult {
  ok: number
  fail: number
}

export type RawRow = Record<string, unknown>

export function parseDate(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }
  const str = String(val).trim()
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const dmyDash = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dmyDash) return `${dmyDash[3]}-${dmyDash[2].padStart(2, '0')}-${dmyDash[1].padStart(2, '0')}`
  return null
}

export function validateRow(row: RawRow, idx: number, formas: string[], conceptos: string[]): ParsedRow {
  const errors: string[] = []

  const fecha = parseDate(row['Fecha'] ?? row['fecha'])
  if (!fecha) errors.push('Fecha inválida')

  const cantidad = Number(row['Cantidad'] ?? row['cantidad'])
  if (isNaN(cantidad) || cantidad <= 0) errors.push('Cantidad inválida')

  const forma = String(row['Forma'] ?? row['forma'] ?? '').trim()
  if (!formas.includes(forma)) errors.push('Forma inválida')

  const concepto = String(row['Concepto'] ?? row['concepto'] ?? '').trim()
  if (!conceptos.includes(concepto)) errors.push('Concepto inválido')

  const nota = String(row['Nota'] ?? row['nota'] ?? '').trim()

  return { row: idx + 1, fecha, cantidad, forma, concepto, nota, errors, valid: errors.length === 0 }
}

export function revalidateRow(r: ParsedRow, formas: string[], conceptos: string[]): ParsedRow {
  const errors: string[] = []
  if (!r.fecha) errors.push('Fecha inválida')
  if (isNaN(r.cantidad) || r.cantidad <= 0) errors.push('Cantidad inválida')
  if (!formas.includes(r.forma)) errors.push('Forma inválida')
  if (!conceptos.includes(r.concepto)) errors.push('Concepto inválido')
  return { ...r, errors, valid: errors.length === 0 }
}
