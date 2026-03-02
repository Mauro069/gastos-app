import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  fetchIngresosByYear,
  fetchGastosByYear,
  createIngreso,
  updateIngreso,
  deleteIngreso,
  fetchUsdRates,
} from "@/api";
import IngresoModal from "@/components/IngresoModal";
import { useAuth } from "@/contexts";
import type { Ingreso, UsdRates } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];
const MONTH_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fmtUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtArs = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });

function getRate(usdRates: UsdRates, monthKey: string): number | undefined {
  if (usdRates[monthKey]) return usdRates[monthKey];
  const prior = [...Object.keys(usdRates).sort()].reverse().find((k) => k <= monthKey);
  return prior ? usdRates[prior] : undefined;
}

// ── Sub-components ────────────────────────────────────────────────────────────

type Currency = "USD" | "ARS";

function CurrencyToggle({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <div className="flex items-center bg-gray-800 rounded-lg p-0.5 gap-0.5">
      {(["USD", "ARS"] as Currency[]).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            value === c
              ? "bg-gray-600 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function ChartTooltip({
  active, payload, label, currency,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currency: Currency;
}) {
  if (!active || !payload?.length) return null;
  const fmt = currency === "USD" ? fmtUsd : fmtArs;
  const ing = payload.find((p) => p.name === "Ingresos");
  const gas = payload.find((p) => p.name === "Gastos");
  const restante = (ing?.value ?? 0) - (gas?.value ?? 0);
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 shadow-xl text-xs space-y-1">
      <p className="font-semibold text-white mb-1.5">{label}</p>
      {ing && <p style={{ color: ing.color }}>Ingresos: <span className="font-semibold">{fmt(ing.value)}</span></p>}
      {gas && <p style={{ color: gas.color }}>Gastos: <span className="font-semibold">{fmt(gas.value)}</span></p>}
      {ing && gas && (
        <p className={`font-bold border-t border-gray-700 pt-1 mt-1 ${restante >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          Restante: {restante >= 0 ? "+" : ""}{fmt(restante)}
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color = "blue", icon }: {
  label: string; value: string; sub?: string;
  color?: "blue" | "green" | "red" | "purple" | "emerald";
  icon?: React.ReactNode;
}) {
  const styles = {
    blue:    { ring: "ring-blue-800/40",    text: "text-blue-300" },
    green:   { ring: "ring-green-800/40",   text: "text-green-300" },
    red:     { ring: "ring-red-800/40",     text: "text-red-400" },
    purple:  { ring: "ring-purple-800/40",  text: "text-purple-300" },
    emerald: { ring: "ring-emerald-800/40", text: "text-emerald-300" },
  }[color];
  return (
    <div className={`bg-gray-900 ring-1 ${styles.ring} rounded-2xl p-4`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className={`${styles.text} opacity-70`}>{icon}</span>}
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${styles.text}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1 tabular-nums">{sub}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IngresosPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const now = new Date();

  const selectedYear = useMemo(() => {
    const y = parseInt(searchParams.get("year") ?? "");
    return isNaN(y) ? now.getFullYear() : y;
  }, [searchParams]);

  const setYear = (y: number) =>
    setSearchParams({ year: String(y) }, { replace: true });

  // ── Currency toggle ───────────────────────────────────────────────────────
  const [currency, setCurrency] = useState<Currency>("USD");

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIngreso, setEditingIngreso] = useState<Ingreso | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openNew = () => { setEditingIngreso(null); setModalOpen(true); };
  const openEdit = (i: Ingreso) => { setEditingIngreso(i); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingIngreso(null); };

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: ingresos = [], isLoading: ingresosLoading } = useQuery({
    queryKey: ["ingresos", user?.id, selectedYear],
    queryFn: () => fetchIngresosByYear(selectedYear),
    enabled: !!user,
  });

  const { data: gastos = [], isLoading: gastosLoading } = useQuery({
    queryKey: ["gastos", user?.id, selectedYear],
    queryFn: () => fetchGastosByYear(selectedYear),
    enabled: !!user,
  });

  const { data: usdRates = {} as UsdRates } = useQuery({
    queryKey: ["usd_rates", user?.id],
    queryFn: fetchUsdRates,
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const currentRate = useMemo(() => {
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return getRate(usdRates, key);
  }, [usdRates]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["ingresos", user?.id, selectedYear] });

  const createMut = useMutation({ mutationFn: createIngreso, onSuccess: invalidate });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<Ingreso, "id" | "user_id" | "created_at">> }) =>
      updateIngreso(id, payload),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({ mutationFn: deleteIngreso, onSuccess: invalidate });

  const handleSave = async (data: Omit<Ingreso, "id" | "user_id" | "created_at">) => {
    if (editingIngreso) {
      await updateMut.mutateAsync({ id: editingIngreso.id, payload: data });
    } else {
      await createMut.mutateAsync(data);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try { await deleteMut.mutateAsync(id); }
    finally { setDeletingId(null); }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  // Monthly combined data: ingresos + gastos + restante, in both currencies
  const monthlyData = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => {
      const mk = `${selectedYear}-${String(idx + 1).padStart(2, "0")}`;
      const rate = getRate(usdRates, mk);

      const monthIng = ingresos.filter((i) => new Date(i.fecha + "T12:00:00").getMonth() === idx);
      const monthGas = gastos.filter((g) => new Date(g.fecha + "T12:00:00").getMonth() === idx);

      const ingUsd = monthIng.reduce((a, i) => a + i.monto_usd, 0);
      const ingArs = monthIng.reduce((a, i) => a + i.monto_ars, 0);
      const gasArs = monthGas.reduce((a, g) => a + Number(g.cantidad), 0);
      const gasUsd = rate && gasArs > 0 ? gasArs / rate : 0;

      return {
        name,
        ingUsd, ingArs,
        gasArs, gasUsd,
        restUsd: ingUsd - gasUsd,
        restArs: ingArs - gasArs,
        hasData: ingUsd > 0 || gasArs > 0,
      };
    });
  }, [ingresos, gastos, selectedYear, usdRates]);

  // Ingresos grouped by month for the table
  const groups = useMemo(() => {
    const map: Record<number, Ingreso[]> = {};
    for (const i of ingresos) {
      const m = new Date(i.fecha + "T12:00:00").getMonth();
      if (!map[m]) map[m] = [];
      map[m].push(i);
    }
    return Array.from({ length: 12 }, (_, idx) => ({ month: idx, items: map[idx] ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [ingresos]);

  const totalYearUsd = ingresos.reduce((a, i) => a + i.monto_usd, 0);
  const totalYearArs = ingresos.reduce((a, i) => a + i.monto_ars, 0);
  const totalGasArs  = gastos.reduce((a, g) => a + Number(g.cantidad), 0);
  const totalGasUsd  = monthlyData.reduce((a, m) => a + m.gasUsd, 0);
  const restanteUsd  = totalYearUsd - totalGasUsd;
  const restanteArs  = totalYearArs - totalGasArs;

  // ── Auth guard ────────────────────────────────────────────────────────────

  if (authLoading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );
  if (!user) { navigate("/", { replace: true }); return null; }

  const loading = ingresosLoading || gastosLoading;
  const fmt = currency === "USD" ? fmtUsd : fmtArs;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-4 px-4 py-3">
          <button
            onClick={() => navigate(`/?year=${selectedYear}`)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>

          <div className="w-px h-5 bg-gray-700" />

          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h1 className="text-sm font-semibold text-white">Ingresos</h1>
          </div>

          <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1.5 ml-auto">
            <button onClick={() => setYear(selectedYear - 1)} className="text-gray-400 hover:text-white p-0.5 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-white font-bold text-sm w-12 text-center">{selectedYear}</span>
            <button onClick={() => setYear(selectedYear + 1)} className="text-gray-400 hover:text-white p-0.5 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo ingreso
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 overflow-auto scrollbar-thin">
        <div className="max-w-screen-2xl mx-auto p-4 lg:p-6 space-y-6">

          {loading ? (
            <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : (
            <>
              {/* ── Stats ── */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <StatCard
                  label="Ingresos"
                  value={fmtUsd(totalYearUsd)}
                  sub={fmtArs(totalYearArs)}
                  color="blue"
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                />
                <StatCard
                  label="Gastos"
                  value={fmtUsd(totalGasUsd)}
                  sub={fmtArs(totalGasArs)}
                  color="red"
                  icon={<TrendingDown className="w-3.5 h-3.5" />}
                />
                <StatCard
                  label="Restante"
                  value={`${restanteUsd >= 0 ? "+" : ""}${fmtUsd(restanteUsd)}`}
                  sub={`${restanteArs >= 0 ? "+" : ""}${fmtArs(restanteArs)}`}
                  color={restanteUsd >= 0 ? "emerald" : "red"}
                  icon={<Minus className="w-3.5 h-3.5" />}
                />
              </div>

              {/* ── Ingresos vs Gastos chart ── */}
              {(ingresos.length > 0 || gastos.length > 0) && (
                <div className="bg-gray-900 ring-1 ring-gray-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Ingresos vs Gastos — {selectedYear}
                    </h2>
                    <CurrencyToggle value={currency} onChange={setCurrency} />
                  </div>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyData}
                        margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                        barCategoryGap="25%"
                        barGap={2}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis
                          tick={{ fill: "#6B7280", fontSize: 10 }}
                          tickFormatter={(v) => {
                            if (currency === "USD") return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
                            return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
                          }}
                          width={52} axisLine={false} tickLine={false}
                        />
                        <Tooltip
                          content={<ChartTooltip currency={currency} />}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11, color: "#9CA3AF", paddingTop: 8 }}
                          formatter={(value) => <span style={{ color: "#9CA3AF" }}>{value}</span>}
                        />
                        <ReferenceLine y={0} stroke="#374151" />
                        <Bar
                          name="Ingresos"
                          dataKey={currency === "USD" ? "ingUsd" : "ingArs"}
                          fill="#2563EB"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          name="Gastos"
                          dataKey={currency === "USD" ? "gasUsd" : "gasArs"}
                          fill="#DC2626"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Restante mensual table */}
                  {monthlyData.some((m) => m.hasData) && (
                    <div className="mt-4 border-t border-gray-800 pt-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Restante mensual</p>
                      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                        {monthlyData.map((m, idx) => {
                          if (!m.hasData) return null;
                          const val = currency === "USD" ? m.restUsd : m.restArs;
                          const isPos = val >= 0;
                          return (
                            <div key={idx} className="sm:col-span-1 col-span-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg bg-gray-800/40">
                              <span className="text-gray-600 text-[10px]">{m.name}</span>
                              <span className={`text-[10px] font-bold tabular-nums leading-tight text-center ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                                {isPos ? "+" : ""}{currency === "USD"
                                  ? fmtUsd(val).replace("$", "$")
                                  : fmtArs(val)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Ingresos table grouped by month ── */}
              <div className="bg-gray-900 ring-1 ring-gray-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <h2 className="text-sm font-semibold text-white">{selectedYear}</h2>
                  {ingresos.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {ingresos.length} {ingresos.length === 1 ? "entrada" : "entradas"} · {fmtUsd(totalYearUsd)}
                    </span>
                  )}
                </div>

                {ingresos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-600">
                    <DollarSign className="w-8 h-8" />
                    <p className="text-sm">No hay ingresos en {selectedYear}</p>
                    <button
                      onClick={openNew}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar ingreso
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-900/60">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">USD</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cambio</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">ARS</th>
                        <th className="px-4 py-2.5 w-20" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {groups.map(({ month, items }) => {
                        const groupUsd = items.reduce((a, i) => a + i.monto_usd, 0);
                        const groupArs = items.reduce((a, i) => a + i.monto_ars, 0);
                        return [
                          <tr key={`grp-${month}`} className="bg-gray-800/50 border-t border-gray-700/40 first:border-t-0">
                            <td className="pl-4 pr-3 py-1.5" colSpan={2}>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-200 text-xs font-semibold">{MONTH_FULL[month]}</span>
                                <span className="text-gray-600 text-xs">·</span>
                                <span className="text-gray-500 text-xs">{items.length} {items.length === 1 ? "ingreso" : "ingresos"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-1.5 text-right">
                              <span className="text-blue-400/80 text-xs font-semibold tabular-nums">{fmtUsd(groupUsd)}</span>
                            </td>
                            <td />
                            <td className="px-4 py-1.5 text-right">
                              <span className="text-gray-500 text-xs font-medium tabular-nums">{fmtArs(groupArs)}</span>
                            </td>
                            <td />
                          </tr>,
                          ...items.map((ingreso) => {
                            const isConfirming = confirmDeleteId === ingreso.id;
                            const isDeleting = deletingId === ingreso.id;
                            return (
                              <tr key={ingreso.id} className={`transition-colors ${isConfirming ? "bg-red-950/20" : "hover:bg-gray-800/30"}`}>
                                <td className="px-4 py-3 text-gray-400 text-xs tabular-nums whitespace-nowrap">{fmtDate(ingreso.fecha)}</td>
                                <td className="px-4 py-3 text-gray-200 font-medium">{ingreso.descripcion}</td>
                                <td className="px-4 py-3 text-right text-blue-300 font-semibold tabular-nums whitespace-nowrap">{fmtUsd(ingreso.monto_usd)}</td>
                                <td className="px-4 py-3 text-right text-gray-500 text-xs tabular-nums whitespace-nowrap">{ingreso.usd_rate.toLocaleString("es-AR")}</td>
                                <td className="px-4 py-3 text-right text-gray-300 tabular-nums whitespace-nowrap">{fmtArs(ingreso.monto_ars)}</td>
                                <td className="px-4 py-3">
                                  {isConfirming ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => handleDelete(ingreso.id)}
                                        disabled={isDeleting}
                                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                                      >
                                        {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                                        Eliminar
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => openEdit(ingreso)}
                                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-gray-700 transition-colors"
                                        title="Editar"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(ingreso.id)}
                                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          }),
                        ];
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-700 bg-gray-900/60">
                        <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-gray-500">Total {selectedYear}</td>
                        <td className="px-4 py-2.5 text-right text-blue-300 font-bold tabular-nums whitespace-nowrap">{fmtUsd(totalYearUsd)}</td>
                        <td />
                        <td className="px-4 py-2.5 text-right text-gray-200 font-bold tabular-nums whitespace-nowrap">{fmtArs(totalYearArs)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {modalOpen && (
        <IngresoModal
          ingreso={editingIngreso}
          defaultDate={now.toISOString().split("T")[0]}
          defaultRate={currentRate}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
