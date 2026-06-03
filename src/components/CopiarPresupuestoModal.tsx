import { useState, useEffect } from "react"
import {
  Plus,
  Loader2,
  AlertCircle,
  Save,
  X,
} from "lucide-react"
import {
  fetchPresupuesto,
  createPresupuesto,
  updatePresupuesto,
} from "@/api"
import { MONTH_FULL } from "@/constants"
import { ModalItem, itemFromExisting } from "@/utils/presupuesto"
import MonthPicker from "@/components/MonthPicker"

import type { Presupuesto } from "@/types"

interface Props {
  sourceYear: number
  sourceMonth: number
  sourceBudget: Presupuesto
  conceptos: string[]
  onClose: () => void
  onSuccess: (targetYear: number, targetMonth: number) => void
}

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

export default function CopiarPresupuestoModal({
  sourceYear,
  sourceMonth,
  sourceBudget,
  conceptos,
  onClose,
  onSuccess,
}: Props) {
  // ── Month selection ───────────────────────────────────────────────────────
  const defaultMonth = sourceMonth === 11 ? 0 : sourceMonth + 1
  const defaultYear = sourceMonth === 11 ? sourceYear + 1 : sourceYear

  const [targetYear, setTargetYear] = useState(defaultYear)
  const [targetMonth, setTargetMonth] = useState(defaultMonth)

  // ── Budget fields ─────────────────────────────────────────────────────────
  const [totalUsd, setTotalUsd] = useState(String(sourceBudget.total_usd))
  const [usdRate, setUsdRate] = useState(String(sourceBudget.usd_rate))
  const [items, setItems] = useState<ModalItem[]>(
    sourceBudget.presupuesto_items.map(itemFromExisting)
  )

  // ── Conflict detection ────────────────────────────────────────────────────
  const [existingTarget, setExistingTarget] = useState<Presupuesto | null>(null)
  const [checking, setChecking] = useState(false)

  // ── Submit state ──────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalNum = parseFloat(totalUsd) || 0
  const rateNum = parseFloat(usdRate) || 0
  const sumItems = items.reduce((s, i) => s + (parseFloat(i.monto_usd) || 0), 0)
  const sumDestinos = items.filter((i) => i.tipo === "destino").reduce((s, i) => s + (parseFloat(i.monto_usd) || 0), 0)
  const resto = totalNum - sumItems
  const paraGastar = totalNum - sumDestinos

  // ── Check for existing budget in target month ─────────────────────────────
  useEffect(() => {
    setExistingTarget(null)
    setChecking(true)
    const month1 = targetMonth + 1

    fetchPresupuesto(targetYear, month1)
      .then((result) => setExistingTarget(result))
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [targetYear, targetMonth])

  // ── Item management helpers ───────────────────────────────────────────────
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

  function removeItem(idx: number) {
    setItems((p) => p.filter((_, i) => i !== idx))
  }

  function updateField<K extends keyof ModalItem>(idx: number, field: K, value: ModalItem[K]) {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  function toggleConcepto(idx: number, c: string) {
    setItems((p) =>
      p.map((it, i) => {
        if (i !== idx) return it
        const has = it.conceptos.includes(c)
        return { ...it, conceptos: has ? it.conceptos.filter((x) => x !== c) : [...it.conceptos, c] }
      })
    )
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
    if (!totalNum || totalNum <= 0) {
      setError("El total debe ser mayor a 0")
      return
    }
    if (!rateNum || rateNum <= 0) {
      setError("El tipo de cambio es requerido")
      return
    }
    if (resto < -0.01) {
      setError("Los montos superan el total")
      return
    }
    for (const it of items) {
      if (it.tipo === "destino" && !it.alias.trim()) {
        setError("Los destinos necesitan un nombre")
        return
      }
      if (it.tipo === "grupo" && !it.alias.trim()) {
        setError("Todos los grupos necesitan un nombre")
        return
      }
      if (it.tipo === "grupo" && it.conceptos.length === 0) {
        setError(`El grupo "${it.alias || "sin nombre"}" no tiene categorías`)
        return
      }
    }

    setSaving(true)
    try {
      const month1 = targetMonth + 1
      const itemPayload = items
        .filter((i) => parseFloat(i.monto_usd) > 0)
        .map((i) => {
          if (i.tipo === "destino") return { concepto: i.concepto || null, alias: i.alias.trim() || null, conceptos: null, monto_usd: parseFloat(i.monto_usd), es_destino: true }
          if (i.tipo === "categoria") return { concepto: i.concepto, alias: null, conceptos: null, monto_usd: parseFloat(i.monto_usd), es_destino: false }
          return { concepto: null, alias: i.alias.trim(), conceptos: i.conceptos, monto_usd: parseFloat(i.monto_usd), es_destino: false }
        })

      if (existingTarget) {
        await updatePresupuesto(existingTarget.id, {
          total_usd: totalNum,
          usd_rate: rateNum,
          items: itemPayload,
        })
      } else {
        await createPresupuesto({
          year: targetYear,
          month: month1,
          total_usd: totalNum,
          usd_rate: rateNum,
          items: itemPayload,
        })
      }

      onSuccess(targetYear, targetMonth)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const tipoLabel: Record<ModalItem["tipo"], string> = { destino: "Destino", categoria: "Categoría", grupo: "Grupo" }


  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex-shrink-0 flex items-center justify-between"
          style={{
            borderBottom: "1px solid var(--line)",
            background: "var(--surface-alt)",
          }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-3)", marginBottom: 2 }}>
              Copiar presupuesto
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {MONTH_FULL[sourceMonth]} {sourceYear}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center transition-opacity hover:opacity-60"
            style={{ background: "transparent", color: "var(--ink-3)", border: "none", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Target month selector */}
          <div>
            <label className="text-[10px] uppercase tracking-widest block mb-2" style={{ color: "var(--ink-3)" }}>
              Copiar a
            </label>
            <div>
              <MonthPicker
                year={targetYear}
                month={targetMonth}
                onChange={(y, m) => {
                  setTargetYear(y)
                  setTargetMonth(m)
                }}
              />
            </div>
          </div>

          {/* Conflict warning */}
          {existingTarget && !checking && (
            <div
              className="p-3 rounded-lg text-xs flex gap-2"
              style={{
                background: "color-mix(in srgb, var(--warn) 15%, transparent)",
                border: "1px solid color-mix(in srgb, var(--warn) 40%, transparent)",
                color: "var(--warn)",
              }}
            >
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>
                Ya existe un presupuesto para {MONTH_FULL[targetMonth]} {targetYear}. Al guardar, se reemplazarán todos sus ítems.
              </span>
            </div>
          )}

          {/* Total + Rate */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-widest block mb-1.5" style={{ color: "var(--ink-3)" }}>
                Total (USD)
              </label>
              <input
                type="number"
                placeholder="2000"
                value={totalUsd}
                onChange={(e) => setTotalUsd(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest block mb-1.5" style={{ color: "var(--ink-3)" }}>
                Tipo de cambio
              </label>
              <input
                type="number"
                placeholder="1300"
                value={usdRate}
                onChange={(e) => setUsdRate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* ARS preview */}
          {totalNum > 0 && rateNum > 0 && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ background: "var(--surface-alt)", border: "1px solid var(--line)" }}>
              <span style={{ color: "var(--ink-3)" }}>≈ </span>
              <span className="num font-semibold" style={{ color: "var(--ink)" }}>
                {fmtArs(totalNum * rateNum)}
              </span>
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
                          type="text"
                          placeholder="Nombre (ej. Ahorro)…"
                          value={item.alias}
                          onChange={(e) => updateField(idx, "alias", e.target.value)}
                          style={inputStyle}
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <select
                            value={item.concepto}
                            onChange={(e) => updateField(idx, "concepto", e.target.value)}
                            style={{ ...inputStyle, padding: "6px 8px" }}
                          >
                            <option value="">Categoría…</option>
                            {conceptos.map((c) => (
                              <option key={c} value={c} disabled={blocked.has(c)}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="USD"
                            value={item.monto_usd}
                            onChange={(e) => updateField(idx, "monto_usd", e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    ) : item.tipo === "categoria" ? (
                      <div className="grid grid-cols-[1fr_80px] gap-1.5">
                        <select
                          value={item.concepto}
                          onChange={(e) => updateField(idx, "concepto", e.target.value)}
                          style={{ ...inputStyle, padding: "6px 8px" }}
                        >
                          <option value="">Categoría…</option>
                          {conceptos.map((c) => (
                            <option key={c} value={c} disabled={blocked.has(c)}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="USD"
                          value={item.monto_usd}
                          onChange={(e) => updateField(idx, "monto_usd", e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-[1fr_80px] gap-1.5">
                          <input
                            type="text"
                            placeholder="Nombre del grupo…"
                            value={item.alias}
                            onChange={(e) => updateField(idx, "alias", e.target.value)}
                            style={inputStyle}
                          />
                          <input
                            type="number"
                            placeholder="USD"
                            value={item.monto_usd}
                            onChange={(e) => updateField(idx, "monto_usd", e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {conceptos.map((c) => {
                            const selected = item.conceptos.includes(c)
                            const disabled = !selected && blocked.has(c)
                            return (
                              <button
                                key={c}
                                onClick={() => !disabled && toggleConcepto(idx, c)}
                                disabled={disabled}
                                className="text-[10px] px-2 py-0.5 rounded-full transition-colors"
                                style={{
                                  border: `1px solid ${selected ? "var(--accent)" : "var(--line)"}`,
                                  background: selected ? "var(--accent-soft)" : "transparent",
                                  color: disabled ? "var(--ink-3)" : selected ? "var(--accent)" : "var(--ink-2)",
                                  cursor: disabled ? "default" : "pointer",
                                  opacity: disabled ? 0.4 : 1,
                                }}
                              >
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
                  {i > 0 && (
                    <span className="text-xs" style={{ color: "var(--line)" }}>
                      ·
                    </span>
                  )}
                  <button
                    onClick={() => addItem(t)}
                    className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
                    style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}
                  >
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
                <div className="flex justify-between items-center px-3 py-2 text-xs" style={{ borderBottom: "1px solid var(--line)" }}>
                  <span style={{ color: "var(--ink-3)" }}>Para gastar</span>
                  <span className="num font-semibold" style={{ color: "var(--ink)" }}>
                    {fmtUsd(paraGastar)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center px-3 py-2 text-xs">
                <span style={{ color: "var(--ink-3)" }}>El resto</span>
                <span className="num font-semibold" style={{ color: resto < 0 ? "var(--negative)" : "var(--ink)" }}>
                  {fmtUsd(Math.max(0, resto))}
                </span>
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
        <div className="flex-shrink-0 px-6 py-3 space-y-2" style={{ borderTop: "1px solid var(--line)" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60 transition-opacity"
            style={{ background: "var(--accent)", color: "var(--accent-ink)", border: "none", cursor: saving ? "default" : "pointer" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Guardando…" : existingTarget ? "Reemplazar presupuesto" : "Copiar presupuesto"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-full py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-60"
            style={{ background: "var(--surface-alt)", color: "var(--ink-2)", border: "1px solid var(--line)", cursor: "pointer" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
