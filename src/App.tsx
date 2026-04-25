import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip as RechartTooltip,
} from "recharts";
import {
  Loader2,
  Plus,
  ArrowUpRight,
  Search,
  Receipt,
} from "lucide-react";
import { GastosTable, Landing, ImportModal, AppShell, MonthPicker } from "@/components";
import { fetchGastosByYear, fetchUsdRates, fetchPresupuesto } from "@/api";
import { useAuth, useUserSettings } from "@/contexts";
import { useMonthlyGastos } from "@/hooks";
import { MONTH_FULL, monthKey } from "@/constants";
import { getChipHex } from "@/utils/chipColor";
import type { UsdRates } from "@/types";

export { monthKey };

const DEFAULT_RATE = 1000;

// ── Formatters ─────────────────────────────────────────────────────────────
const fmtArs = (n: number, compact = false) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(n);

const fmtUsd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

// ── KPI card ───────────────────────────────────────────────────────────────
function KPICard({
  label,
  value,
  sub,
  trend,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number | null;
  positive?: boolean;
}) {
  const isUp = trend != null && trend > 0;
  const isDown = trend != null && trend < 0;
  return (
    <div style={{ background: "var(--surface)", padding: "18px 20px" }}>
      <p
        className="text-[10px] uppercase tracking-widest mb-2.5"
        style={{ color: "var(--ink-3)" }}
      >
        {label}
      </p>
      <p
        className="num font-medium leading-none"
        style={{
          fontSize: 24,
          letterSpacing: "-0.03em",
          color: positive ? "var(--positive)" : "var(--ink)",
        }}
      >
        {value}
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        {sub && (
          <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>
            {sub}
          </span>
        )}
        {trend != null && (
          <span
            className="num text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{
              background: isUp
                ? "var(--neg-soft)"
                : isDown
                  ? "var(--pos-soft)"
                  : "var(--surface-alt)",
              color: isUp
                ? "var(--negative)"
                : isDown
                  ? "var(--positive)"
                  : "var(--ink-3)",
            }}
          >
            {isUp ? "+" : ""}
            {trend.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ── Month picker popover ───────────────────────────────────────────────────

// ── USD Rate pill ──────────────────────────────────────────────────────────
function RatePill({
  rate,
  hasCustom,
  monthKey: mk,
  onUpdate,
}: {
  rate: number;
  hasCustom: boolean;
  monthKey: string;
  onUpdate: (rates: UsdRates) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(rate);
  useEffect(() => {
    setVal(rate);
  }, [rate]);

  const save = async () => {
    const r = Number(val);
    if (r > 0) {
      const mod = await import("@/api");
      const res = await mod.updateMonthRate(mk, r);
      onUpdate(res.usdRates);
    }
    setEditing(false);
  };

  if (editing)
    return (
      <div
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1"
        style={{
          background: "var(--surface-alt)",
          border: "1px solid var(--line)",
        }}
      >
        <span className="text-[10px]" style={{ color: "var(--ink-3)" }}>
          USD $
        </span>
        <input
          type="number"
          value={val}
          onChange={(e) => setVal(Number(e.target.value))}
          className="num bg-transparent w-16 text-sm focus:outline-none"
          style={{ color: "var(--ink)", border: "none" }}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button
          onClick={save}
          style={{
            color: "var(--positive)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          ✓
        </button>
        <button
          onClick={() => setEditing(false)}
          style={{
            color: "var(--negative)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          ✕
        </button>
      </div>
    );

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors"
      style={{
        background: "var(--surface-alt)",
        border: "1px solid var(--line)",
        cursor: "pointer",
      }}
    >
      <span style={{ color: "var(--ink-3)" }}>USD</span>
      <span
        className="num font-semibold"
        style={{ color: hasCustom ? "var(--warn)" : "var(--ink)" }}
      >
        ${rate.toLocaleString("es-AR")}
      </span>
      {!hasCustom && (
        <span
          className="text-[9px] font-medium px-1 py-0.5 rounded"
          style={{
            background: "var(--bg)",
            color: "var(--ink-3)",
            border: "1px solid var(--line)",
          }}
        >
          est.
        </span>
      )}
    </button>
  );
}

// ── Bar tooltip ────────────────────────────────────────────────────────────
function DayBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        color: "var(--ink)",
      }}
    >
      <p style={{ color: "var(--ink-3)", marginBottom: 2 }}>Día {label}</p>
      <p className="num font-semibold">{fmtArs(payload[0].value)}</p>
    </div>
  );
}


// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { settings } = useUserSettings();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [showImport, setShowImport] = useState(false);
  const [showAddGasto, setShowAddGasto] = useState(false);
  const [showAllRows, setShowAllRows] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const CATEGORIES_PREVIEW = 3;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setShowAddGasto(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowAllRows(true);
        setTimeout(
          () =>
            document
              .querySelector<HTMLInputElement>('input[placeholder*="uscar"]')
              ?.focus(),
          100,
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const now = new Date();

  const initFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const y = parseInt(params.get("year") ?? "");
    const m = parseInt(params.get("month") ?? "");
    return {
      year: isNaN(y) ? now.getFullYear() : y,
      month: isNaN(m) || m < 1 || m > 12 ? now.getMonth() : m - 1,
    };
  };

  const [selectedYear, setSelectedYear] = useState(() => initFromUrl().year);
  const [selectedMonth, setSelectedMonth] = useState(() => initFromUrl().month);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    params.set("year", String(selectedYear));
    params.set("month", String(selectedMonth + 1));
    history.replaceState(null, "", `?${params.toString()}`);
  }, [selectedYear, selectedMonth, user]);

  const {
    data: gastos = [],
    isLoading: gastosLoading,
    isError: gastosError,
  } = useQuery({
    queryKey: ["gastos", user?.id, selectedYear],
    queryFn: () => fetchGastosByYear(selectedYear),
    enabled: !!user?.id,
  });

  const { data: usdRates = {} as UsdRates, isLoading: ratesLoading } = useQuery(
    {
      queryKey: ["usd_rates", user?.id],
      queryFn: fetchUsdRates,
      enabled: !!user?.id,
      staleTime: 1000 * 60 * 10,
    },
  );

  const loading = gastosLoading || ratesLoading;
  const currentMonthKey = monthKey(selectedYear, selectedMonth);

  const currentRate = useMemo(() => {
    if (usdRates[currentMonthKey]) return usdRates[currentMonthKey];
    const keys = Object.keys(usdRates).sort();
    const prior = [...keys].reverse().find((k) => k <= currentMonthKey);
    return prior ? usdRates[prior] : DEFAULT_RATE;
  }, [usdRates, currentMonthKey]);

  const hasCustomRate = !!usdRates[currentMonthKey];

  // selectedMonth is 0-indexed → presupuesto uses 1-indexed
  const { data: presupuestoMes } = useQuery({
    queryKey: ["presupuesto", selectedYear, selectedMonth + 1],
    queryFn: () => fetchPresupuesto(selectedYear, selectedMonth + 1),
    enabled: !!user?.id,
  });

  const { gastosDelMes, gastosDelMesAnterior, prevMonthLabel, totalMes } =
    useMonthlyGastos(gastos, selectedYear, selectedMonth);

  const prevTotalMes = useMemo(
    () =>
      gastosDelMesAnterior
        .filter((g) => g.concepto !== "Inversiones")
        .reduce((acc, g) => acc + Number(g.cantidad), 0),
    [gastosDelMesAnterior],
  );

  const inversionesMes = useMemo(
    () =>
      gastosDelMes
        .filter((g) => g.concepto === "Inversiones")
        .reduce((acc, g) => acc + Number(g.cantidad), 0),
    [gastosDelMes],
  );

  const delta =
    prevTotalMes > 0 ? ((totalMes - prevTotalMes) / prevTotalMes) * 100 : null;

  const avgPerDay = useMemo(() => {
    const daysElapsed =
      selectedMonth === now.getMonth() && selectedYear === now.getFullYear()
        ? now.getDate()
        : new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return daysElapsed > 0 ? totalMes / daysElapsed : 0;
  }, [gastosDelMes, selectedMonth, selectedYear]);

  // ── Daily bar chart data ─────────────────────────────────────────────────
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const todayDay =
    selectedMonth === now.getMonth() && selectedYear === now.getFullYear()
      ? now.getDate()
      : null;

  const dailyData = useMemo(() => {
    const map: Record<number, number> = {};
    gastosDelMes.forEach((g) => {
      const d = new Date(g.fecha + "T12:00:00").getDate();
      map[d] = (map[d] ?? 0) + Number(g.cantidad);
    });
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      total: map[i + 1] ?? 0,
      isToday: todayDay === i + 1,
    }));
  }, [gastosDelMes, daysInMonth, todayDay]);

  // ── Forma de pago donut data ─────────────────────────────────────────────
  const formaColorMap = useMemo(
    () =>
      Object.fromEntries(
        settings.formas.map((f) => [f, getChipHex(f, "forma", settings)]),
      ),
    [settings],
  );

  const byForma = useMemo(() => {
    const total = gastosDelMes.reduce((a, g) => a + Number(g.cantidad), 0);
    return settings.formas
      .map((f) => {
        const items = gastosDelMes.filter((g) => g.forma === f);
        const sum = items.reduce((a, g) => a + Number(g.cantidad), 0);
        return {
          name: f,
          count: items.length,
          total: sum,
          pct: total > 0 ? ((sum / total) * 100).toFixed(1) : "0.0",
        };
      })
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [gastosDelMes, settings.formas]);

  // ── Category summary data ────────────────────────────────────────────────
  const conceptoColorMap = useMemo(
    () =>
      Object.fromEntries(
        settings.conceptos.map((c) => [c, getChipHex(c, "concepto", settings)]),
      ),
    [settings],
  );

  const byConcepto = useMemo(() => {
    const total = gastosDelMes.reduce((a, g) => a + Number(g.cantidad), 0);
    return settings.conceptos
      .map((c) => {
        const items = gastosDelMes.filter((g) => g.concepto === c);
        const sum = items.reduce((a, g) => a + Number(g.cantidad), 0);
        return {
          name: c,
          count: items.length,
          total: sum,
          pct: total > 0 ? (sum / total) * 100 : 0,
          avg: items.length > 0 ? sum / items.length : 0,
        };
      })
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [gastosDelMes, settings.conceptos]);

  const handleRatesUpdated = (newRates: UsdRates) => {
    queryClient.setQueryData(["usd_rates", user?.id], newRates);
  };

  const handleImported = () => {
    queryClient.invalidateQueries({
      queryKey: ["gastos", user?.id, selectedYear],
    });
    setShowImport(false);
  };

  const handleMonthChange = (y: number, m: number) => {
    setSelectedYear(y);
    setSelectedMonth(m);
  };

  // ── Auth / loading states ────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "var(--accent)" }}
        />
      </div>
    );
  }

  if (!user) return <Landing />;

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "var(--accent)" }}
          />
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            Cargando gastos...
          </p>
        </div>
      </div>
    );
  }

  if (gastosError) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="rounded-xl p-8 max-w-sm text-center"
          style={{
            background: "var(--neg-soft)",
            border: "1px solid var(--negative)",
          }}
        >
          <p
            className="font-semibold mb-2"
            style={{ color: "var(--negative)" }}
          >
            Error al cargar datos
          </p>
          <button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["gastos", user?.id] })
            }
            className="mt-4 rounded-lg px-4 py-2 text-sm"
            style={{
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppShell user={user} onQuickAdd={() => setShowAddGasto(true)}>
      {/* ── Topbar ────────────────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center gap-2 px-5"
        style={{
          height: 56,
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Receipt className="w-4 h-4 hidden sm:block" style={{ color: "var(--accent)" }} />
        <h1
          className="text-sm font-semibold hidden sm:block"
          style={{ color: "var(--ink)" }}
        >
          Gastos
        </h1>

        <MonthPicker
          year={selectedYear}
          month={selectedMonth}
          onChange={handleMonthChange}
        />

        <div className="flex-1" />

        {/* Search */}
        <button
          onClick={() => {
            setShowAllRows(true);
            setTimeout(
              () =>
                document
                  .querySelector<HTMLInputElement>(
                    'input[placeholder*="uscar"]',
                  )
                  ?.focus(),
              100,
            );
          }}
          className="hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-opacity hover:opacity-80"
          style={{
            background: "var(--surface)",
            color: "var(--ink-2)",
            border: "1px solid var(--line)",
            cursor: "pointer",
          }}
        >
          <Search size={12} style={{ color: "var(--ink-3)" }} />
          <span>Buscar</span>
          <kbd
            className="num text-[9px] px-1 py-0.5 rounded"
            style={{
              background: "var(--surface-alt)",
              color: "var(--ink-3)",
              border: "1px solid var(--line)",
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* USD rate */}
        <RatePill
          rate={currentRate}
          hasCustom={hasCustomRate}
          monthKey={currentMonthKey}
          onUpdate={handleRatesUpdated}
        />

        {/* New expense */}
        <button
          onClick={() => setShowAddGasto(true)}
          className="flex items-center gap-1.5 rounded-lg pl-3 pr-2 py-1.5 text-xs font-semibold"
          style={{
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Nuevo gasto</span>
          <kbd
            className="num text-[9px] px-1.5 py-0.5 rounded ml-0.5"
            style={{
              background: "rgba(0,0,0,0.2)",
              color: "var(--accent-ink)",
              border: "none",
            }}
          >
            N
          </kbd>
        </button>
      </header>

      {/* ── KPI grid ──────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--line)",
          gap: 1,
          background: "var(--line)",
        }}
      >
        <KPICard
          label="Gastado"
          value={fmtArs(totalMes)}
          sub={`${fmtUsd(totalMes / currentRate)} al dólar`}
          trend={delta}
        />
        <KPICard
          label="Inversiones"
          value={fmtArs(inversionesMes)}
          sub={`${gastosDelMes.filter((g) => g.concepto === "Inversiones").length} movimientos`}
          positive
        />
        <KPICard
          label="Promedio / día"
          value={fmtArs(avgPerDay)}
          sub={`${gastosDelMes.length} gastos en ${todayDay ?? daysInMonth} días`}
        />
        <KPICard
          label="vs mes anterior"
          value={prevTotalMes > 0 ? fmtArs(prevTotalMes) : "—"}
          sub={prevMonthLabel}
        />
      </div>

      {/* ── Main scroll area ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-h-0">
        {gastosDelMes.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-24 gap-4"
            style={{ color: "var(--ink-3)" }}
          >
            <p className="text-sm">
              No hay gastos en {MONTH_FULL[selectedMonth]} {selectedYear}
            </p>
            <button
              onClick={() => setShowAddGasto(true)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                background: "var(--accent)",
                color: "var(--accent-ink)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Plus size={15} /> Agregar primer gasto
            </button>
          </div>
        ) : (
          <div className="p-4 lg:p-5 space-y-4">
            {/* ── Budget widget ── */}
            {presupuestoMes && (() => {
              const rate = presupuestoMes.usd_rate || currentRate || 1;
              const totalGastadoArs = gastosDelMes.reduce((s, g) => s + g.cantidad, 0);
              const totalGastadoUsd = totalGastadoArs / rate;
              const pct = presupuestoMes.total_usd > 0 ? Math.min((totalGastadoUsd / presupuestoMes.total_usd) * 100, 100) : 0;
              const barColor = pct >= 100 ? "var(--negative)" : pct >= 80 ? "var(--warn)" : "var(--positive)";
              return (
                <button
                  onClick={() => navigate("/presupuesto")}
                  style={{
                    width: "100%",
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Presupuesto {MONTH_FULL[selectedMonth]}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="num" style={{ fontSize: 12, color: "var(--ink-2)" }}>
                        {fmtUsd(totalGastadoUsd)} / {fmtUsd(presupuestoMes.total_usd)}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 4, background: "var(--surface-alt)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 99, transition: "width 0.3s" }} />
                  </div>
                </button>
              );
            })()}
            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
              {/* Daily evolution bar chart */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="text-sm font-medium"
                    style={{ color: "var(--ink)" }}
                  >
                    Evolución diaria
                    <span
                      className="ml-2 num text-[11px]"
                      style={{ color: "var(--ink-3)" }}
                    >
                      · {MONTH_FULL[selectedMonth].slice(0, 3)} {selectedYear}
                    </span>
                  </h2>
                  <div className="flex items-center gap-3">
                    {todayDay && (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ background: "var(--warn)" }}
                        />
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--ink-3)" }}
                        >
                          hoy
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ background: "var(--accent)" }}
                      />
                      <span
                        className="text-[10px]"
                        style={{ color: "var(--ink-3)" }}
                      >
                        gastado
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dailyData.filter((d) => d.total > 0 || d.isToday)}
                      margin={{ top: 2, right: 4, left: 0, bottom: 0 }}
                      barSize={daysInMonth > 20 ? 9 : 16}
                    >
                      <XAxis
                        dataKey="day"
                        tick={{
                          fill: "var(--ink-3)",
                          fontSize: 9,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--line)" }}
                        tickFormatter={(v) => String(v).padStart(2, "0")}
                      />
                      <YAxis hide />
                      <RechartTooltip
                        content={<DayBarTooltip />}
                        cursor={{ fill: "var(--surface-alt)", radius: 4 }}
                      />
                      <Bar
                        dataKey="total"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(data: { day: number; total: number }) => {
                          if (!data?.day) return;
                          const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(data.day).padStart(2, "0")}`;
                          const el = document.getElementById(`day-${dateStr}`);
                          el?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        {dailyData
                          .filter((d) => d.total > 0 || d.isToday)
                          .map((d) => (
                            <Cell
                              key={d.day}
                              fill={
                                d.isToday && d.total === 0
                                  ? "var(--line)"
                                  : d.isToday
                                    ? "var(--warn)"
                                    : "var(--accent)"
                              }
                              fillOpacity={d.total === 0 ? 0.3 : 0.9}
                            />
                          ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Forma de pago */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <h2 className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                    Forma de pago
                  </h2>
                  <span className="num text-xs" style={{ color: "var(--ink-3)" }}>
                    {byForma.length}
                  </span>
                </div>
                {byForma.length > 0 ? (
                  <div className="px-4 py-3 flex flex-col gap-3">
                    {byForma.map((d) => {
                      const color = formaColorMap[d.name] ?? "#6B7280";
                      return (
                        <div key={d.name}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: color }}
                            />
                            <span
                              className="flex-1 text-[12px] truncate"
                              style={{ color: "var(--ink-2)" }}
                            >
                              {d.name}
                            </span>
                            <span
                              className="num text-[10px]"
                              style={{ color: "var(--ink-3)" }}
                            >
                              {d.count} mov
                            </span>
                            <span
                              className="num text-[12px] font-medium"
                              style={{ color: "var(--ink)" }}
                            >
                              {fmtArs(d.total, true)}
                            </span>
                          </div>
                          <div
                            style={{
                              height: 3,
                              background: "var(--surface-alt)",
                              borderRadius: 99,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${d.pct}%`,
                                height: "100%",
                                background: color,
                                borderRadius: 99,
                                opacity: 0.7,
                              }}
                            />
                          </div>
                          <div
                            className="num text-right text-[10px] mt-0.5"
                            style={{ color: "var(--ink-3)" }}
                          >
                            {d.pct}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center h-32 text-xs"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Sin datos
                  </div>
                )}
              </div>
            </div>

            {/* ── Categorías summary table ── */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
            >
              {/* Card header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <h2
                  className="text-sm font-medium"
                  style={{ color: "var(--ink)" }}
                >
                  Categorías
                  <span
                    className="num ml-2 text-xs"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {byConcepto.length}
                  </span>
                </h2>
                <button
                  onClick={() => setShowImport(true)}
                  className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ink-3)",
                  }}
                >
                  <ArrowUpRight size={12} /> Importar CSV
                </button>
              </div>

              {byConcepto.length === 0 ? (
                <div
                  className="p-8 text-center text-xs"
                  style={{ color: "var(--ink-3)" }}
                >
                  Sin categorías
                </div>
              ) : (
                <>
                  {/* Column headers */}
                  <div
                    className="grid text-[10px] uppercase tracking-widest font-medium px-4 py-2"
                    style={{
                      color: "var(--ink-3)",
                      borderBottom: "1px solid var(--line)",
                      gridTemplateColumns: "1fr 40px 120px 160px 72px",
                    }}
                  >
                    <span>Categoría</span>
                    <span className="text-right">#</span>
                    <span className="text-right">Total</span>
                    <span className="pl-4">Participación</span>
                    <span className="text-right">Promedio</span>
                  </div>

                  {/* Rows — preview or all */}
                  {(showAllCategories
                    ? byConcepto
                    : byConcepto.slice(0, CATEGORIES_PREVIEW)
                  ).map((d) => (
                    <div
                      key={d.name}
                      className="grid items-center px-4 py-3 row-hover transition-colors"
                      style={{
                        borderBottom: "1px solid var(--line)",
                        gridTemplateColumns: "1fr 40px 120px 160px 72px",
                      }}
                    >
                      {/* Name with color bar */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-[3px] h-[18px] rounded-full flex-shrink-0"
                          style={{
                            background: conceptoColorMap[d.name] ?? "#6B7280",
                          }}
                        />
                        <span
                          className="text-sm truncate"
                          style={{ color: "var(--ink)" }}
                        >
                          {d.name}
                        </span>
                      </div>
                      {/* Count */}
                      <span
                        className="num text-xs text-right"
                        style={{ color: "var(--ink-3)" }}
                      >
                        {d.count}
                      </span>
                      {/* Total */}
                      <span
                        className="num text-sm font-medium text-right"
                        style={{ color: "var(--ink)" }}
                      >
                        {fmtArs(d.total)}
                      </span>
                      {/* Bar + % */}
                      <div className="flex items-center gap-2 pl-4 pr-2">
                        <div
                          className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{ background: "var(--surface-alt)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(d.pct, 100)}%`,
                              background:
                                conceptoColorMap[d.name] ?? "var(--accent)",
                            }}
                          />
                        </div>
                        <span
                          className="num text-[10px] w-9 text-right flex-shrink-0"
                          style={{ color: "var(--ink-3)" }}
                        >
                          {d.pct.toFixed(1)}%
                        </span>
                      </div>
                      {/* Avg */}
                      <span
                        className="num text-xs text-right"
                        style={{ color: "var(--ink-3)" }}
                      >
                        {fmtArs(d.avg, true)}
                      </span>
                    </div>
                  ))}

                  {/* Expand / collapse footer */}
                  {byConcepto.length > CATEGORIES_PREVIEW && (
                    <button
                      onClick={() => setShowAllCategories((v) => !v)}
                      className="w-full py-2.5 text-xs font-medium transition-colors"
                      style={{
                        background: "transparent",
                        border: "none",
                        borderTop: "1px solid var(--line)",
                        cursor: "pointer",
                        color: "var(--ink-3)",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "var(--ink)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "var(--ink-3)")
                      }
                    >
                      {showAllCategories
                        ? "Ver menos"
                        : `Ver todas (${byConcepto.length - CATEGORIES_PREVIEW} más)`}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* ── Actividad reciente ── */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
            >
              {/* Card header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <h2
                  className="text-sm font-medium"
                  style={{ color: "var(--ink)" }}
                >
                  Actividad reciente
                  <span
                    className="num ml-2 text-xs"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {gastosDelMes.length}
                  </span>
                </h2>
                <button
                  onClick={() => setShowAllRows((v) => !v)}
                  className="text-xs transition-opacity hover:opacity-70"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ink-3)",
                  }}
                >
                  {showAllRows ? "Colapsar" : "Expandir"}
                </button>
              </div>
              {showAllRows && (
                <GastosTable
                  gastos={gastosDelMes}
                  selectedYear={selectedYear}
                  externalShowAdd={showAddGasto}
                  onAddClose={() => setShowAddGasto(false)}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}

      {/* Mobile FAB */}
      <button
        onClick={() => setShowAddGasto(true)}
        className="lg:hidden fixed bottom-20 right-4 z-20 grid place-items-center rounded-full shadow-xl"
        style={{
          width: 52,
          height: 52,
          background: "var(--accent)",
          color: "var(--accent-ink)",
          border: "none",
          cursor: "pointer",
        }}
      >
        <Plus size={22} strokeWidth={2} />
      </button>
    </AppShell>
  );
}
