import type { PresupuestoItem } from "@/types"

export interface ModalItem {
  tipo: "destino" | "categoria" | "grupo"
  concepto: string
  alias: string
  conceptos: string[]
  monto_usd: string
}

export function itemFromExisting(i: PresupuestoItem): ModalItem {
  if (i.es_destino) {
    return { tipo: "destino", concepto: i.concepto ?? "", alias: i.alias ?? "", conceptos: [], monto_usd: String(i.monto_usd) }
  }
  const isGroup = !!(i.conceptos && i.conceptos.length > 0)
  return { tipo: isGroup ? "grupo" : "categoria", concepto: i.concepto ?? "", alias: i.alias ?? "", conceptos: i.conceptos ?? [], monto_usd: String(i.monto_usd) }
}
