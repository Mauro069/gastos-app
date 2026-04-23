import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  PiggyBank,
  TrendingUp,
  Wallet,
  ArrowRightLeft,
  Settings,
  Save,
  X,
  Loader2,
} from "lucide-react";
import {
  fetchConversionesByMonth,
  fetchPresupuesto,
  fetchGastosByYear,
  createConversion,
  updateConversion,
  deleteConversion,
  upsertPresupuesto,
} from "@/api";
import { useAuth } from "@/contexts";
import { AppShell } from "@/components";
import { useNumericInput, useAsyncSubmit } from "@/hooks";
import { MONTH_FULL, monthKey, CONCEPTOS } from "@/constants";
import type {
  ConversionUsdc,
  PresupuestoMensual,
  CategoriaBudget,
} from "@/types";

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtUsd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const fmtArs = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });

const today = () => new Date().toISOString().split("T")[0];

// ── Shared input style ────────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  background: 'var(--surface-alt)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 12px',
  color: 'var(--ink)',
  fontSize: 14,
  outline: 'none',
  width: '100%',
};

// ── Conversion Modal ──────────────────────────────────────────────────────────

interface ConversionModalProps {
  conversion: ConversionUsdc | null;
  defaultDate?: string;
  onClose: () => void;
  onSave: (
    data: Omit<ConversionUsdc, "id" | "user_id" | "created_at">,
  ) => Promise<void>;
}

