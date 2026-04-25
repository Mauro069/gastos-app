import { useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BarChart2 } from "lucide-react";
import { Promedios, AppShell, YearPicker } from "@/components";
import { fetchGastosByYear, fetchUsdRates } from "@/api";
import { useAuth } from "@/contexts";
import { useYearParam } from "@/hooks";
import type { UsdRates, PromediosTab } from "@/types";
import { fmt, fmtUSD, getRateForMonth } from "@/components/Promedios/utils";
import { MONTH_FULL } from "@/constants";

const VALID_TABS: PromediosTab[] = ["resumen", "categorias", "comparacion"];

export default function PromediosPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tab: tabParam } = useParams<{ tab: string }>();

  const activeTab: PromediosTab = VALID_TABS.includes(tabParam as PromediosTab)
    ? (tabParam as PromediosTab)
    : "resumen";

  const setTab = (tab: PromediosTab) => {
    navigate(`/promedios/${tab}?${searchParams.toString()}`, { replace: true });
  };

  const { selectedYear, setYear } = useYearParam();
  const prevYear = selectedYear - 1;

  const { data: gastos = [], isLoading: gastosLoading } = useQuery({
    queryKey: ["gastos", user?.id, selectedYear],
    queryFn: () => fetchGastosByYear(selectedYear),
    enabled: !!user,
  });

  const { data: prevYearGastos = [], isLoading: prevGastosLoading } = useQuery({
    queryKey: ["gastos", user?.id, prevYear],
    queryFn: () => fetchGastosByYear(prevYear),
    enabled: !!user,
  });

  const { data: usdRates = {} as UsdRates, isLoading: ratesLoading } = useQuery({
    queryKey: ["usd_rates", user?.id],
    queryFn: fetchUsdRates,
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  // ── KPI computations ──────────────────────────────────────────────────────

  const gastosAno = useMemo(
    () => gastos.filter((g) => new Date(g.fecha + "T12:00:00").getFullYear() === selectedYear),
    [gastos, selectedYear],
  );

  const monthlyData = useMemo(
    () =>
      MONTH_FULL.map((_, idx) => {
        const items = gastosAno.filter(
          (g) => new Date(g.fecha + "T12:00:00").getMonth() === idx,
        );
        const total = items.reduce((a, g) => a + Number(g.cantidad), 0);
        const rate = getRateForMonth(usdRates, selectedYear, idx);
        return { total, rate };
      }),
    [gastosAno, usdRates, selectedYear],
  );

  const totalAno = gastosAno.reduce((a, g) => a + Number(g.cantidad), 0);
  const totalAnoUSD = monthlyData.reduce(
    (a, m) => a + (m.rate > 0 ? m.total / m.rate : 0),
    0,
  );
  const monthsWithData = monthlyData.filter((m) => m.total > 0).length;
  const promedio = monthsWithData > 0 ? totalAno / monthsWithData : 0;

  const { maxMonth, minMonth } = useMemo(() => {
    const withData = MONTH_FULL.map((name, idx) => ({
      name,
      total: monthlyData[idx].total,
    })).filter((m) => m.total > 0);

    return {
      maxMonth: withData.reduce((a, b) => (b.total > a.total ? b : a), { name: "—", total: 0 }),
      minMonth: withData.length
        ? withData.reduce((a, b) => (b.total < a.total ? b : a))
        : { name: "—", total: 0 },
    };
  }, [monthlyData]);

  // ── Auth ──────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  if (!user) {
    navigate("/", { replace: true });
    return null;
  }

  const loading = gastosLoading || prevGastosLoading || ratesLoading;

  const kpis = [
    {
      label: `Total ${selectedYear}`,
      value: fmt(totalAno),
      sub: fmtUSD(totalAnoUSD),
      subColor: "var(--positive)" as const,
    },
    {
      label: "Promedio mensual",
      value: fmt(promedio),
      sub: `${monthsWithData} mes${monthsWithData !== 1 ? "es" : ""} con datos`,
      subColor: "var(--ink-3)" as const,
    },
    {
      label: "Mes más caro",
      value: maxMonth.total > 0 ? fmt(maxMonth.total) : "—",
      sub: maxMonth.name,
      valueColor: maxMonth.total > 0 ? "var(--negative)" : "var(--ink-3)",
      subColor: "var(--ink-3)" as const,
    },
    {
      label: "Mes más barato",
      value: minMonth.total > 0 ? fmt(minMonth.total) : "—",
      sub: minMonth.name,
      valueColor: minMonth.total > 0 ? "var(--positive)" : "var(--ink-3)",
      subColor: "var(--ink-3)" as const,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell user={user}>
      {/* ── Header ── */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-5"
        style={{
          height: 56,
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        <BarChart2 className="w-4 h-4 hidden sm:block" style={{ color: "var(--accent)" }} />
        <h1 className="text-sm font-semibold hidden sm:block" style={{ color: "var(--ink)" }}>
          Promedios
        </h1>

        <div className="flex-1" />

        <YearPicker year={selectedYear} onChange={setYear} />
      </header>

      {/* ── KPI grid — flush, same as Gastos ── */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 flex-shrink-0"
        style={{ gap: 1, background: "var(--line)", borderBottom: "1px solid var(--line)" }}
      >
        {kpis.map((k, i) => (
          <div key={i} style={{ background: "var(--surface)", padding: "18px 20px" }}>
            <p
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "var(--ink-3)", marginBottom: 8 }}
            >
              {k.label}
            </p>
            <p
              className="num font-semibold leading-none"
              style={{
                fontSize: 22,
                letterSpacing: "-0.03em",
                color: ("valueColor" in k ? k.valueColor : undefined) ?? "var(--ink)",
                marginBottom: 6,
              }}
            >
              {k.value}
            </p>
            <p className="text-[11px] num" style={{ color: k.subColor }}>
              {k.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Main scrollable ── */}
      <main className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div
            className="flex items-center justify-center h-64 gap-3"
            style={{ color: "var(--ink-2)" }}
          >
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: "var(--accent)" }}
            />
            <span className="text-sm">Cargando {selectedYear}…</span>
          </div>
        ) : (
          <div className="p-4 lg:p-5 space-y-4">
            <Promedios
              gastos={gastos}
              selectedYear={selectedYear}
              usdRates={usdRates}
              prevYearGastos={prevYearGastos}
              prevYear={prevYear}
              activeTab={activeTab}
              onTabChange={setTab}
            />
          </div>
        )}
      </main>
    </AppShell>
  );
}
