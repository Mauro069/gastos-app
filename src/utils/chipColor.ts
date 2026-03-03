import { FORMA_COLORS, CONCEPTO_COLORS } from '@/constants'
import type { UserSettings, Forma, Concepto } from '@/types'

/** Returns white or dark text depending on background luminance */
function textForBg(hex: string): string {
  if (!hex || hex.length < 7) return 'white'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = r * 0.299 + g * 0.587 + b * 0.114
  return luminance > 160 ? '#111827' : 'white'
}

/** Resolved hex color for a forma or concepto (user override → constant → gray fallback) */
export function getChipHex(
  name: string,
  type: 'forma' | 'concepto',
  settings: Pick<UserSettings, 'formaColors' | 'conceptoColors'>,
): string {
  if (type === 'forma') {
    return settings.formaColors?.[name] ?? FORMA_COLORS[name as Forma] ?? '#6B7280'
  }
  return settings.conceptoColors?.[name] ?? CONCEPTO_COLORS[name as Concepto] ?? '#6B7280'
}

/** Returns { backgroundColor, color } for a chip badge as inline style */
export function getChipStyle(
  name: string,
  type: 'forma' | 'concepto',
  settings: Pick<UserSettings, 'formaColors' | 'conceptoColors'>,
): { backgroundColor: string; color: string } {
  const hex = getChipHex(name, type, settings)
  return { backgroundColor: hex, color: textForBg(hex) }
}