function ConversionModal({
  conversion,
  defaultDate,
  onClose,
  onSave,
}: ConversionModalProps) {
  const [fecha, setFecha] = useState(defaultDate || today());
  const [nota, setNota] = useState("");
  const { loading, error, setError, execute } = useAsyncSubmit();

  const usdc = useNumericInput();
  const tc = useNumericInput();

  useEffect(() => {
    if (conversion) {
      setFecha(conversion.fecha);
      setNota(conversion.nota || "");
      usdc.reset(conversion.monto_usdc);
      tc.reset(conversion.tipo_cambio);
    } else {
      setFecha(defaultDate || today());
      setNota("");
      usdc.reset("");
      tc.reset("");
    }
  }, [conversion, defaultDate]);

  const montoArs =
    usdc.numericValue !== "" &&
    tc.numericValue !== "" &&
    usdc.numericValue > 0 &&
    tc.numericValue > 0
      ? usdc.numericValue * tc.numericValue
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      usdc.numericValue === "" ||
      isNaN(usdc.numericValue) ||
      usdc.numericValue <= 0
    ) {
      setError("Ingresá un monto USDC válido");
      return;
    }
    if (
      tc.numericValue === "" ||
      isNaN(tc.numericValue) ||
      tc.numericValue <= 0
    ) {
      setError("Ingresá un tipo de cambio válido");
      return;
    }
    await execute(async () => {
      const usdcVal = usdc.numericValue as number;
      const tcVal = tc.numericValue as number;
      await onSave({
        fecha,
        monto_usdc: usdcVal,
        tipo_cambio: tcVal,
        monto_ars: usdcVal * tcVal,
        nota: nota.trim(),
      });
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md shadow-2xl rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              {conversion ? "Editar conversión" : "Nueva conversión USDC → ARS"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="transition-colors rounded-lg p-1"
            style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: 'var(--ink-2)' }}>
              Fecha *
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={inputBase}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: 'var(--ink-2)' }}>
                Monto USDC *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none" style={{ color: 'var(--ink-3)' }}>
                  $
                </span>
                <input
                  ref={usdc.inputRef}
                  type="text"
                  inputMode="decimal"
                  value={usdc.display}
                  onChange={usdc.onChange}
                  style={{ ...inputBase, paddingLeft: 28 }}
                  placeholder="0"
                  autoFocus={!conversion}
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: 'var(--ink-2)' }}>
                Tipo de cambio *
              </label>
              <input
                ref={tc.inputRef}
                type="text"
                inputMode="decimal"
                value={tc.display}
                onChange={tc.onChange}
                style={inputBase}
                placeholder="1.200"
                autoComplete="off"
              />
            </div>
          </div>

          {montoArs !== null && (
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: 'var(--pos-soft)', border: '1px solid var(--positive)' }}
            >
              <span className="text-xs font-medium" style={{ color: 'var(--positive)' }}>
                Recibís en ARS
              </span>
              <span className="font-bold text-lg num" style={{ color: 'var(--ink)' }}>
                {fmtArs(montoArs)}
              </span>
            </div>
          )}

          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: 'var(--ink-2)' }}>
              Nota (opcional)
            </label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              style={inputBase}
              placeholder="Ej: Lemon, Bitso, P2P..."
              maxLength={200}
              autoComplete="off"
            />
          </div>

          {error && (
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--neg-soft)', border: '1px solid var(--negative)', color: 'var(--negative)' }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl py-2.5 font-medium text-sm transition-colors"
              style={{ background: 'var(--surface-alt)', color: 'var(--ink-2)', border: '1px solid var(--line)', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl py-2.5 font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', cursor: 'pointer' }}
            >
              <Save className="w-4 h-4" />
              {loading ? "Guardando..." : conversion ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Budget Setup Modal ────────────────────────────────────────────────────────

interface BudgetModalProps {
  presupuesto: PresupuestoMensual | null;
  monthLabel: string;
  onClose: () => void;
  onSave: (data: {
    ingreso_usd: number;
    ahorro_usd: number;
    inversion_usd: number;
    categorias_budget: CategoriaBudget[];
    notas: string;
  }) => Promise<void>;
}

function BudgetModal({
  presupuesto,
  monthLabel,
  onClose,
  onSave,
}: BudgetModalProps) {
  const ingreso = useNumericInput();
  const ahorro = useNumericInput();
  const inversion = useNumericInput();
  const [notas, setNotas] = useState("");
  const [categorias, setCategorias] = useState<CategoriaBudget[]>([]);
  const [newConcepto, setNewConcepto] = useState<string>(CONCEPTOS[0]);
  const [newMonto, setNewMonto] = useState("");
  const { loading, error, setError, execute } = useAsyncSubmit();

  useEffect(() => {
    if (presupuesto) {
      ingreso.reset(presupuesto.ingreso_usd);
      ahorro.reset(presupuesto.ahorro_usd);
      inversion.reset(presupuesto.inversion_usd);
      setNotas(presupuesto.notas || "");
      setCategorias([...presupuesto.categorias_budget]);
    } else {
      ingreso.reset("");
      ahorro.reset("");
      inversion.reset("");
      setNotas("");
      setCategorias([]);
    }
  }, [presupuesto]);

  const ingresoVal =
    ingreso.numericValue !== "" && !isNaN(ingreso.numericValue)
      ? ingreso.numericValue
      : 0;
  const ahorroVal =
    ahorro.numericValue !== "" && !isNaN(ahorro.numericValue)
      ? ahorro.numericValue
      : 0;
  const inversionVal =
    inversion.numericValue !== "" && !isNaN(inversion.numericValue)
      ? inversion.numericValue
      : 0;
  const disponibleUsd = Math.max(0, ingresoVal - ahorroVal - inversionVal);

  const addCategoria = () => {
    const monto = parseFloat(newMonto.replace(/\./g, "").replace(",", "."));
    if (isNaN(monto) || monto <= 0) return;
    const exists = categorias.findIndex((c) => c.concepto === newConcepto);
    if (exists >= 0) {
      setCategorias((prev) =>
        prev.map((c, i) => (i === exists ? { ...c, monto_ars: monto } : c)),
      );
    } else {
      setCategorias((prev) => [
        ...prev,
        { concepto: newConcepto, monto_ars: monto },
      ]);
    }
    setNewMonto("");
  };

  const removeCategoria = (concepto: string) => {
    setCategorias((prev) => prev.filter((c) => c.concepto !== concepto));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      ingreso.numericValue === "" ||
      isNaN(ingreso.numericValue) ||
      ingreso.numericValue <= 0
    ) {
      setError("Ingresá tu ingreso mensual en USD");
      return;
    }
    await execute(async () => {
      await onSave({
        ingreso_usd: ingresoVal,
        ahorro_usd: ahorroVal,
        inversion_usd: inversionVal,
        categorias_budget: categorias,
        notas: notas.trim(),
      });
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg shadow-2xl my-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              Presupuesto — {monthLabel}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="transition-colors rounded-lg p-1"
            style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Distribución USD */}
          <div>
            <p className="text-xs uppercase tracking-wider mb-3 font-medium" style={{ color: 'var(--ink-2)' }}>
              Distribución mensual en USD
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--ink-3)' }}>
                  Ingreso total *
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs select-none" style={{ color: 'var(--ink-3)' }}>
                    $
                  </span>
                  <input
                    ref={ingreso.inputRef}
                    type="text"
                    inputMode="decimal"
                    value={ingreso.display}
                    onChange={ingreso.onChange}
                    style={{ ...inputBase, paddingLeft: 24 }}
                    placeholder="1500"
                    autoFocus
                    autoComplete="off"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs block mb-1 flex items-center gap-1" style={{ color: 'var(--ink-3)' }}>
                  <PiggyBank className="w-3 h-3" style={{ color: 'var(--warn)' }} />
                  Ahorro USD
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs select-none" style={{ color: 'var(--ink-3)' }}>
                    $
                  </span>
                  <input
                    ref={ahorro.inputRef}
                    type="text"
                    inputMode="decimal"
                    value={ahorro.display}
                    onChange={ahorro.onChange}
                    style={{ ...inputBase, paddingLeft: 24, color: 'var(--warn)', borderColor: 'var(--warn)' }}
                    placeholder="300"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs block mb-1 flex items-center gap-1" style={{ color: 'var(--ink-3)' }}>
                  <TrendingUp className="w-3 h-3" style={{ color: 'var(--ink-2)' }} />
                  Inversión USD
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs select-none" style={{ color: 'var(--ink-3)' }}>
                    $
                  </span>
                  <input
                    ref={inversion.inputRef}
                    type="text"
                    inputMode="decimal"
                    value={inversion.display}
                    onChange={inversion.onChange}
                    style={{ ...inputBase, paddingLeft: 24 }}
                    placeholder="200"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            {/* Resumen visual */}
            {ingresoVal > 0 && (
              <div
                className="mt-3 rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)' }}
              >
                <span className="text-xs" style={{ color: 'var(--ink-2)' }}>
                  Disponible para gastos
                </span>
                <span className="font-bold num" style={{ color: 'var(--accent)' }}>
                  {fmtUsd(disponibleUsd)}
                </span>
              </div>
            )}
          </div>

          {/* Categorías de gasto */}
          <div>
            <p className="text-xs uppercase tracking-wider mb-3 font-medium" style={{ color: 'var(--ink-2)' }}>
              Límites por categoría (en ARS)
            </p>

            {/* Lista de categorías ya agregadas */}
            {categorias.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {categorias.map((cat) => (
                  <div
                    key={cat.concepto}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)' }}
                  >
                    <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{cat.concepto}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium num" style={{ color: 'var(--ink)' }}>
                        {fmtArs(cat.monto_ars)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCategoria(cat.concepto)}
                        className="transition-colors"
                        style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--negative)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar nueva categoría */}
            <div className="flex gap-2">
              <select
                value={newConcepto}
                onChange={(e) => setNewConcepto(e.target.value)}
                style={{ ...inputBase, flex: 1 }}
              >
                {CONCEPTOS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="numeric"
                value={newMonto}
                onChange={(e) => setNewMonto(e.target.value)}
                style={{ ...inputBase, width: 128 }}
                placeholder="Monto $"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategoria())}
              />
              <button
                type="button"
                onClick={addCategoria}
                className="rounded-lg px-3 py-2 transition-colors"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 7, cursor: 'pointer' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: 'var(--ink-2)' }}>
              Notas (opcional)
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              style={inputBase}
              placeholder="Ej: Mes con bono, viaje planeado..."
              maxLength={300}
              autoComplete="off"
            />
          </div>

          {error && (
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--neg-soft)', border: '1px solid var(--negative)', color: 'var(--negative)' }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl py-2.5 font-medium text-sm transition-colors"
              style={{ background: 'var(--surface-alt)', color: 'var(--ink-2)', border: '1px solid var(--line)', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl py-2.5 font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', cursor: 'pointer' }}
            >
              <Save className="w-4 h-4" />
              {loading ? "Guardando..." : "Guardar presupuesto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Progress bar helper ───────────────────────────────────────────────────────

function ProgressBar({
  value,
  max,
}: {
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = max > 0 && value > max;
  const barColor = over
    ? 'var(--negative)'
    : pct > 85
    ? 'var(--warn)'
    : 'var(--accent)';

  return (
    <div className="w-full rounded-full h-1.5 mt-1.5" style={{ background: 'var(--surface-alt)' }}>
      <div
        className="h-1.5 rounded-full transition-all"
        style={{ width: `${pct}%`, background: barColor }}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PresupuestoPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const mk = monthKey(year, month);
  const monthLabel = `${MONTH_FULL[month]} ${year}`;

  const [showConvModal, setShowConvModal] = useState(false);
  const [editConv, setEditConv] = useState<ConversionUsdc | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  // Navegación entre meses
  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Queries
  const { data: conversiones = [], isLoading: convLoading } = useQuery({
    queryKey: ["conversiones", user?.id, mk],
    queryFn: () => fetchConversionesByMonth(mk),
    enabled: !!user?.id,
  });

  const { data: presupuesto, isLoading: budgetLoading } = useQuery({
    queryKey: ["presupuesto", user?.id, mk],
    queryFn: () => fetchPresupuesto(mk),
    enabled: !!user?.id,
  });

  const { data: gastos = [], isLoading: gastosLoading } = useQuery({
    queryKey: ["gastos", user?.id, year],
    queryFn: () => fetchGastosByYear(year),
    enabled: !!user?.id,
  });

  // Gastos del mes actual
  const gastosMes = useMemo(() => {
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return gastos.filter((g) => g.fecha >= from && g.fecha <= to);
  }, [gastos, year, month]);

  // Totales conversiones
  const totalUsdcConvertido = conversiones.reduce(
    (s, c) => s + c.monto_usdc,
    0,
  );
  const totalArsConvertido = conversiones.reduce((s, c) => s + c.monto_ars, 0);
  const totalArsGastado = gastosMes.reduce((s, g) => s + g.cantidad, 0);

  // USD disponible (ingreso - ahorro - inversión)
  const disponibleUsd = presupuesto
    ? Math.max(
        0,
        presupuesto.ingreso_usd -
          presupuesto.ahorro_usd -
          presupuesto.inversion_usd,
      )
    : 0;

  // USDC pendiente de convertir
  const usdcPendiente = presupuesto
    ? Math.max(0, disponibleUsd - totalUsdcConvertido)
    : null;

  // Gastos por categoría del mes
  const gastosPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of gastosMes) {
      map[g.concepto] = (map[g.concepto] || 0) + g.cantidad;
    }
    return map;
  }, [gastosMes]);

  // Mutations
  const convMutation = useMutation({
    mutationFn: (data: Omit<ConversionUsdc, "id" | "user_id" | "created_at">) =>
      createConversion(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["conversiones", user?.id, mk] }),
  });

  const convUpdateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<ConversionUsdc, "id" | "user_id" | "created_at">>;
    }) => updateConversion(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["conversiones", user?.id, mk] }),
  });

  const convDeleteMutation = useMutation({
    mutationFn: (id: string) => deleteConversion(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["conversiones", user?.id, mk] }),
  });

  const budgetMutation = useMutation({
    mutationFn: (data: Parameters<typeof upsertPresupuesto>[1]) =>
      upsertPresupuesto(mk, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["presupuesto", user?.id, mk] }),
  });

  const isLoading = convLoading || budgetLoading || gastosLoading;

  return (
    <AppShell user={user}>
      <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
        {/* Top bar */}
        <header
          className="px-4 sm:px-6 py-3 sticky top-0 z-20"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}
        >
          <div className="max-w-screen-xl mx-auto flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div
                className="rounded-xl p-1.5"
                style={{ background: 'var(--accent)' }}
              >
                <Wallet className="w-4 h-4" style={{ color: 'var(--accent-ink)' }} />
              </div>
              <span className="text-base font-bold" style={{ color: 'var(--ink)' }}>Presupuesto</span>
            </div>

            {/* Month nav */}
            <div
              className="flex items-center gap-1 rounded-xl px-1 py-1"
              style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)' }}
            >
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-2)')}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium px-2 min-w-[120px] text-center" style={{ color: 'var(--ink)' }}>
                {monthLabel}
              </span>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-2)')}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Config presupuesto */}
            <button
              onClick={() => setShowBudgetModal(true)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', cursor: 'pointer' }}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">
                {presupuesto ? "Editar" : "Configurar"}
              </span>
            </button>
          </div>
        </header>

        <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--ink-3)' }} />
            </div>
          ) : (
            <>
              {/* ── Sin presupuesto configurado ── */}
              {!presupuesto && (
                <div
                  className="rounded-2xl p-6 text-center"
                  style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
                >
                  <Wallet className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--accent)' }} />
                  <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--ink)' }}>
                    Configurá tu presupuesto de {monthLabel}
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--ink-2)' }}>
                    Definí cuánto ganás en USD, cuánto ahorrar, cuánto invertir y
                    los límites de gasto por categoría.
                  </p>
                  <button
                    onClick={() => setShowBudgetModal(true)}
                    className="rounded-xl px-5 py-2.5 font-medium text-sm transition-colors inline-flex items-center gap-2"
                    style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', cursor: 'pointer' }}
                  >
                    <Settings className="w-4 h-4" />
                    Configurar presupuesto
                  </button>
                </div>
              )}

              {/* ── Tarjetas USD ── */}
              {presupuesto && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Ingreso */}
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-2)' }}>
                        Ingreso
                      </span>
                    </div>
                    <p className="text-2xl font-bold num" style={{ color: 'var(--ink)' }}>
                      {fmtUsd(presupuesto.ingreso_usd)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>total del mes</p>
                  </div>

                  {/* Ahorro */}
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <PiggyBank className="w-4 h-4" style={{ color: 'var(--warn)' }} />
                      <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-2)' }}>
                        Ahorro
                      </span>
                    </div>
                    <p className="text-2xl font-bold num" style={{ color: 'var(--warn)' }}>
                      {fmtUsd(presupuesto.ahorro_usd)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>se queda en USD</p>
                  </div>

                  {/* Inversión */}
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4" style={{ color: 'var(--ink-2)' }} />
                      <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-2)' }}>
                        Inversión
                      </span>
                    </div>
                    <p className="text-2xl font-bold num" style={{ color: 'var(--ink)' }}>
                      {fmtUsd(presupuesto.inversion_usd)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>reservado</p>
                  </div>

                  {/* Disponible */}
                  <div style={{ background: 'var(--pos-soft)', border: '1px solid var(--positive)', borderRadius: 10, padding: 16 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowRightLeft className="w-4 h-4" style={{ color: 'var(--positive)' }} />
                      <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-2)' }}>
                        Disponible
                      </span>
                    </div>
                    <p className="text-2xl font-bold num" style={{ color: 'var(--positive)' }}>
                      {fmtUsd(disponibleUsd)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                      para convertir a ARS
                    </p>
                  </div>
                </div>
              )}

              {/* ── Estado de conversiones ── */}
              {presupuesto && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--ink-2)' }}>
                      <ArrowRightLeft className="w-4 h-4" style={{ color: 'var(--positive)' }} />
                      Estado de conversiones USDC
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: 'var(--ink-3)' }}>Convertido</p>
                      <p className="text-lg font-bold num" style={{ color: 'var(--positive)' }}>
                        {fmtUsd(totalUsdcConvertido)}
                      </p>
                      <p className="text-xs num" style={{ color: 'var(--ink-3)' }}>
                        {fmtArs(totalArsConvertido)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: 'var(--ink-3)' }}>Por convertir</p>
                      <p
                        className="text-lg font-bold num"
                        style={{ color: (usdcPendiente ?? 0) > 0 ? 'var(--warn)' : 'var(--ink-3)' }}
                      >
                        {fmtUsd(usdcPendiente ?? 0)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>restante del mes</p>
                    </div>
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: 'var(--ink-3)' }}>Gastado ARS</p>
                      <p className="text-lg font-bold num" style={{ color: 'var(--ink)' }}>
                        {fmtArs(totalArsGastado)}
                      </p>
                      {totalArsConvertido > 0 && (
                        <p className="text-xs num" style={{ color: 'var(--ink-3)' }}>
                          de {fmtArs(totalArsConvertido)}
                        </p>
                      )}
                    </div>
                  </div>
                  {totalArsConvertido > 0 && (
                    <ProgressBar
                      value={totalArsGastado}
                      max={totalArsConvertido}
                    />
                  )}
                </div>
              )}

              {/* ── Conversiones del mes ── */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
                  <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                    <ArrowRightLeft className="w-4 h-4" style={{ color: 'var(--positive)' }} />
                    Conversiones del mes
                    {conversiones.length > 0 && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full num"
                        style={{ background: 'var(--pos-soft)', color: 'var(--positive)' }}
                      >
                        {conversiones.length}
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={() => {
                      setEditConv(null);
                      setShowConvModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors"
                    style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', cursor: 'pointer' }}
                  >
                    <Plus className="w-4 h-4" />
                    Nueva
                  </button>
                </div>

                {conversiones.length === 0 ? (
                  <div className="text-center py-10" style={{ color: 'var(--ink-3)' }}>
                    <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">
                      No hay conversiones registradas este mes
                    </p>
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid var(--line-soft)' }}>
                    {conversiones.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center px-5 py-3 transition-colors group row-hover"
                        style={{ borderBottom: '1px solid var(--line-soft)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="text-xs num w-10" style={{ color: 'var(--ink-2)' }}>
                              {fmtDate(c.fecha)}
                            </span>
                            <span className="font-medium num" style={{ color: 'var(--ink)' }}>
                              {fmtUsd(c.monto_usdc)} USDC
                            </span>
                            <span className="text-xs" style={{ color: 'var(--ink-3)' }}>→</span>
                            <span className="font-medium num" style={{ color: 'var(--positive)' }}>
                              {fmtArs(c.monto_ars)}
                            </span>
                            <span className="text-xs num" style={{ color: 'var(--ink-3)' }}>
                              @ ${c.tipo_cambio.toLocaleString("es-AR")}
                            </span>
                          </div>
                          {c.nota && (
                            <p className="text-xs mt-0.5 pl-[52px]" style={{ color: 'var(--ink-3)' }}>
                              {c.nota}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditConv(c);
                              setShowConvModal(true);
                            }}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => convDeleteMutation.mutate(c.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--negative)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Gasto vs Presupuesto por categoría ── */}
              {presupuesto && presupuesto.categorias_budget.length > 0 && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                  <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
                    <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                      <Wallet className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      Gasto vs Presupuesto por categoría
                    </h3>
                  </div>
                  <div>
                    {presupuesto.categorias_budget
                      .slice()
                      .sort((a, b) => b.monto_ars - a.monto_ars)
                      .map((cat) => {
                        const gastado = gastosPorCategoria[cat.concepto] || 0;
                        const pct =
                          cat.monto_ars > 0
                            ? (gastado / cat.monto_ars) * 100
                            : 0;
                        const over = gastado > cat.monto_ars;
                        return (
                          <div
                            key={cat.concepto}
                            className="px-5 py-3"
                            style={{ borderBottom: '1px solid var(--line-soft)' }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
                                {cat.concepto}
                              </span>
                              <div className="flex items-center gap-2">
                                {over && (
                                  <span className="text-xs font-medium num" style={{ color: 'var(--negative)' }}>
                                    +{fmtArs(gastado - cat.monto_ars)}
                                  </span>
                                )}
                                <span
                                  className="text-sm font-medium num"
                                  style={{
                                    color: over
                                      ? 'var(--negative)'
                                      : pct > 85
                                      ? 'var(--warn)'
                                      : 'var(--ink)',
                                  }}
                                >
                                  {fmtArs(gastado)}
                                </span>
                                <span className="text-xs num" style={{ color: 'var(--ink-3)' }}>
                                  / {fmtArs(cat.monto_ars)}
                                </span>
                              </div>
                            </div>
                            <ProgressBar
                              value={gastado}
                              max={cat.monto_ars}
                            />
                          </div>
                        );
                      })}
                  </div>

                  {/* Total sin presupuestar */}
                  {(() => {
                    const presupuestadoCategorias = presupuesto.categorias_budget.map(
                      (c) => c.concepto,
                    );
                    const sinPresupuesto = Object.entries(gastosPorCategoria)
                      .filter(([cat]) => !presupuestadoCategorias.includes(cat))
                      .reduce((s, [, v]) => s + v, 0);
                    if (sinPresupuesto === 0) return null;
                    return (
                      <div className="px-5 py-3" style={{ borderTop: '1px solid var(--line)', background: 'var(--surface-alt)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm italic" style={{ color: 'var(--ink-3)' }}>
                            Sin presupuesto asignado
                          </span>
                          <span className="text-sm num" style={{ color: 'var(--ink-2)' }}>
                            {fmtArs(sinPresupuesto)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </main>

        {/* Modals */}
        {showConvModal && (
          <ConversionModal
            conversion={editConv}
            defaultDate={today()}
            onClose={() => {
              setShowConvModal(false);
              setEditConv(null);
            }}
            onSave={async (data) => {
              if (editConv) {
                await convUpdateMutation.mutateAsync({ id: editConv.id, data });
              } else {
                await convMutation.mutateAsync(data);
              }
            }}
          />
        )}

        {showBudgetModal && (
          <BudgetModal
            presupuesto={presupuesto ?? null}
            monthLabel={monthLabel}
            onClose={() => setShowBudgetModal(false)}
            onSave={async (data) => {
              await budgetMutation.mutateAsync(data);
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
