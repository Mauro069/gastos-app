import { useState, useEffect, useCallback } from "react";
import { X, Delete } from "lucide-react";
import type { GastoModalProps } from "@/types";
import { useUserSettings } from "@/contexts";
import { useAsyncSubmit } from "@/hooks";
import { getChipHex } from "@/utils/chipColor";
import CategoriesManagerModal from "../CategoriesManagerModal";

const today = (): string => new Date().toISOString().split("T")[0];

// ── Amount helpers ─────────────────────────────────────────────────────────

const fmtDisplay = (raw: string): string => {
  if (!raw || raw === "0") return "0";
  const [int, dec] = raw.split(".");
  const n = parseInt(int || "0", 10);
  const intFmt = new Intl.NumberFormat("es-AR").format(n);
  return dec !== undefined ? `${intFmt},${dec}` : intFmt;
};

const toNumeric = (raw: string): number => {
  const normalized = raw.replace(",", ".");
  return parseFloat(normalized) || 0;
};

// ── Numpad key press logic ─────────────────────────────────────────────────

const pressKey = (prev: string, key: string): string => {
  if (key === "backspace") return prev.length <= 1 ? "0" : prev.slice(0, -1);
  if (key === ".") {
    if (prev.includes(".")) return prev;
    return prev + ".";
  }
  // Multi-digit shortcuts
  if (prev === "0") {
    if (key === "0" || key === "00" || key === "000") return "0";
    return key;
  }
  // Limit decimal places
  const parts = prev.split(".");
  if (parts.length > 1 && parts[1].length >= 2) return prev;
  // Limit total length
  if (prev.replace(".", "").length >= 12) return prev;
  return prev + key;
};

// ── Numpad layout ──────────────────────────────────────────────────────────

const NUMPAD: { label: string | React.ReactNode; key: string; span?: number }[][] = [
  [
    { label: "1", key: "1" },
    { label: "2", key: "2" },
    { label: "3", key: "3" },
    { label: "000", key: "000" },
  ],
  [
    { label: "4", key: "4" },
    { label: "5", key: "5" },
    { label: "6", key: "6" },
    { label: "00", key: "00" },
  ],
  [
    { label: "7", key: "7" },
    { label: "8", key: "8" },
    { label: "9", key: "9" },
    { label: ".", key: "." },
  ],
];

// ── Main component ─────────────────────────────────────────────────────────

