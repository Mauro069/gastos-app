import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
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

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "var(--surface-alt)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "var(--ink)",
  fontSize: 14,
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
  const color =
    pct >= 100
      ? "var(--negative)"
      : pct >= 80
        ? "var(--warn)"
        : "var(--positive)"
  return (
    <div
      style={{
        height: 4,
        background: "var(--surface-alt)",
        borderRadius: 99,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: "100%",
          background: color,
          borderRadius: 99,
          transition: "width 0.3s",
        }}
      />
    </div>
  )
}

// ── Budget Modal ──────────────────────────────────────────────────────────────

interface ModalItem {
  concepto: string
  monto_usd: string
}

interface BudgetModalProps {
  year: number
  month: number
  existing?: Presupuesto
  defaultRate: number
  conceptos: string[]
  onClose: () => void
  onSave: (data: {
    total_usd: number
    usd_rate: number
    items: { concepto: string; monto_usd: number }[]
  }) => Promise<void>
}

function BudgetModal({
  year,
  month,
  existing,
  defaultRate,
  conceptos,
  onClose,
  onSave,
}: BudgetModalProps) {
  const [totalUsd, setTotalUsd] = useState(
    existing ? String(existing.total_usd) : "",
  )
  const [usdRate, setUsdRate] = useState(
    existing
      ? String(existing.usd_rate)
      : defaultRate > 0
        ? String(defaultRate)
        : "",
  )
  const [items, setItems] = useState<ModalItem[]>(
    existing?.presupuesto_items.map((i) => ({
      concepto: i.concepto,
      monto_usd: String(i.monto_usd),
    })) ?? [],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const totalNum = parseFloat(totalUsd) || 0
  const rateNum = parseFloat(usdRate) || 0
  const sumItems = items.reduce((s, i) => s + (parseFloat(i.monto_usd) || 0), 0)
  const resto = totalNum - sumItems

  function addItem() {
    const used = new Set(items.map((i) => i.concepto))
    const next = conceptos.find((c) => !used.has(c)) ?? ""
    setItems((prev) => [...prev, { concepto: next, monto_usd: "" }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof ModalItem, value: string) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    )
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
      setError("Los montos por categoría superan el total")
      return
    }
    setSaving(true)
    try {
      await onSave({
        total_usd: totalNum,
        usd_rate: rateNum,
        items: items
          .filter((i) => i.concepto && parseFloat(i.monto_usd) > 0)
          .map((i) => ({
            concepto: i.concepto,
            monto_usd: parseFloat(i.monto_usd),
          })),
      })
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar")
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 20,
          width: "min(520px, 95vw)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 10,
                color: "var(--ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 2,
              }}
            >
              {existing ? "Editar" : "Crear"} presupuesto
            </p>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--ink)",
                margin: 0,
              }}
            >
              {MONTH_FULL[month]} {year}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: "var(--surface-alt)",
              color: "var(--ink-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* Total + Rate */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 10,
                  color: "var(--ink-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Total (USD)
              </label>
              <input
                type="number"
                placeholder="1000"
                value={totalUsd}
                onChange={(e) => setTotalUsd(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 10,
                  color: "var(--ink-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "block",
                  marginBottom: 6,
                }}
              >
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

          {/* ARS equivalent preview */}
          {totalNum > 0 && rateNum > 0 && (
            <div
              style={{
                marginBottom: 20,
                padding: "10px 12px",
                background: "var(--accent-soft)",
                borderRadius: 10,
                fontSize: 13,
                color: "var(--ink-2)",
              }}
            >
              <span style={{ color: "var(--ink-3)" }}>Equivalente: </span>
              <span
                className="num"
                style={{ fontWeight: 600, color: "var(--ink)" }}
              >
                {fmtArs(totalNum * rateNum)}
              </span>
            </div>
          )}

          {/* Items section */}
          <div style={{ marginBottom: 16 }}>
            <p
              style={{
                fontSize: 10,
                color: "var(--ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 10,
              }}
            >
              Por categoría
            </p>

            {items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 32px",
                  gap: 8,
                  marginBottom: 8,
                  alignItems: "center",
                }}
              >
                <select
                  value={item.concepto}
                  onChange={(e) => updateItem(idx, "concepto", e.target.value)}
                  style={{ ...inputStyle, padding: "8px 10px" }}
                >
                  <option value="">Categoría…</option>
                  {conceptos.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="USD"
                  value={item.monto_usd}
                  onChange={(e) => updateItem(idx, "monto_usd", e.target.value)}
                  style={inputStyle}
                />
                <button
                  onClick={() => removeItem(idx)}
                  style={{
                    width: 32,
                    height: 36,
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    background: "var(--neg-soft)",
                    color: "var(--negative)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            <button
              onClick={addItem}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
                marginTop: 4,
              }}
            >
              <Plus size={14} /> Agregar categoría
            </button>
          </div>

          {/* El resto preview */}
          {totalNum > 0 && (
            <div
              style={{
                padding: "10px 12px",
                background: "var(--surface-alt)",
                borderRadius: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--ink-2)" }}>
                El resto (otras categorías)
              </span>
              <span
                className="num"
                style={{
                  fontWeight: 600,
                  color: resto < 0 ? "var(--negative)" : "var(--ink)",
                }}
              >
                {fmtUsd(Math.max(0, resto))}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--negative)",
                fontSize: 13,
              }}
            >
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--surface-alt)",
              color: "var(--ink-2)",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "9px 20px",
              borderRadius: 10,
              border: "none",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {saving && (
              <Loader2
                size={14}
                style={{ animation: "spin 1s linear infinite" }}
              />
            )}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PresupuestoPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed like JS Date / MonthPicker
  const [showModal, setShowModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const queryClient = useQueryClient()
  const { settings } = useUserSettings()

  // Convert to 1-indexed for API and date math
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

  // ── Derived ───────────────────────────────────────────────────────────────

  const rate = presupuesto?.usd_rate ?? currentRate

  const { spendByConcepto, totalGastadoUsd } = useMemo(() => {
    const divisor = rate || 1
    const map: Record<string, number> = {}
    for (const g of gastos) {
      map[g.concepto] = (map[g.concepto] ?? 0) + g.cantidad / divisor
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0)
    return { spendByConcepto: map, totalGastadoUsd: total }
  }, [gastos, rate])

  const budgetedConceptos = new Set(
    presupuesto?.presupuesto_items.map((i) => i.concepto) ?? [],
  )
  const sumBudgetedUsd =
    presupuesto?.presupuesto_items.reduce((s, i) => s + i.monto_usd, 0) ?? 0
  const restoPres = (presupuesto?.total_usd ?? 0) - sumBudgetedUsd
  const restoGastado = gastos
    .filter((g) => !budgetedConceptos.has(g.concepto))
    .reduce((s, g) => s + g.cantidad / (rate || 1), 0)

  // ── Mutations ─────────────────────────────────────────────────────────────

  const saveMut = useMutation({
    mutationFn: async (data: {
      total_usd: number
      usd_rate: number
      items: { concepto: string; monto_usd: number }[]
    }) => {
      if (presupuesto) {
        return updatePresupuesto(presupuesto.id, data)
      } else {
        return createPresupuesto({ year, month: month1, ...data })
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["presupuesto", year, month1] }),
  })

  const deleteMut = useMutation({
    mutationFn: () => deletePresupuesto(presupuesto!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presupuesto", year, month1] })
      setConfirmDelete(false)
    },
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
        }}
      >
        {/* ── Topbar ──────────────────────────────────────────────────── */}
        <header
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            height: 56,
            borderBottom: "1px solid var(--line)",
          }}
        >
          {/* Month navigation */}
          <MonthPicker
            year={year}
            month={month}
            onChange={(y, m) => { setYear(y); setMonth(m) }}
          />

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            {presupuesto && (
              <>
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    background: "var(--neg-soft)",
                    color: "var(--negative)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    height: 32,
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    background: "var(--surface-alt)",
                    color: "var(--ink-2)",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Pencil size={13} /> Editar
                </button>
              </>
            )}
            {!presupuesto && !presLoading && (
              <button
                onClick={() => setShowModal(true)}
                style={{
                  height: 32,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={14} /> Crear presupuesto
              </button>
            )}
          </div>
        </header>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
          {presLoading ? (
            <div
              style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}
            >
              <Loader2
                size={24}
                style={{
                  color: "var(--ink-3)",
                  animation: "spin 1s linear infinite",
                }}
              />
            </div>
          ) : !presupuesto ? (
            /* ── Empty state ──────────────────────────────────────────── */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 80,
                gap: 16,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "var(--surface-alt)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                💰
              </div>
              <div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--ink)",
                    marginBottom: 6,
                  }}
                >
                  Sin presupuesto
                </p>
                <p style={{ fontSize: 13, color: "var(--ink-3)" }}>
                  No definiste un presupuesto para {MONTH_FULL[month]}{" "}
                  {year}
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  height: 38,
                  padding: "0 20px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={15} /> Crear presupuesto
              </button>
            </div>
          ) : (
            /* ── Budget view ──────────────────────────────────────────── */
            <div
              style={{
                maxWidth: 640,
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* KPI summary */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 1,
                  background: "var(--line)",
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                {[
                  {
                    label: "Presupuesto",
                    val: fmtUsd(presupuesto.total_usd),
                    sub: fmtArs(presupuesto.total_usd * rate),
                    neg: false,
                  },
                  {
                    label: "Gastado",
                    val: fmtUsd(totalGastadoUsd),
                    sub: fmtArs(totalGastadoUsd * rate),
                    neg: false,
                  },
                  {
                    label: "Disponible",
                    val: fmtUsd(presupuesto.total_usd - totalGastadoUsd),
                    sub: fmtArs(
                      (presupuesto.total_usd - totalGastadoUsd) * rate,
                    ),
                    neg: totalGastadoUsd > presupuesto.total_usd,
                  },
                ].map((k, i) => (
                  <div
                    key={i}
                    style={{ background: "var(--surface)", padding: "16px 20px" }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        color: "var(--ink-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                      }}
                    >
                      {k.label}
                    </p>
                    <p
                      className="num"
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: k.neg ? "var(--negative)" : "var(--ink)",
                        marginBottom: 2,
                      }}
                    >
                      {k.val}
                    </p>
                    <p
                      className="num"
                      style={{ fontSize: 11, color: "var(--ink-3)" }}
                    >
                      {k.sub}
                    </p>
                  </div>
                ))}
              </div>

              {/* Overall progress */}
              <div
                style={{
                  ...card,
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}
                  >
                    Progreso general
                  </span>
                  <span className="num" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    {presupuesto.total_usd > 0
                      ? Math.round(
                          (totalGastadoUsd / presupuesto.total_usd) * 100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <ProgressBar
                  pct={
                    presupuesto.total_usd > 0
                      ? (totalGastadoUsd / presupuesto.total_usd) * 100
                      : 0
                  }
                />
              </div>

              {/* Category breakdown */}
              <div style={card}>
                {/* Column headers */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 100px",
                    gap: 12,
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--line)",
                    background: "var(--surface-alt)",
                  }}
                >
                  {["Categoría", "Presupuesto", "Gastado"].map((h, i) => (
                    <span
                      key={h}
                      style={{
                        fontSize: 10,
                        color: "var(--ink-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        textAlign: i > 0 ? "right" : "left",
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {/* Budgeted category rows */}
                {presupuesto.presupuesto_items.map((item, idx) => {
                  const gastado = spendByConcepto[item.concepto] ?? 0
                  const pct =
                    item.monto_usd > 0
                      ? (gastado / item.monto_usd) * 100
                      : 0
                  const overBudget = gastado > item.monto_usd
                  const hex = getChipHex(item.concepto, "concepto", settings)
                  const isLast =
                    idx === presupuesto.presupuesto_items.length - 1 &&
                    restoPres <= 0
                  const diffUsd = overBudget
                    ? gastado - item.monto_usd
                    : item.monto_usd - gastado
                  return (
                    <div
                      key={item.concepto}
                      style={{
                        padding: "14px 16px",
                        borderBottom: isLast ? "none" : "1px solid var(--line)",
                      }}
                    >
                      {/* Name + amounts */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 100px 100px",
                          gap: 12,
                          alignItems: "flex-start",
                          marginBottom: 10,
                        }}
                      >
                        {/* Category name */}
                        <div style={{ display: "flex", alignItems: "center", gap: 7, paddingTop: 2 }}>
                          <span
                            style={{
                              width: 7, height: 7, borderRadius: "50%",
                              background: hex, flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                            {item.concepto}
                          </span>
                        </div>
                        {/* Presupuesto cell */}
                        <div style={{ textAlign: "right" }}>
                          <div className="num" style={{ fontSize: 13, color: "var(--ink-2)" }}>
                            {fmtUsd(item.monto_usd)}
                          </div>
                          <div className="num" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>
                            {fmtArs(item.monto_usd * rate)}
                          </div>
                        </div>
                        {/* Gastado cell */}
                        <div style={{ textAlign: "right" }}>
                          <div
                            className="num"
                            style={{
                              fontSize: 13, fontWeight: 700,
                              color: overBudget ? "var(--negative)" : "var(--ink)",
                            }}
                          >
                            {fmtUsd(gastado)}
                          </div>
                          <div className="num" style={{ fontSize: 10, color: overBudget ? "var(--negative)" : "var(--ink-3)", marginTop: 1, opacity: 0.8 }}>
                            {fmtArs(gastado * rate)}
                          </div>
                        </div>
                      </div>

                      {/* Progress + restante */}
                      <ProgressBar pct={pct} />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 6,
                        }}
                      >
                        <span style={{ fontSize: 10, color: "var(--ink-3)" }}>
                          {Math.round(pct)}% del presupuesto
                        </span>
                        <span
                          className="num"
                          style={{
                            fontSize: 10,
                            color: overBudget ? "var(--negative)" : "var(--ink-3)",
                          }}
                        >
                          {overBudget ? "+" : ""}{fmtUsd(diffUsd)} ({fmtArs(diffUsd * rate)}) {overBudget ? "pasado" : "restante"}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {/* El resto row */}
                {restoPres > 0 && (
                  <div style={{ padding: "14px 16px" }}>
                    {/* Name + amounts */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 100px 100px",
                        gap: 12,
                        alignItems: "flex-start",
                        marginBottom: 10,
                      }}
                    >
                      {/* Label */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span
                            style={{
                              width: 7, height: 7, borderRadius: "50%",
                              background: "var(--ink-3)", flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)", fontStyle: "italic" }}>
                            El resto
                          </span>
                        </div>
                        <span style={{ fontSize: 10, color: "var(--ink-3)", paddingLeft: 14 }}>
                          Categorías sin límite definido
                        </span>
                      </div>
                      {/* Presupuesto cell */}
                      <div style={{ textAlign: "right" }}>
                        <div className="num" style={{ fontSize: 13, color: "var(--ink-2)" }}>
                          {fmtUsd(restoPres)}
                        </div>
                        <div className="num" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>
                          {fmtArs(restoPres * rate)}
                        </div>
                      </div>
                      {/* Gastado cell */}
                      <div style={{ textAlign: "right" }}>
                        <div
                          className="num"
                          style={{
                            fontSize: 13, fontWeight: 700,
                            color: restoGastado > restoPres ? "var(--negative)" : "var(--ink)",
                          }}
                        >
                          {fmtUsd(restoGastado)}
                        </div>
                        <div className="num" style={{ fontSize: 10, color: restoGastado > restoPres ? "var(--negative)" : "var(--ink-3)", marginTop: 1, opacity: 0.8 }}>
                          {fmtArs(restoGastado * rate)}
                        </div>
                      </div>
                    </div>

                    {/* Progress + restante */}
                    <ProgressBar pct={restoPres > 0 ? (restoGastado / restoPres) * 100 : 0} />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 6,
                      }}
                    >
                      <span style={{ fontSize: 10, color: "var(--ink-3)" }}>
                        {Math.round(restoPres > 0 ? (restoGastado / restoPres) * 100 : 0)}% del presupuesto
                      </span>
                      <span
                        className="num"
                        style={{
                          fontSize: 10,
                          color: restoGastado > restoPres ? "var(--negative)" : "var(--ink-3)",
                        }}
                      >
                        {restoGastado > restoPres ? "+" : ""}
                        {fmtUsd(Math.abs(restoPres - restoGastado))} ({fmtArs(Math.abs(restoPres - restoGastado) * rate)}) {restoGastado > restoPres ? "pasado" : "restante"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Total row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 100px",
                    gap: 12,
                    padding: "12px 16px",
                    background: "var(--surface-alt)",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                    Total
                  </span>
                  <div style={{ textAlign: "right" }}>
                    <div className="num" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                      {fmtUsd(presupuesto.total_usd)}
                    </div>
                    <div className="num" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>
                      {fmtArs(presupuesto.total_usd * rate)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      className="num"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color:
                          totalGastadoUsd > presupuesto.total_usd
                            ? "var(--negative)"
                            : "var(--ink)",
                      }}
                    >
                      {fmtUsd(totalGastadoUsd)}
                    </div>
                    <div className="num" style={{ fontSize: 10, color: totalGastadoUsd > presupuesto.total_usd ? "var(--negative)" : "var(--ink-3)", marginTop: 1, opacity: 0.8 }}>
                      {fmtArs(totalGastadoUsd * rate)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rate footnote */}
              <p
                style={{
                  fontSize: 11,
                  color: "var(--ink-3)",
                  textAlign: "center",
                }}
              >
                Tipo de cambio:{" "}
                <span className="num">
                  ${presupuesto.usd_rate.toLocaleString("es-AR")}
                </span>{" "}
                · Los gastos en ARS se convierten con este valor
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ── Budget Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <BudgetModal
          year={year}
          month={month}
          existing={presupuesto ?? undefined}
          defaultRate={currentRate}
          conceptos={settings.conceptos}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            await saveMut.mutateAsync(data)
          }}
        />
      )}

      {/* ── Delete confirm ────────────────────────────────────────────── */}
      {confirmDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onMouseDown={(e) =>
            e.target === e.currentTarget && setConfirmDelete(false)
          }
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 16,
              padding: 24,
              width: "min(360px, 90vw)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: 6,
                }}
              >
                ¿Eliminar presupuesto?
              </p>
              <p style={{ fontSize: 13, color: "var(--ink-3)" }}>
                Se eliminará el presupuesto de {MONTH_FULL[month]} {year} y
                todas sus categorías.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface-alt)",
                  color: "var(--ink-2)",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMut.mutate()}
                disabled={deleteMut.isPending}
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--negative)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {deleteMut.isPending && (
                  <Loader2
                    size={13}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                )}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
