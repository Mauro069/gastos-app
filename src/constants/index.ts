import type { Forma, Concepto } from '@/types'

export const FORMAS = ['Lemon', 'Credito', 'Wise', 'Uala', 'Mercado Pago', 'Efectivo'] as const satisfies readonly Forma[]

export const CONCEPTOS = [
  'Creditos',
  'Fijos',
  'Comida',
  'Regalos',
  'Ropa',
  'Salidas',
  'Transporte',
  'Otros',
  'Inversiones',
  'Peluquería',
  'Educacion',
  'Salud',
  'Casa',
  'Viaje España',
] as const satisfies readonly Concepto[]

export const CONCEPTO_COLORS: Record<Concepto, string> = {
  Creditos: '#3B82F6',
  Fijos: '#1D4ED8',
  Comida: '#22C55E',
  Regalos: '#A855F7',
  Ropa: '#EC4899',
  Salidas: '#F97316',
  Transporte: '#8B5CF6',
  Otros: '#6B7280',
  Inversiones: '#10B981',
  Peluquería: '#EAB308',
  Educacion: '#06B6D4',
  Salud: '#EF4444',
  Casa: '#92400E',
  'Viaje España': '#F59E0B',
}

export const FORMA_COLORS: Record<Forma, string> = {
  Lemon: '#FFD700',
  Credito: '#3B82F6',
  Wise: '#22C55E',
  Uala: '#A855F7',
  'Mercado Pago': '#009EE3',
  Efectivo: '#6B7280',
}

export const FORMA_BG: Record<Forma, string> = {
  Lemon: 'bg-yellow-500 text-black',
  Credito: 'bg-blue-500 text-white',
  Wise: 'bg-green-500 text-white',
  Uala: 'bg-purple-500 text-white',
  'Mercado Pago': 'bg-sky-500 text-white',
  Efectivo: 'bg-gray-500 text-white',
}

export const CONCEPTO_BG: Record<Concepto, string> = {
  Creditos: 'bg-blue-600 text-white',
  Fijos: 'bg-blue-900 text-white',
  Comida: 'bg-green-600 text-white',
  Regalos: 'bg-purple-600 text-white',
  Ropa: 'bg-pink-600 text-white',
  Salidas: 'bg-orange-500 text-white',
  Transporte: 'bg-violet-600 text-white',
  Otros: 'bg-gray-600 text-white',
  Inversiones: 'bg-emerald-600 text-white',
  Peluquería: 'bg-yellow-600 text-black',
  Educacion: 'bg-cyan-600 text-white',
  Salud: 'bg-red-600 text-white',
  Casa: 'bg-amber-900 text-white',
  'Viaje España': 'bg-amber-500 text-black',
}