export default function GastoModal({
  gasto,
  defaultDate,
  onClose,
  onSave,
}: GastoModalProps) {
  const { settings, updateFormas, updateConceptos } = useUserSettings();
  const { loading, error, setError, execute } = useAsyncSubmit();

  const [amountStr, setAmountStr] = useState("0");
  const [forma, setForma] = useState<string>("Lemon");
  const [concepto, setConcepto] = useState<string>("Salidas");
  const [nota, setNota] = useState("");
  const [fecha, setFecha] = useState(today());
  const [catManager, setCatManager] = useState<"formas" | "conceptos" | null>(null);

  // Populate when editing
  useEffect(() => {
    if (gasto) {
      setAmountStr(String(gasto.cantidad).replace(".", "."));
      setForma(gasto.forma);
      setConcepto(gasto.concepto);
      setNota(gasto.nota ?? "");
      setFecha(gasto.fecha);
    } else {
      setAmountStr("0");
      setForma("Lemon");
      setConcepto("Salidas");
      setNota("");
      setFecha(defaultDate || today());
    }
  }, [gasto, defaultDate]);

  const press = useCallback((key: string) => {
    setAmountStr((prev) => pressKey(prev, key));
  }, []);

  // Keyboard capture
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      // Allow typing in note/date fields
      if (tag === "TEXTAREA") return;
      if (tag === "INPUT") {
        const input = e.target as HTMLInputElement;
        if (input.type !== "date") return; // allow date, block others for numpad
      }
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Enter" && !e.shiftKey) { handleSubmit(); return; }
      if (e.key === "Backspace") { e.preventDefault(); press("backspace"); return; }
      if (e.key === ".") { e.preventDefault(); press("."); return; }
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [amountStr, forma, concepto, nota, fecha]);

  const numericAmount = toNumeric(amountStr);
  const displayAmount = fmtDisplay(amountStr);

  const handleSubmit = async () => {
    if (!fecha || numericAmount <= 0 || !forma || !concepto) {
      setError("Completá todos los campos obligatorios");
      return;
    }
    await execute(async () => {
      await onSave({ fecha, cantidad: numericAmount, forma: forma as never, concepto: concepto as never, nota: nota.trim() || undefined });
      onClose();
    });
  };

  const _handleAddForma = async (newForma: string) => {
    await updateFormas([...settings.formas, newForma]);
    setForma(newForma);
  };
  const _handleAddConcepto = async (newConcepto: string) => {
    await updateConceptos([...settings.conceptos, newConcepto]);
    setConcepto(newConcepto);
  };
  void _handleAddForma; void _handleAddConcepto;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", maxHeight: "95dvh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--line)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {gasto ? "Editar gasto" : "Nuevo gasto"}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 transition-colors"
              style={{ background: "var(--surface-alt)", border: "none", cursor: "pointer", color: "var(--ink-3)" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1">
            {/* Amount display */}
            <div
              className="flex flex-col items-center justify-center py-6"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              <div className="flex items-baseline gap-2">
                <span className="num text-3xl" style={{ color: "var(--ink-3)", fontWeight: 300 }}>$</span>
                <span
                  className="num font-semibold"
                  style={{
                    fontSize: numericAmount >= 1_000_000 ? 36 : numericAmount >= 100_000 ? 42 : 52,
                    letterSpacing: "-0.04em",
                    color: numericAmount > 0 ? "var(--ink)" : "var(--ink-3)",
                    lineHeight: 1,
                  }}
                >
                  {displayAmount}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-widest mt-1" style={{ color: "var(--ink-3)" }}>ARS</span>
            </div>

            {/* Numpad */}
            <div className="px-4 pt-3 pb-2">
              <div className="grid grid-cols-4 gap-2">
                {NUMPAD.map((row, ri) =>
                  row.map((btn, bi) => (
                    <button
                      key={`${ri}-${bi}`}
                      type="button"
                      onClick={() => press(btn.key)}
                      className="num rounded-xl py-4 text-base font-medium transition-all active:scale-95"
                      style={{
                        background: "var(--surface-alt)",
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                        cursor: "pointer",
                      }}
                    >
                      {btn.label}
                    </button>
                  ))
                )}
                {/* Bottom row: 0, [empty], backspace */}
                <button
                  type="button"
                  onClick={() => press("0")}
                  className="num rounded-xl py-4 text-base font-medium transition-all active:scale-95"
                  style={{ background: "var(--surface-alt)", border: "1px solid var(--line)", color: "var(--ink)", cursor: "pointer" }}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => press("backspace")}
                  className="col-span-3 num rounded-xl py-4 text-base font-medium transition-all active:scale-95 flex items-center justify-center"
                  style={{ background: "var(--surface-alt)", border: "1px solid var(--line)", color: "var(--ink-3)", cursor: "pointer" }}
                >
                  <Delete size={18} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="px-4 pb-4 space-y-5" style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              {/* Nota + Fecha */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Nota (opcional)"
                  maxLength={200}
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm"
                  style={{
                    background: "var(--surface-alt)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                    outline: "none",
                  }}
                />
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="rounded-xl px-3 py-2.5 text-sm"
                  style={{
                    background: "var(--surface-alt)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                    outline: "none",
                    colorScheme: "dark",
                  }}
                />
              </div>

              {/* FORMA DE PAGO */}
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2.5" style={{ color: "var(--ink-3)" }}>Forma de pago</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {settings.formas.map((f) => {
                    const hex = getChipHex(f, "forma", settings);
                    const active = forma === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setForma(f)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                        style={{
                          background: active ? `${hex}18` : "var(--surface-alt)",
                          color: active ? hex : "var(--ink-2)",
                          border: `1px solid ${active ? hex : "var(--line)"}`,
                          cursor: "pointer",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: active ? hex : "var(--ink-3)" }}
                        />
                        <span className="truncate">{f}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CATEGORÍA */}
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2.5" style={{ color: "var(--ink-3)" }}>Categoría</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {settings.conceptos.map((c) => {
                    const hex = getChipHex(c, "concepto", settings);
                    const active = concepto === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setConcepto(c)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                        style={{
                          background: active ? `${hex}18` : "var(--surface-alt)",
                          color: active ? hex : "var(--ink-2)",
                          border: `1px solid ${active ? hex : "var(--line)"}`,
                          cursor: "pointer",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: active ? hex : "var(--ink-3)" }}
                        />
                        <span className="truncate">{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="text-xs" style={{ color: "var(--negative)" }}>{error}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--line)" }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ background: "var(--surface-alt)", color: "var(--ink-2)", border: "1px solid var(--line)", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || numericAmount <= 0}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-40"
              style={{ background: "var(--accent)", color: "var(--accent-ink)", border: "none", cursor: numericAmount > 0 ? "pointer" : "default" }}
            >
              {loading ? "Guardando..." : gasto ? "Actualizar gasto" : "Guardar gasto"}
            </button>
          </div>
        </div>
      </div>

      {catManager && (
        <CategoriesManagerModal
          initialSection={catManager}
          onClose={() => setCatManager(null)}
        />
      )}
    </>
  );
}

