import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  DollarSign,
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
import { AppShell, YearPicker } from "@/components";
import { useAuth } from "@/contexts";
import { useYearParam } from "@/hooks";
import { MONTH_NAMES, MONTH_FULL } from "@/constants";
import type { Ingreso, UsdRates } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    <div
      className="flex items-center rounded-lg p-0.5 gap-0.5"
      style={{ background: 'var(--surface-alt)' }}
    >
      {(["USD", "ARS"] as Currency[]).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
          style={
            value === c
              ? { background: 'var(--line)', color: 'var(--ink)', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }
              : { color: 'var(--ink-3)', background: 'transparent' }
          }
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
    <div
      className="rounded-lg px-3 py-2.5 shadow-xl text-xs space-y-1"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
    >
      <p className="font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>{label}</p>
      {ing && <p style={{ color: ing.color }}>Ingresos: <span className="font-semibold">{fmt(ing.value)}</span></p>}
      {gas && <p style={{ color: gas.color }}>Gastos: <span className="font-semibold">{fmt(gas.value)}</span></p>}
      {ing && gas && (
        <p
          className="font-bold pt-1 mt-1"
          style={{
            borderTop: '1px solid var(--line)',
            color: restante >= 0 ? 'var(--positive)' : 'var(--negative)',
          }}
        >
          Restante: {restante >= 0 ? "+" : ""}{fmt(restante)}
        </p>
      )}
    </div>
  );
}


// ── Main page ─────────────────────────────────────────────────────────────────

