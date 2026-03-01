import { useState, useRef, useCallback } from 'react'

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normaliza un string de entrada antes de formatearlo.
 * Detecta si el punto es decimal (e.g. "1500.50") o separador de miles y actúa acorde.
 */
function normalize(input: string): string {
  const hasComma = input.includes(',')
  const dots = (input.match(/\./g) || []).length

  if (!hasComma && dots === 1) {
    const afterDot = input.split('.')[1]
    // Si hay exactamente 1 punto y lo que sigue son ≤ 2 dígitos, asumimos decimal (1500.50 → 1500,50)
    if (afterDot !== undefined && afterDot.length <= 2 && /^\d*$/.test(afterDot)) {
      return input.replace('.', ',')
    }
  }

  // En cualquier otro caso, los puntos son separadores de miles → los quitamos
  return input.replace(/\./g, '')
}

/**
 * Formatea un string raw (dígitos + coma opcional) al formato AR: 1.234.567,89
 */
function formatAR(raw: string): string {
  if (!raw) return ''
  const [intPart = '', decPart] = raw.split(',')
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decPart !== undefined ? `${intFormatted},${decPart}` : intFormatted
}

/**
 * Dado un número JS, lo convierte a display AR.
 * 1500.5 → "1.500,5"   |   1000000 → "1.000.000"
 */
function numberToDisplay(val: number | ''): string {
  if (val === '' || val === undefined) return ''
  // Convertimos a string y reemplazamos punto decimal por coma
  const str = String(val).replace('.', ',')
  return formatAR(str)
}

/**
 * Cuenta cuántos puntos hay en el string `s` antes de la posición `pos`.
 */
function dotsBeforePos(s: string, pos: number): number {
  return (s.slice(0, pos).match(/\./g) || []).length
}

// ── Hook ───────────────────────────────────────────────────────────────────

export interface NumericInputReturn {
  /** Ref para pasar al <input> — necesario para el ajuste de cursor */
  inputRef: React.RefObject<HTMLInputElement>
  /** Valor formateado para mostrar en el input (e.g. "1.500,50") */
  display: string
  /** Valor numérico parseado (e.g. 1500.5), o '' si el campo está vacío */
  numericValue: number | ''
  /** onChange para pasar al <input> */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** Reinicia el campo — útil al abrir el modal con un gasto existente */
  reset: (val?: number | '') => void
}

export function useNumericInput(initialValue: number | '' = ''): NumericInputReturn {
  const inputRef = useRef<HTMLInputElement>(null)
  const [display, setDisplay] = useState<string>(numberToDisplay(initialValue))

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const cursorPos = input.selectionStart ?? 0
    const rawInput = input.value

    // 1. Normalizar (manejar pegar "1500.50" etc.)
    const normalized = normalize(rawInput)

    // 2. Limpiar: solo dígitos y coma
    const clean = normalized.replace(/[^0-9,]/g, '')

    // 3. Asegurar una sola coma como decimal
    const firstComma = clean.indexOf(',')
    const finalRaw =
      firstComma === -1
        ? clean
        : clean.slice(0, firstComma + 1) + clean.slice(firstComma + 1).replace(/,/g, '')

    // 4. Formatear
    const newDisplay = formatAR(finalRaw)

    // 5. Ajustar posición del cursor compensando los puntos que se agregan/sacan
    const oldDotsBeforeCursor = dotsBeforePos(rawInput, cursorPos)
    const rawCursorPos = cursorPos - oldDotsBeforeCursor

    // Buscar en el nuevo display dónde cae rawCursorPos caracteres (sin contar los puntos)
    let newCursorPos = newDisplay.length
    let rawCount = 0
    for (let i = 0; i < newDisplay.length; i++) {
      if (rawCount >= rawCursorPos) {
        newCursorPos = i
        break
      }
      if (newDisplay[i] !== '.') rawCount++
    }

    setDisplay(newDisplay)

    // requestAnimationFrame para que React ya haya actualizado el DOM
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (el) el.setSelectionRange(newCursorPos, newCursorPos)
    })
  }, [])

  const reset = useCallback((val: number | '' = '') => {
    setDisplay(numberToDisplay(val))
  }, [])

  // Parsear el display al número real para enviar al backend
  const numericValue: number | '' = !display
    ? ''
    : parseFloat(display.replace(/\./g, '').replace(',', '.'))

  return { inputRef, display, numericValue, onChange, reset }
}
