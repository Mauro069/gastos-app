import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Plus,
  Loader2,
  AlertCircle,
  PiggyBank,
  TrendingUp,
  Target,
  LayoutDashboard,
  Trash2,
  Save,
  X,
} from "lucide-react"
import { AppShell, MonthPicker } from "@/components"
import { useUserSettings } from "@/contexts"
import {
  fetchPresupuesto,
  createPresupuesto,
  updatePresupuesto,
  deletePresupuesto,
  fetchGastosByRange,
  fetchUsdRates,
} from "@/api"
import { getChipHex } from "@/utils/chipColor"
import { MONTH_FULL } from "@/constants"

import type { Presupuesto } from "@/types"

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtUsd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)

const fmtArs = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n)

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function monthRange(year: number, month: number) {
  const from = `${year}-${pad(month)}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${pad(month)}-${pad(lastDay)}`
  return { from, to }
}

function destinoIcon(alias: string) {
  const lower = alias.toLowerCase()
  if (lower.includes("ahorro")) return { icon: <PiggyBank size={14} />, color: "var(--positive)" }
  if (lower.includes("invers")) return { icon: <TrendingUp size={14} />, color: "var(--accent)" }
  return { icon: <Target size={14} />, color: "var(--warn)" }
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "var(--surface-alt)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "7px 10px",
  color: "var(--ink)",
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
}

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 16,
  overflow: "hidden",
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100)
  const color = pct >= 100 ? "var(--negative)" : "var(--accent)"
  return (
    <div style={{ height: 3, background: "var(--line)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: `${clamped}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.3s" }} />
    </div>
  )
}

// ── Budget Panel (inline, right sidebar) ──────────────────────────────────────

interface ModalItem {
  tipo: "destino" | "categoria" | "grupo"
  concepto: string
  alias: string
  conceptos: string[]
  monto_usd: string
}

function itemFromExisting(i: import("@/types").PresupuestoItem): ModalItem {
  if (i.es_destino) {
    return { tipo: "destino", concepto: i.concepto ?? "", alias: i.alias ?? "", conceptos: [], monto_usd: String(i.monto_usd) }
  }
  const isGroup = !!(i.conceptos && i.conceptos.length > 0)
  return { tipo: isGroup ? "grupo" : "categoria", concepto: i.concepto ?? "", alias: i.alias ?? "", conceptos: i.conceptos ?? [], monto_usd: String(i.monto_usd) }
}

interface BudgetPanelProps {
  year: number
  month: number
  existing?: Presupuesto
  defaultRate: number
  conceptos: string[]
  onSave: (data: { total_usd: number; usd_rate: number; items: import("@/types").PresupuestoItem[] }) => Promise<void>
  onDelete?: () => void
  deleting?: boolean
}