export default function IngresosPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedYear, setYear } = useYearParam();

  const now = new Date();

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

  const groups = useMemo(() => {
    const map: Record<number, Ingreso[]> = {};
    for (const i of ingresos) {
      const m = new Date(i.fecha + "T12:00:00").getMonth();
      if (!map[m]) map[m] = [];
      map[m].push(i);
    }
    return Array.from({ length: 12 }, (_, idx) => ({ month: idx, items: map[idx] ?? [] }))
      .filter((g) => g.items.length > 0)
      .reverse();
  }, [ingresos]);

  const totalYearUsd = ingresos.reduce((a, i) => a + i.monto_usd, 0);
  const totalYearArs = ingresos.reduce((a, i) => a + i.monto_ars, 0);
  const totalGasArs  = gastos.reduce((a, g) => a + Number(g.cantidad), 0);
  const totalGasUsd  = monthlyData.reduce((a, m) => a + m.gasUsd, 0);
  const restanteUsd  = totalYearUsd - totalGasUsd;
  const restanteArs  = totalYearArs - totalGasArs;

  // ── Auth guard ────────────────────────────────────────────────────────────

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  );
  if (!user) { navigate("/", { replace: true }); return null; }

  const loading = ingresosLoading || gastosLoading;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell user={user}>
      {/* ── Header ── */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-5"
        style={{
          height: 56,
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <TrendingUp className="w-4 h-4 hidden sm:block" style={{ color: "var(--accent)" }} />
        <h1 className="text-sm font-semibold hidden sm:block" style={{ color: "var(--ink)" }}>
          Ingresos
        </h1>

        <div className="flex-1" />

        <YearPicker year={selectedYear} onChange={setYear} />

        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)", border: "none", cursor: "pointer" }}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Nuevo ingreso</span>
        </button>
      </header>

      {/* ── KPI grid ── */}
      <div
        className="grid grid-cols-3 flex-shrink-0"
        style={{ gap: 1, background: "var(--line)", borderBottom: "1px solid var(--line)" }}
      >
        {[
          {
            label: "Ingresos",
            value: fmtUsd(totalYearUsd),
            sub: fmtArs(totalYearArs),
            valueColor: "var(--accent)" as const,
            subColor: "var(--ink-3)" as const,
          },
          {
            label: "Gastos",
            value: fmtUsd(totalGasUsd),
            sub: fmtArs(totalGasArs),
            valueColor: "var(--negative)" as const,
            subColor: "var(--ink-3)" as const,
          },
          {
            label: "Restante",
            value: `${restanteUsd >= 0 ? "+" : ""}${fmtUsd(restanteUsd)}`,
            sub: `${restanteArs >= 0 ? "+" : ""}${fmtArs(restanteArs)}`,
            valueColor: (restanteUsd >= 0 ? "var(--positive)" : "var(--negative)") as string,
            subColor: "var(--ink-3)" as const,
          },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--surface)", padding: "18px 20px" }}>
            <p
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "var(--ink-3)", marginBottom: 8 }}
            >
              {k.label}
            </p>
            <p
              className="num font-semibold leading-none"
              style={{ fontSize: 22, letterSpacing: "-0.03em", color: k.valueColor, marginBottom: 6 }}
            >
              {k.value}
            </p>
            <p className="text-[11px] num" style={{ color: k.subColor }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 lg:p-5 space-y-4">

          {loading ? (
            <div className="flex items-center justify-center h-64 gap-3" style={{ color: 'var(--ink-2)' }}>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : (
            <>

              {/* ── Ingresos vs Gastos chart ── */}
              {(ingresos.length > 0 || gastos.length > 0) && (
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>
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
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis
                          tick={{ fill: 'var(--ink-3)', fontSize: 10 }}
                          tickFormatter={(v) => {
                            if (currency === "USD") return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
                            return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
                          }}
                          width={52} axisLine={false} tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip currency={currency} />} />
                        <Legend
                          wrapperStyle={{ fontSize: 11, color: 'var(--ink-2)', paddingTop: 8 }}
                          formatter={(value) => <span style={{ color: 'var(--ink-2)' }}>{value}</span>}
                        />
                        <ReferenceLine y={0} stroke="var(--line)" />
                        <Bar
                          name="Ingresos"
                          dataKey={currency === "USD" ? "ingUsd" : "ingArs"}
                          fill="var(--accent)"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          name="Gastos"
                          dataKey={currency === "USD" ? "gasUsd" : "gasArs"}
                          fill="var(--negative)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Restante mensual table */}
                  {monthlyData.some((m) => m.hasData) && (
                    <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                      <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--ink-3)' }}>Restante mensual</p>
                      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                        {monthlyData.map((m, idx) => {
                          if (!m.hasData) return null;
                          const val = currency === "USD" ? m.restUsd : m.restArs;
                          const isPos = val >= 0;
                          return (
                            <div
                              key={idx}
                              className="sm:col-span-1 col-span-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg"
                              style={{ background: 'var(--surface-alt)' }}
                            >
                              <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>{m.name}</span>
                              <span
                                className="text-[10px] font-bold num leading-tight text-center"
                                style={{ color: isPos ? 'var(--positive)' : 'var(--negative)' }}
                              >
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
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{selectedYear}</h2>
                  {ingresos.length > 0 && (
                    <span className="text-xs num" style={{ color: 'var(--ink-3)' }}>
                      {ingresos.length} {ingresos.length === 1 ? "entrada" : "entradas"} · {fmtUsd(totalYearUsd)}
                    </span>
                  )}
                </div>

                {ingresos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--ink-3)' }}>
                    <DollarSign className="w-8 h-8" />
                    <p className="text-sm">No hay ingresos en {selectedYear}</p>
                    <button
                      onClick={openNew}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium mt-1"
                      style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 7, cursor: 'pointer' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar ingreso
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-alt)' }}>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>Fecha</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>Descripción</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>USD</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>Cambio</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>ARS</th>
                        <th className="px-4 py-2.5 w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map(({ month, items }) => {
                        const groupUsd = items.reduce((a, i) => a + i.monto_usd, 0);
                        const groupArs = items.reduce((a, i) => a + i.monto_ars, 0);
                        return [
                          <tr
                            key={`grp-${month}`}
                            style={{ background: 'var(--surface-alt)', borderTop: '1px solid var(--line-soft)' }}
                          >
                            <td className="pl-4 pr-3 py-1.5" colSpan={2}>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{MONTH_FULL[month]}</span>
                                <span className="text-xs" style={{ color: 'var(--line)' }}>·</span>
                                <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{items.length} {items.length === 1 ? "ingreso" : "ingresos"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-1.5 text-right">
                              <span className="text-xs font-semibold num" style={{ color: 'var(--accent)' }}>{fmtUsd(groupUsd)}</span>
                            </td>
                            <td />
                            <td className="px-4 py-1.5 text-right">
                              <span className="text-xs font-medium num" style={{ color: 'var(--ink-3)' }}>{fmtArs(groupArs)}</span>
                            </td>
                            <td />
                          </tr>,
                          ...items.map((ingreso) => {
                            const isConfirming = confirmDeleteId === ingreso.id;
                            const isDeleting = deletingId === ingreso.id;
                            return (
                              <tr
                                key={ingreso.id}
                                className={isConfirming ? "" : "row-hover"}
                                style={{
                                  transition: 'background 0.15s',
                                  background: isConfirming ? 'var(--neg-soft)' : undefined,
                                  borderTop: '1px solid var(--line-soft)',
                                }}
                              >
                                <td className="px-4 py-3 text-xs num whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>{fmtDate(ingreso.fecha)}</td>
                                <td className="px-4 py-3 font-medium" style={{ color: 'var(--ink)' }}>{ingreso.descripcion}</td>
                                <td className="px-4 py-3 text-right font-semibold num whitespace-nowrap" style={{ color: 'var(--accent)' }}>{fmtUsd(ingreso.monto_usd)}</td>
                                <td className="px-4 py-3 text-right text-xs num whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{ingreso.usd_rate.toLocaleString("es-AR")}</td>
                                <td className="px-4 py-3 text-right num whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>{fmtArs(ingreso.monto_ars)}</td>
                                <td className="px-4 py-3">
                                  {isConfirming ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => handleDelete(ingreso.id)}
                                        disabled={isDeleting}
                                        className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors"
                                        style={{ background: 'var(--negative)', color: '#fff', border: 'none', cursor: 'pointer' }}
                                      >
                                        {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                                        Eliminar
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                                        style={{ background: 'var(--surface-alt)', color: 'var(--ink-2)', border: '1px solid var(--line)', cursor: 'pointer' }}
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => openEdit(ingreso)}
                                        className="p-1.5 rounded-lg transition-colors"
                                        style={{ color: 'var(--ink-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                        title="Editar"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(ingreso.id)}
                                        className="p-1.5 rounded-lg transition-colors"
                                        style={{ color: 'var(--ink-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
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
                      <tr style={{ borderTop: '1px solid var(--line)', background: 'var(--surface-alt)' }}>
                        <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--ink-3)' }}>Total {selectedYear}</td>
                        <td className="px-4 py-2.5 text-right font-bold num whitespace-nowrap" style={{ color: 'var(--accent)' }}>{fmtUsd(totalYearUsd)}</td>
                        <td />
                        <td className="px-4 py-2.5 text-right font-bold num whitespace-nowrap" style={{ color: 'var(--ink)' }}>{fmtArs(totalYearArs)}</td>
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
    </AppShell>
  );
}
