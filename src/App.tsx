import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  BarChart2,
  Table2,
  Loader2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import {
  Header,
  GastosTable,
  Charts,
  Landing,
  ImportModal,
} from "@/components";
import { fetchGastosByYear, fetchUsdRates } from "@/api";
import { useAuth } from "@/contexts";
import type { UsdRates } from "@/types";

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];
const MONTH_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DEFAULT_RATE = 1000;

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Mobile-only view toggle (desktop shows both side by side)
  const [mobileView, setMobileView] = useState<"tabla" | "charts">("tabla");
  const [showImport, setShowImport] = useState(false);

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

  // Sync URL — solo cuando autenticado para no pisar el hash de OAuth
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    params.set("year", String(selectedYear));
    params.set("month", String(selectedMonth + 1));
    history.replaceState(null, "", `?${params.toString()}`);
  }, [selectedYear, selectedMonth, user]);

  // ── Queries ───────────────────────────────────────────────────────────────

  const {
    data: gastos = [],
    isLoading: gastosLoading,
    isError: gastosError,
  } = useQuery({
    queryKey: ["gastos", user?.id, selectedYear],
    queryFn: () => fetchGastosByYear(selectedYear),
    enabled: !!user?.id,
  });

  const { data: usdRates = {} as UsdRates, isLoading: ratesLoading } = useQuery({
    queryKey: ["usd_rates", user?.id],
    queryFn: fetchUsdRates,
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
  });

  const loading = gastosLoading || ratesLoading;

  // ── Derived data ──────────────────────────────────────────────────────────

  const currentMonthKey = monthKey(selectedYear, selectedMonth);

  const currentRate = useMemo(() => {
    if (usdRates[currentMonthKey]) return usdRates[currentMonthKey];
    const keys = Object.keys(usdRates).sort();
    const prior = [...keys].reverse().find((k) => k <= currentMonthKey);
    return prior ? usdRates[prior] : DEFAULT_RATE;
  }, [usdRates, currentMonthKey]);

  const gastosDelMes = useMemo(
    () =>
      gastos.filter((g) => {
        const d = new Date(g.fecha + "T12:00:00");
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      }),
    [gastos, selectedYear, selectedMonth],
  );

  const { prevYear, prevMonth: prevMonthIdx } = useMemo(() => {
    if (selectedMonth === 0) return { prevYear: selectedYear - 1, prevMonth: 11 };
    return { prevYear: selectedYear, prevMonth: selectedMonth - 1 };
  }, [selectedYear, selectedMonth]);

  const gastosDelMesAnterior = useMemo(
    () =>
      gastos.filter((g) => {
        const d = new Date(g.fecha + "T12:00:00");
        return d.getFullYear() === prevYear && d.getMonth() === prevMonthIdx;
      }),
    [gastos, prevYear, prevMonthIdx],
  );

  const prevMonthLabel = `${MONTH_NAMES[prevMonthIdx]}${String(prevYear).slice(2)}`;
  const currMonthLabel = `${MONTH_NAMES[selectedMonth]}${String(selectedYear).slice(2)}`;

  const totalMes = gastosDelMes
    .filter((g) => g.concepto !== "Inversiones")
    .reduce((acc, g) => acc + Number(g.cantidad), 0);

  const prevTotalMes = gastosDelMesAnterior
    .filter((g) => g.concepto !== "Inversiones")
    .reduce((acc, g) => acc + Number(g.cantidad), 0);

  const inversionesMes = gastosDelMes
    .filter((g) => g.concepto === "Inversiones")
    .reduce((acc, g) => acc + Number(g.cantidad), 0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleImported = () => {
    queryClient.invalidateQueries({ queryKey: ["gastos", user?.id, selectedYear] });
    setShowImport(false);
  };

  const handleRatesUpdated = (newRates: UsdRates) => {
    queryClient.setQueryData(["usd_rates", user?.id], newRates);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-green-500" />
      </div>
    );
  }

  if (!user) return <Landing />;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin text-green-500" />
          <p className="text-sm">Cargando tus gastos...</p>
        </div>
      </div>
    );
  }

  if (gastosError) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-red-900/30 border border-red-700 rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 font-semibold text-lg mb-2">Error</p>
          <p className="text-gray-400 text-sm">No se pudieron cargar los datos.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["gastos", user?.id] })}
            className="mt-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-4 py-2 text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <Header
        total={totalMes}
        prevTotal={prevTotalMes}
        inversionesTotal={inversionesMes}
        usdRate={currentRate}
        usdRates={usdRates}
        setUsdRates={handleRatesUpdated}
        monthKey={currentMonthKey}
        monthLabel={`${MONTH_FULL[selectedMonth]} ${selectedYear}`}
        isPromedios={false}
        user={user}
        onSignOut={signOut}
      />

      {/* ── Barra de año / meses ── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1.5">

          {/* Selector de año */}
          <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg px-2 py-1.5 mr-1 flex-shrink-0">
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              className="text-gray-400 hover:text-white p-0.5 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-white font-bold text-xs w-9 text-center tabular-nums">
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear((y) => y + 1)}
              className="text-gray-400 hover:text-white p-0.5 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Meses */}
          {MONTH_NAMES.map((name, idx) => {
            const hasData = gastos.some((g) => {
              const d = new Date(g.fecha + "T12:00:00");
              return d.getFullYear() === selectedYear && d.getMonth() === idx;
            });
            const isActive = selectedMonth === idx;
            const isCurrent =
              idx === now.getMonth() && selectedYear === now.getFullYear();

            return (
              <button
                key={idx}
                onClick={() => { setSelectedMonth(idx); setMobileView("tabla"); }}
                className={`flex-shrink-0 relative px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? "bg-green-600 text-white shadow-sm shadow-green-900/50"
                    : hasData
                      ? "text-gray-200 hover:bg-gray-700/80"
                      : "text-gray-600 hover:bg-gray-800"
                }`}
              >
                {name}{String(selectedYear).slice(2)}
                {/* Dot: mes con datos pero no activo */}
                {hasData && !isActive && (
                  <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-green-500" />
                )}
                {/* Ring: mes actual del calendario */}
                {isCurrent && !isActive && (
                  <span className="absolute inset-0 rounded-lg ring-1 ring-green-600/40 pointer-events-none" />
                )}
              </button>
            );
          })}

          <div className="w-px h-5 bg-gray-700/80 mx-0.5 flex-shrink-0" />

          {/* Promedios */}
          <button
            onClick={() => navigate(`/promedios/resumen?year=${selectedYear}`)}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Promedios</span>
          </button>

          <div className="flex-1" />

          {/* Importar */}
          <button
            onClick={() => setShowImport(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar</span>
          </button>
        </div>
      </div>

      {/* ── Mobile tab switcher (solo en pantallas pequeñas) ── */}
      <div className="lg:hidden bg-gray-900/60 border-b border-gray-800/60 px-4 flex-shrink-0">
        <div className="flex gap-1 max-w-screen-2xl mx-auto">
          <button
            onClick={() => setMobileView("tabla")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              mobileView === "tabla"
                ? "border-green-500 text-green-400"
                : "border-transparent text-gray-500 hover:text-white"
            }`}
          >
            <Table2 className="w-4 h-4" />
            Tabla
          </button>
          <button
            onClick={() => setMobileView("charts")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              mobileView === "charts"
                ? "border-green-500 text-green-400"
                : "border-transparent text-gray-500 hover:text-white"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Gráficos
          </button>
        </div>
      </div>

      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImported={handleImported} />
      )}

      {/* ── Contenido principal ── */}
      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* Tabla — siempre visible en desktop, condicional en mobile */}
        <div className={`flex-1 overflow-auto min-w-0 p-4 lg:p-6 ${mobileView === "charts" ? "hidden lg:flex lg:flex-col" : "flex flex-col"}`}>
          <GastosTable
            gastos={gastosDelMes}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
        </div>

        {/* Charts — sidebar en desktop, tab en mobile */}
        <aside className={`
          lg:w-80 xl:w-96 flex-shrink-0
          border-l border-gray-800
          overflow-y-auto scrollbar-thin
          bg-gray-900/20
          ${mobileView === "charts" ? "flex-1 flex flex-col" : "hidden lg:block"}
        `}>
          <div className="p-4">
            <Charts
              gastos={gastosDelMes}
              prevGastos={gastosDelMesAnterior}
              monthLabel={currMonthLabel}
              prevMonthLabel={prevMonthLabel}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
