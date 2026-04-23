import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Promedios, AppShell } from "@/components";
import { fetchGastosByYear, fetchUsdRates } from "@/api";
import { useAuth } from "@/contexts";
import { useYearParam } from "@/hooks";
import type { UsdRates, PromediosTab } from "@/types";

const VALID_TABS: PromediosTab[] = ['resumen', 'meses', 'categorias', 'comparacion'];

export default function PromediosPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tab: tabParam } = useParams<{ tab: string }>();

  const activeTab: PromediosTab = VALID_TABS.includes(tabParam as PromediosTab)
    ? (tabParam as PromediosTab)
    : 'resumen';

  const setTab = (tab: PromediosTab) => {
    navigate(`/promedios/${tab}?${searchParams.toString()}`, { replace: true });
  };

  // ── Año desde la URL, default al año actual ──────────────────────────────

  const { selectedYear, setYear } = useYearParam();

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
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
    <AppShell user={user}>
      {/* Barra superior */}
      <div
        className="sticky top-0 z-10"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="max-w-screen-2xl mx-auto flex items-center gap-4 px-4 py-3">
          <h1 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Promedios anuales</h1>

          {/* Selector de año */}
          <div
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 ml-auto"
            style={{ background: 'var(--surface-alt)' }}
          >
            <button
              onClick={() => setYear(selectedYear - 1)}
              className="p-0.5 transition-colors"
              style={{ color: 'var(--ink-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold text-sm w-12 text-center num" style={{ color: 'var(--ink)' }}>
              {selectedYear}
            </span>
            <button
              onClick={() => setYear(selectedYear + 1)}
              className="p-0.5 transition-colors"
              style={{ color: 'var(--ink-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
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
            <div className="flex items-center justify-center h-64 gap-3" style={{ color: 'var(--ink-2)' }}>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
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
    </AppShell>
  );
}