function BudgetPanel({ year, month, existing, defaultRate, conceptos, onSave, onDelete, deleting }: BudgetPanelProps) {
  const [totalUsd, setTotalUsd] = useState(existing ? String(existing.total_usd) : "")
  const [usdRate, setUsdRate] = useState(existing ? String(existing.usd_rate) : defaultRate > 0 ? String(defaultRate) : "")
  const [items, setItems] = useState<ModalItem[]>(existing?.presupuesto_items.map(itemFromExisting) ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [confirmDel, setConfirmDel] = useState(false)

  const totalNum = parseFloat(totalUsd) || 0
  const rateNum = parseFloat(usdRate) || 0
  const sumItems = items.reduce((s, i) => s + (parseFloat(i.monto_usd) || 0), 0)
  const sumDestinos = items.filter((i) => i.tipo === "destino").reduce((s, i) => s + (parseFloat(i.monto_usd) || 0), 0)
  const resto = totalNum - sumItems
  const paraGastar = totalNum - sumDestinos

  function addItem(tipo: "destino" | "categoria" | "grupo") {
    if (tipo === "destino") {
      setItems((p) => [...p, { tipo: "destino", concepto: "", alias: "", conceptos: [], monto_usd: "" }])
    } else if (tipo === "categoria") {
      const used = new Set(items.filter((i) => i.tipo === "categoria" || (i.tipo === "destino" && i.concepto)).map((i) => i.concepto))
      const next = conceptos.find((c) => !used.has(c)) ?? ""
      setItems((p) => [...p, { tipo: "categoria", concepto: next, alias: "", conceptos: [], monto_usd: "" }])
    } else {
      setItems((p) => [...p, { tipo: "grupo", concepto: "", alias: "", conceptos: [], monto_usd: "" }])
    }
  }

  function removeItem(idx: number) { setItems((p) => p.filter((_, i) => i !== idx)) }

  function updateField<K extends keyof ModalItem>(idx: number, field: K, value: ModalItem[K]) {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  function toggleConcepto(idx: number, c: string) {
    setItems((p) => p.map((it, i) => {
      if (i !== idx) return it
      const has = it.conceptos.includes(c)
      return { ...it, conceptos: has ? it.conceptos.filter((x) => x !== c) : [...it.conceptos, c] }
    }))
  }

  function usedConceptos(selfIdx: number): Set<string> {
    const used = new Set<string>()
    items.forEach((it, i) => {
      if (i === selfIdx) return
      if (it.tipo === "categoria") used.add(it.concepto)
      else if (it.tipo === "destino" && it.concepto) used.add(it.concepto)
      else if (it.tipo === "grupo") it.conceptos.forEach((c) => used.add(c))
    })
    return used
  }

  async function handleSave() {
    setError("")
    if (!totalNum || totalNum <= 0) { setError("El total debe ser mayor a 0"); return }
    if (!rateNum || rateNum <= 0) { setError("El tipo de cambio es requerido"); return }
    if (resto < -0.01) { setError("Los montos superan el total"); return }
    for (const it of items) {
      if (it.tipo === "destino" && !it.alias.trim()) { setError("Los destinos necesitan un nombre"); return }
      if (it.tipo === "grupo" && !it.alias.trim()) { setError("Todos los grupos necesitan un nombre"); return }
      if (it.tipo === "grupo" && it.conceptos.length === 0) { setError(`El grupo "${it.alias || "sin nombre"}" no tiene categorías`); return }
    }
    setSaving(true)
    try {
      await onSave({
        total_usd: totalNum,
        usd_rate: rateNum,
        items: items
          .filter((i) => parseFloat(i.monto_usd) > 0)
          .map((i) => {
            if (i.tipo === "destino") return { concepto: i.concepto || null, alias: i.alias.trim() || null, conceptos: null, monto_usd: parseFloat(i.monto_usd), es_destino: true }
            if (i.tipo === "categoria") return { concepto: i.concepto, alias: null, conceptos: null, monto_usd: parseFloat(i.monto_usd), es_destino: false }
            return { concepto: null, alias: i.alias.trim(), conceptos: i.conceptos, monto_usd: parseFloat(i.monto_usd), es_destino: false }
          }),
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const tipoLabel: Record<ModalItem["tipo"], string> = { destino: "Destino", categoria: "Categoría", grupo: "Grupo" }

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-alt)" }}>
        <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-3)", marginBottom: 2 }}>
          {existing ? "Editar presupuesto" : "Nuevo presupuesto"}
        </p>
        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          {MONTH_FULL[month]} {year}
        </p>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Total + Rate */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-widest block mb-1.5" style={{ color: "var(--ink-3)" }}>
              Total (USD)
            </label>
            <input type="number" placeholder="2000" value={totalUsd} onChange={(e) => setTotalUsd(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest block mb-1.5" style={{ color: "var(--ink-3)" }}>
              Tipo de cambio
            </label>
            <input type="number" placeholder="1300" value={usdRate} onChange={(e) => setUsdRate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* ARS preview */}
        {totalNum > 0 && rateNum > 0 && (
          <div className="px-3 py-2 rounded-lg text-xs" style={{ background: "var(--surface-alt)", border: "1px solid var(--line)" }}>
            <span style={{ color: "var(--ink-3)" }}>≈ </span>
            <span className="num font-semibold" style={{ color: "var(--ink)" }}>{fmtArs(totalNum * rateNum)}</span>
          </div>
        )}

        {/* Items */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--ink-3)" }}>
            Destinos y categorías
          </p>

          <div className="space-y-2">
            {items.map((item, idx) => {
              const blocked = usedConceptos(idx)
              return (
                <div
                  key={idx}
                  style={{
                    background: "var(--surface-alt)",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "10px 10px 8px",
                  }}
                >
                  {/* Tipo toggle + delete */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex rounded-md p-0.5 gap-0.5" style={{ background: "var(--bg)" }}>
                      {(["destino", "categoria", "grupo"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => updateField(idx, "tipo", t)}
                          className="text-[10px] font-medium rounded px-2 py-0.5 transition-colors"
                          style={{
                            background: item.tipo === t ? "var(--surface)" : "transparent",
                            color: item.tipo === t ? "var(--ink)" : "var(--ink-3)",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          {tipoLabel[t]}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className="w-5 h-5 rounded flex items-center justify-center transition-opacity hover:opacity-60"
                      style={{ background: "transparent", color: "var(--ink-3)", border: "none", cursor: "pointer" }}
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {item.tipo === "destino" ? (
                    <div className="space-y-1.5">
                      <input
                        type="text" placeholder="Nombre (ej. Ahorro)…" value={item.alias}
                        onChange={(e) => updateField(idx, "alias", e.target.value)} style={inputStyle}
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        <select value={item.concepto} onChange={(e) => updateField(idx, "concepto", e.target.value)}
                          style={{ ...inputStyle, padding: "6px 8px" }}>
                          <option value="">Categoría…</option>
                          {conceptos.map((c) => <option key={c} value={c} disabled={blocked.has(c)}>{c}</option>)}
                        </select>
                        <input type="number" placeholder="USD" value={item.monto_usd}
                          onChange={(e) => updateField(idx, "monto_usd", e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                  ) : item.tipo === "categoria" ? (
                    <div className="grid grid-cols-[1fr_80px] gap-1.5">
                      <select value={item.concepto} onChange={(e) => updateField(idx, "concepto", e.target.value)}
                        style={{ ...inputStyle, padding: "6px 8px" }}>
                        <option value="">Categoría…</option>
                        {conceptos.map((c) => <option key={c} value={c} disabled={blocked.has(c)}>{c}</option>)}
                      </select>
                      <input type="number" placeholder="USD" value={item.monto_usd}
                        onChange={(e) => updateField(idx, "monto_usd", e.target.value)} style={inputStyle} />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-[1fr_80px] gap-1.5">
                        <input type="text" placeholder="Nombre del grupo…" value={item.alias}
                          onChange={(e) => updateField(idx, "alias", e.target.value)} style={inputStyle} />
                        <input type="number" placeholder="USD" value={item.monto_usd}
                          onChange={(e) => updateField(idx, "monto_usd", e.target.value)} style={inputStyle} />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {conceptos.map((c) => {
                          const selected = item.conceptos.includes(c)
                          const disabled = !selected && blocked.has(c)
                          return (
                            <button key={c} onClick={() => !disabled && toggleConcepto(idx, c)} disabled={disabled}
                              className="text-[10px] px-2 py-0.5 rounded-full transition-colors"
                              style={{
                                border: `1px solid ${selected ? "var(--accent)" : "var(--line)"}`,
                                background: selected ? "var(--accent-soft)" : "transparent",
                                color: disabled ? "var(--ink-3)" : selected ? "var(--accent)" : "var(--ink-2)",
                                cursor: disabled ? "default" : "pointer",
                                opacity: disabled ? 0.4 : 1,
                              }}>
                              {c}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add buttons */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {(["destino", "categoria", "grupo"] as const).map((t, i) => (
              <span key={t} className="flex items-center gap-2">
                {i > 0 && <span className="text-xs" style={{ color: "var(--line)" }}>·</span>}
                <button onClick={() => addItem(t)}
                  className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
                  style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
                  <Plus size={12} /> {tipoLabel[t]}
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Summary preview */}
        {totalNum > 0 && (
          <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
            {sumDestinos > 0 && (
              <div className="flex justify-between items-center px-3 py-2 text-xs"
                style={{ borderBottom: "1px solid var(--line)" }}>
                <span style={{ color: "var(--ink-3)" }}>Para gastar</span>
                <span className="num font-semibold" style={{ color: "var(--ink)" }}>{fmtUsd(paraGastar)}</span>
              </div>
            )}
            <div className="flex justify-between items-center px-3 py-2 text-xs">
              <span style={{ color: "var(--ink-3)" }}>El resto</span>
              <span className="num font-semibold" style={{ color: resto < 0 ? "var(--negative)" : "var(--ink)" }}>{fmtUsd(Math.max(0, resto))}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--negative)" }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-3 space-y-2" style={{ borderTop: "1px solid var(--line)" }}>
        <button
          onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60 transition-opacity"
          style={{ background: "var(--accent)", color: "var(--accent-ink)", border: "none", cursor: saving ? "default" : "pointer" }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Guardando…" : existing ? "Guardar cambios" : "Crear presupuesto"}
        </button>

        {existing && onDelete && (
          confirmDel ? (
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(false)}
                className="flex-1 py-2 rounded-lg text-xs font-medium"
                style={{ background: "var(--surface-alt)", color: "var(--ink-2)", border: "1px solid var(--line)", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={onDelete} disabled={deleting}
                className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                style={{ background: "var(--negative)", color: "#fff", border: "none", cursor: "pointer" }}>
                {deleting && <Loader2 size={12} className="animate-spin" />}
                Confirmar
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--neg-soft)", color: "var(--negative)", border: "1px solid color-mix(in srgb, var(--negative) 30%, transparent)", cursor: "pointer" }}>
              <Trash2 size={12} /> Eliminar presupuesto
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PresupuestoPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed

  const queryClient = useQueryClient()
  const { settings } = useUserSettings()

  const month1 = month + 1
  const mk = `${year}-${pad(month1)}`
  const { from, to } = monthRange(year, month1)

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: presupuesto, isLoading: presLoading } = useQuery({
    queryKey: ["presupuesto", year, month1],
    queryFn: () => fetchPresupuesto(year, month1),
  })

  const { data: gastos = [] } = useQuery({
    queryKey: ["gastos-range", from, to],
    queryFn: () => fetchGastosByRange(from, to),
  })

  const { data: usdRates = {} } = useQuery({
    queryKey: ["usdRates"],
    queryFn: fetchUsdRates,
  })

  const currentRate = (usdRates as Record<string, number>)[mk] ?? 0
  const rate = presupuesto?.usd_rate ?? currentRate

  // ── Derived ───────────────────────────────────────────────────────────────

  const { spendByConcepto, totalGastadoUsd } = useMemo(() => {
    const divisor = rate || 1
    const map: Record<string, number> = {}
    for (const g of gastos) map[g.concepto] = (map[g.concepto] ?? 0) + g.cantidad / divisor
    const total = Object.values(map).reduce((a, b) => a + b, 0)
    return { spendByConcepto: map, totalGastadoUsd: total }
  }, [gastos, rate])

  const destinoItems = presupuesto?.presupuesto_items.filter((i) => i.es_destino) ?? []
  const gastoItems = presupuesto?.presupuesto_items.filter((i) => !i.es_destino) ?? []

  const sumDestinosUsd = destinoItems.reduce((s, i) => s + i.monto_usd, 0)
  const gastadoDestinosTotal = destinoItems.reduce((s, i) => s + (i.concepto ? (spendByConcepto[i.concepto] ?? 0) : 0), 0)
  const presupuestoParaGastos = (presupuesto?.total_usd ?? 0) - sumDestinosUsd
  const gastadoParaGastos = totalGastadoUsd - gastadoDestinosTotal

  const destinoConceptos = new Set(destinoItems.map((i) => i.concepto).filter(Boolean) as string[])
  const budgetedConceptosGastos = new Set(gastoItems.flatMap((i) => i.conceptos && i.conceptos.length > 0 ? i.conceptos : i.concepto ? [i.concepto] : []))
  const allBudgetedConceptos = new Set([...destinoConceptos, ...budgetedConceptosGastos])

  const sumBudgetedGastosUsd = gastoItems.reduce((s, i) => s + i.monto_usd, 0)
  const restoPres = presupuestoParaGastos - sumBudgetedGastosUsd
  const restoGastado = gastos.filter((g) => !allBudgetedConceptos.has(g.concepto)).reduce((s, g) => s + g.cantidad / (rate || 1), 0)

  // ── Mutations ─────────────────────────────────────────────────────────────

  const saveMut = useMutation({
    mutationFn: async (data: { total_usd: number; usd_rate: number; items: import("@/types").PresupuestoItem[] }) => {
      if (presupuesto) return updatePresupuesto(presupuesto.id, data)
      else return createPresupuesto({ year, month: month1, ...data })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["presupuesto", year, month1] }),
  })

  const deleteMut = useMutation({
    mutationFn: () => deletePresupuesto(presupuesto!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["presupuesto", year, month1] }),
  })

  // ── Render ────────────────────────────────────────────────────────────────

  const disponible = (presupuesto?.total_usd ?? 0) - totalGastadoUsd
  const overBudget = totalGastadoUsd > (presupuesto?.total_usd ?? 0)

  return (
    <AppShell>
      {/* ── Header ── */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-5"
        style={{ height: 56, background: "var(--surface)", borderBottom: "1px solid var(--line)" }}
      >
        <LayoutDashboard className="w-4 h-4 hidden sm:block" style={{ color: "var(--accent)" }} />
        <h1 className="text-sm font-semibold hidden sm:block" style={{ color: "var(--ink)" }}>Presupuesto</h1>
        <div className="flex-1" />
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
      </header>

      {/* ── Two-column body ── */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">

        {/* ── Left column: KPI grid + budget view ── */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ borderRight: "1px solid var(--line)" }}>

          {/* KPI grid */}
          <div
            className="grid grid-cols-3 flex-shrink-0"
            style={{ gap: 1, background: "var(--line)", borderBottom: "1px solid var(--line)" }}
          >
            {[
              {
                label: "Presupuesto",
                value: presupuesto ? fmtUsd(presupuesto.total_usd) : "—",
                sub: presupuesto ? fmtArs(presupuesto.total_usd * rate) : "",
                valueColor: "var(--ink)",
              },
              {
                label: "Gastado",
                value: presupuesto ? fmtUsd(totalGastadoUsd) : "—",
                sub: presupuesto ? fmtArs(totalGastadoUsd * rate) : "",
                valueColor: "var(--ink)",
              },
              {
                label: "Disponible",
                value: presupuesto ? fmtUsd(disponible) : "—",
                sub: presupuesto ? fmtArs(disponible * rate) : "",
                valueColor: overBudget ? "var(--negative)" : "var(--positive)",
              },
            ].map((k, i) => (
              <div key={i} style={{ background: "var(--surface)", padding: "18px 20px" }}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-3)", marginBottom: 8 }}>
                  {k.label}
                </p>
                <p className="num font-semibold leading-none" style={{ fontSize: 22, letterSpacing: "-0.03em", color: k.valueColor, marginBottom: 6 }}>
                  {k.value}
                </p>
                {k.sub && <p className="text-[11px] num" style={{ color: "var(--ink-3)" }}>{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Budget view */}
          <main className="flex-1 overflow-y-auto min-h-0 p-4 lg:p-5 space-y-4">
          {presLoading ? (
            <div className="flex justify-center pt-20">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--ink-3)" }} />
            </div>
          ) : !presupuesto ? (
            <div className="flex flex-col items-center justify-center pt-20 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: "var(--surface-alt)" }}>💰</div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--ink)", marginBottom: 4 }}>Sin presupuesto</p>
                <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                  Configurá el presupuesto de {MONTH_FULL[month]} {year} en el panel derecho
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Overall progress */}
              <div style={{ ...card, padding: "14px 16px" }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--ink-2)" }}>Progreso general</span>
                  <span className="num text-xs" style={{ color: "var(--ink-3)" }}>
                    {presupuesto.total_usd > 0 ? Math.round((totalGastadoUsd / presupuesto.total_usd) * 100) : 0}%
                  </span>
                </div>
                <ProgressBar pct={presupuesto.total_usd > 0 ? (totalGastadoUsd / presupuesto.total_usd) * 100 : 0} />
                <p className="text-[10px] mt-2" style={{ color: "var(--ink-3)" }}>
                  Tipo de cambio: <span className="num">${presupuesto.usd_rate.toLocaleString("es-AR")}</span>
                  {" "}· Gastos en ARS convertidos con este valor
                </p>
              </div>

              {/* Destinos prioritarios */}
              {destinoItems.length > 0 && (
                <div style={card}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-alt)" }}>
                    <span style={{ fontSize: 10, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Destinos prioritarios</span>
                    <span style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right" }}>Asignado</span>
                    <span style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right" }}>Ejecutado</span>
                  </div>

                  {destinoItems.map((item, idx) => {
                    const label = item.alias || item.concepto || "Sin nombre"
                    const gastado = item.concepto ? (spendByConcepto[item.concepto] ?? 0) : 0
                    const hasTracking = !!item.concepto
                    const pct = item.monto_usd > 0 ? (gastado / item.monto_usd) * 100 : 0
                    const over = gastado > item.monto_usd
                    const { icon, color: iconColor } = destinoIcon(label)
                    return (
                      <div key={idx} style={{ padding: "14px 16px", borderBottom: idx < destinoItems.length - 1 ? "1px solid var(--line)" : "none" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px", gap: 12, alignItems: "flex-start", marginBottom: hasTracking ? 10 : 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 2, flexWrap: "wrap" }}>
                            <span style={{ color: iconColor, display: "flex", alignItems: "center" }}>{icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{label}</span>
                            {item.concepto && (
                              <span style={{ fontSize: 10, color: "var(--ink-3)", background: "var(--surface-alt)", padding: "1px 6px", borderRadius: 10, border: "1px solid var(--line)" }}>
                                {item.concepto}
                              </span>
                            )}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div className="num" style={{ fontSize: 13, color: "var(--ink-2)" }}>{fmtUsd(item.monto_usd)}</div>
                            <div className="num" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>{fmtArs(item.monto_usd * rate)}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {hasTracking ? (
                              <>
                                <div className="num" style={{ fontSize: 13, fontWeight: 700, color: over ? "var(--negative)" : "var(--ink)" }}>{fmtUsd(gastado)}</div>
                                <div className="num" style={{ fontSize: 10, color: over ? "var(--negative)" : "var(--ink-3)", marginTop: 1, opacity: 0.8 }}>{fmtArs(gastado * rate)}</div>
                              </>
                            ) : (
                              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>—</span>
                            )}
                          </div>
                        </div>
                        {hasTracking && (
                          <>
                            <ProgressBar pct={pct} />
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                              <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{Math.round(pct)}% ejecutado</span>
                              <span className="num" style={{ fontSize: 10, color: over ? "var(--negative)" : "var(--ink-3)" }}>
                                {over ? "+" : ""}{fmtUsd(Math.abs(item.monto_usd - gastado))} ({fmtArs(Math.abs(item.monto_usd - gastado) * rate)}) {over ? "pasado" : "restante"}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}

                  {/* Queda para gastar subtotal */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px", gap: 12, padding: "12px 16px", background: "var(--surface-alt)", borderTop: "1px solid var(--line)" }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>Queda para gastar</span>
                      <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>Descontando destinos</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="num" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{fmtUsd(presupuestoParaGastos)}</div>
                      <div className="num" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>{fmtArs(presupuestoParaGastos * rate)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="num" style={{ fontSize: 12, fontWeight: 700, color: gastadoParaGastos > presupuestoParaGastos ? "var(--negative)" : "var(--ink)" }}>{fmtUsd(gastadoParaGastos)}</div>
                      <div className="num" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1, opacity: 0.8 }}>{fmtArs(gastadoParaGastos * rate)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gastos del mes */}
              <div style={card}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-alt)" }}>
                  {[destinoItems.length > 0 ? "Gastos del mes" : "Categoría", "Presupuesto", "Gastado"].map((h, i) => (
                    <span key={h} style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i > 0 ? "right" : "left" }}>{h}</span>
                  ))}
                </div>

                {gastoItems.map((item, idx) => {
                  const isGroup = !!(item.conceptos && item.conceptos.length > 0)
                  const label = item.alias ?? item.concepto ?? "Sin nombre"
                  const cats: string[] = isGroup ? (item.conceptos ?? []) : item.concepto ? [item.concepto] : []
                  const gastado = cats.reduce((s, c) => s + (spendByConcepto[c] ?? 0), 0)
                  const pct = item.monto_usd > 0 ? (gastado / item.monto_usd) * 100 : 0
                  const over = gastado > item.monto_usd
                  const diffUsd = over ? gastado - item.monto_usd : item.monto_usd - gastado
                  const dotColor = isGroup ? "var(--accent)" : getChipHex(item.concepto ?? "", "concepto", settings)
                  const isLast = idx === gastoItems.length - 1 && restoPres <= 0
                  return (
                    <div key={idx} style={{ padding: "14px 16px", borderBottom: isLast ? "none" : "1px solid var(--line)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px", gap: 12, alignItems: "flex-start", marginBottom: isGroup ? 6 : 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, paddingTop: 2 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{label}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className="num" style={{ fontSize: 13, color: "var(--ink-2)" }}>{fmtUsd(item.monto_usd)}</div>
                          <div className="num" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>{fmtArs(item.monto_usd * rate)}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className="num" style={{ fontSize: 13, fontWeight: 700, color: over ? "var(--negative)" : "var(--ink)" }}>{fmtUsd(gastado)}</div>
                          <div className="num" style={{ fontSize: 10, color: over ? "var(--negative)" : "var(--ink-3)", marginTop: 1, opacity: 0.8 }}>{fmtArs(gastado * rate)}</div>
                        </div>
                      </div>
                      {isGroup && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10, paddingLeft: 14 }}>
                          {cats.map((c) => {
                            const hex = getChipHex(c, "concepto", settings)
                            return (
                              <span key={c} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: `${hex}18`, color: hex, border: `1px solid ${hex}30` }}>{c}</span>
                            )
                          })}
                        </div>
                      )}
                      <ProgressBar pct={pct} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                        <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{Math.round(pct)}% del presupuesto</span>
                        <span className="num" style={{ fontSize: 10, color: over ? "var(--negative)" : "var(--ink-3)" }}>
                          {over ? "+" : ""}{fmtUsd(diffUsd)} ({fmtArs(diffUsd * rate)}) {over ? "pasado" : "restante"}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {/* El resto */}
                {restoPres > 0 && (
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ink-3)", flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)", fontStyle: "italic" }}>El resto</span>
                        </div>
                        <span style={{ fontSize: 10, color: "var(--ink-3)", paddingLeft: 14 }}>Categorías sin límite definido</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="num" style={{ fontSize: 13, color: "var(--ink-2)" }}>{fmtUsd(restoPres)}</div>
                        <div className="num" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>{fmtArs(restoPres * rate)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="num" style={{ fontSize: 13, fontWeight: 700, color: restoGastado > restoPres ? "var(--negative)" : "var(--ink)" }}>{fmtUsd(restoGastado)}</div>
                        <div className="num" style={{ fontSize: 10, color: restoGastado > restoPres ? "var(--negative)" : "var(--ink-3)", marginTop: 1, opacity: 0.8 }}>{fmtArs(restoGastado * rate)}</div>
                      </div>
                    </div>
                    <ProgressBar pct={restoPres > 0 ? (restoGastado / restoPres) * 100 : 0} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{Math.round(restoPres > 0 ? (restoGastado / restoPres) * 100 : 0)}% del presupuesto</span>
                      <span className="num" style={{ fontSize: 10, color: restoGastado > restoPres ? "var(--negative)" : "var(--ink-3)" }}>
                        {restoGastado > restoPres ? "+" : ""}{fmtUsd(Math.abs(restoPres - restoGastado))} ({fmtArs(Math.abs(restoPres - restoGastado) * rate)}) {restoGastado > restoPres ? "pasado" : "restante"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Total row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px", gap: 12, padding: "12px 16px", background: "var(--surface-alt)", borderTop: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>Total</span>
                  <div style={{ textAlign: "right" }}>
                    <div className="num" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{fmtUsd(destinoItems.length > 0 ? presupuestoParaGastos : presupuesto.total_usd)}</div>
                    <div className="num" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>{fmtArs((destinoItems.length > 0 ? presupuestoParaGastos : presupuesto.total_usd) * rate)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="num" style={{ fontSize: 12, fontWeight: 600, color: gastadoParaGastos > presupuestoParaGastos ? "var(--negative)" : "var(--ink)" }}>{fmtUsd(destinoItems.length > 0 ? gastadoParaGastos : totalGastadoUsd)}</div>
                    <div className="num" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1, opacity: 0.8 }}>{fmtArs((destinoItems.length > 0 ? gastadoParaGastos : totalGastadoUsd) * rate)}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
        </div>{/* end left column */}

        {/* ── Right: config panel ── */}
        <aside
          className="lg:w-[380px] lg:flex-shrink-0 overflow-y-auto min-h-0 border-t lg:border-t-0"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          {!presLoading && (
            <BudgetPanel
              key={`${year}-${month1}`}
              year={year}
              month={month}
              existing={presupuesto ?? undefined}
              defaultRate={currentRate}
              conceptos={settings.conceptos}
              onSave={async (data) => { await saveMut.mutateAsync(data) }}
              onDelete={() => deleteMut.mutate()}
              deleting={deleteMut.isPending}
            />
          )}
          {presLoading && (
            <div className="flex justify-center pt-10">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--ink-3)" }} />
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  )
}
