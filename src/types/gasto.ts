export type Forma =
  | 'Lemon'
  | 'Credito'
  | 'Wise'
  | 'Uala'
  | 'Mercado Pago'
  | 'Efectivo'

export type Concepto =
  | 'Creditos'
  | 'Fijos'
  | 'Comida'
  | 'Regalos'
  | 'Ropa'
  | 'Salidas'
  | 'Transporte'
  | 'Otros'
  | 'Inversiones'
  | 'Peluquería'
  | 'Educacion'
  | 'Salud'
  | 'Casa'
  | 'Viaje España'

export interface Gasto {
  id: string
  fecha: string
  cantidad: number
  forma: Forma
  concepto: Concepto
  nota?: string
  user_id?: string
  created_at?: string
  createdAt?: string
}

export type UsdRates = Record<string, number>

/** Form state for GastoModal (cantidad can be string while editing) */
export interface GastoFormState {
  fecha: string
  cantidad: number | string
  forma: Forma
  concepto: Concepto
  nota: string
}
