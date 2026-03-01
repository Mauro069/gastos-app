import { useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { Promedios } from "@/components";
import { fetchGastosByYear, fetchUsdRates } from "@/api";
import { useAuth } from "@/contexts";
import type { UsdRates, PromediosTab } from "@/types";

const VALID_TABS: PromediosTab[] = ['resumen', 'meses', 'categorias', 'comparacion'];

export default function PromediosPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tab: tabParam } = useParams<{ tab: string }>();

  const activeTab: PromediosTab = VALID_TABS.includes(tabParam as PromediosTab)
    ? (tabParam as PromediosTab)
    : 'resumen';

  const setTab = (tab: PromediosTab) => {
    navigate(`/promedios/${tab}?${searchParams.toString()}`, { replace: true });
  };

  // ── Año desde la URL, default al año actual ──────────────────────────────

  const selectedYear = useMemo(() => {
    const y = parseInt(searchParams.get("year") ?? "");
    return isNaN(y) ? new Date().getFullYear() : y;
  }, [searchParams]);

  const setYear = (year: number) => {
    setSearchParams({ year: String(year) }, { replace: true });
  };

  // ── Queries (comparten cache con App via mismo queryKey) ─────────────────

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

  // ── Auth ─────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!user) {
    navigate("/", { replace: true });
    return null;
  }

  const loading = gastosLoading || prevGastosLoading || ratesLoading;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Barra superior */}
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

          <h1 className="text-sm font-semibold text-white">Promedios anuales</h1>

          {/* Selector de año */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1.5 ml-auto">
            <button
              onClick={() => setYear(selectedYear - 1)}
              className="text-gray-400 hover:text-white p-0.5 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-white font-bold text-sm w-12 text-center">
              {selectedYear}
            </span>
            <button
              onClick={() => setYear(selectedYear + 1)}
              className="text-gray-400 hover:text-white p-0.5 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <main className="flex-1 overflow-auto scrollbar-thin">
        <div className="max-w-screen-2xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-green-500" />
              <span className="text-sm">Cargando datos de {selectedYear}...</span>
            </div>
          ) : (
            <Promedios
              gastos={gastos}
              selectedYear={selectedYear}
              usdRates={usdRates}
              prevYearGastos={prevYearGastos}
              prevYear={prevYear}
              activeTab={activeTab}
              onTabChange={setTab}
            />
          )}
        </div>
      </main>
    </div>
  );
}
