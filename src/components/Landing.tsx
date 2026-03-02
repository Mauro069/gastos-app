import { useState, useMemo, useRef } from "react";
import {
  BarChart2,
  Table2,
  TrendingUp,
  DollarSign,
  ArrowLeft,
  Download,
  Upload,
  X,
  AlertCircle,
} from "lucide-react";
import Header from "./Header";
import GastosTable from "./GastosTable";
import Charts from "./Charts";
import Promedios from "./Promedios";
import Login from "./Login";
import { demoGastos, demoUsdRates, demoPrevYearGastos } from "@/data";
import { useAuth } from "@/contexts";
import { parseCsv, parseXlsx } from "@/utils/csvImport";
import type { Gasto } from "@/types/gasto";

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];
const MONTH_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DEFAULT_RATE = 1000;
const monthKey = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}`;

interface ImportedData {
  gastos: Gasto[];
  filename: string;
  errors: number;
  total: number;
}

export default function Landing() {
  const { signInWithGoogle } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<"tabla" | "charts" | "promedios">("tabla");
  const [promediosTab, setPromediosTab] = useState<
    "resumen" | "meses" | "categorias" | "comparacion"
  >("resumen");
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Data source ──────────────────────────────────────────────────────────
  const isImported = importedData !== null;
  const allGastos: Gasto[] = isImported ? importedData.gastos : demoGastos;
  // When using imported data, skip USD rate conversion (fixed fallback)
  const usdRates = isImported ? {} : demoUsdRates;

  // Detect available years from imported data; demo always has selectedYear
  const availableYears = useMemo(() => {
    if (!isImported) return [2026];
    const years = [
      ...new Set(
        allGastos.map((g) => new Date(g.fecha + "T12:00:00").getFullYear())
      ),
    ].sort();
    return years.length ? years : [new Date().getFullYear()];
  }, [allGastos, isImported]);

  // prevYear gastos: from same imported set (year - 1), or demo set
  const prevYearGastos = useMemo(() => {
    if (!isImported) return demoPrevYearGastos;
    return allGastos.filter(
      (g) => new Date(g.fecha + "T12:00:00").getFullYear() === selectedYear - 1
    );
  }, [allGastos, isImported, selectedYear]);

  const currentMonthKey = monthKey(selectedYear, selectedMonth);
  const currentRate = useMemo(() => {
    if (usdRates[currentMonthKey]) return usdRates[currentMonthKey];
    const keys = Object.keys(usdRates).sort();
    const prior = [...keys].reverse().find((k) => k <= currentMonthKey);
    return prior ? usdRates[prior] : DEFAULT_RATE;
  }, [usdRates, currentMonthKey]);

  const gastos = useMemo(
    () =>
      allGastos.filter(
        (g) => new Date(g.fecha + "T12:00:00").getFullYear() === selectedYear
      ),
    [allGastos, selectedYear]
  );

  const gastosDelMes = useMemo(() => {
    return gastos.filter((g) => {
      const d = new Date(g.fecha + "T12:00:00");
      return d.getMonth() === selectedMonth;
    });
  }, [gastos, selectedMonth]);

  const { prevYear, prevMonth: prevMonthIdx } = useMemo(() => {
    if (selectedMonth === 0)
      return { prevYear: selectedYear - 1, prevMonth: 11 };
    return { prevYear: selectedYear, prevMonth: selectedMonth - 1 };
  }, [selectedYear, selectedMonth]);

  const gastosDelMesAnterior = useMemo(() => {
    return allGastos.filter((g) => {
      const d = new Date(g.fecha + "T12:00:00");
      return d.getFullYear() === prevYear && d.getMonth() === prevMonthIdx;
    });
  }, [allGastos, prevYear, prevMonthIdx]);

  const prevMonthLabel = `${MONTH_NAMES[prevMonthIdx]}${String(prevYear).slice(2)}`;
  const currMonthLabel = `${MONTH_NAMES[selectedMonth]}${String(selectedYear).slice(2)}`;

  const totalMes = gastosDelMes
    .filter((g) => g.concepto !== "Inversiones")
    .reduce((acc, g) => acc + Number(g.cantidad), 0);

  const totalAno = useMemo(
    () =>
      gastos
        .filter((g) => g.concepto !== "Inversiones")
        .reduce((a, g) => a + Number(g.cantidad), 0),
    [gastos]
  );

  const isPromedios = activeTab === "promedios";

  // ── File Import ───────────────────────────────────────────────────────────
  function applyResult(result: ReturnType<typeof parseCsv>, filename: string) {
    if (result.gastos.length === 0) {
      setImportError(
        "No se pudieron importar datos. Revisá que el archivo tenga las columnas: fecha, concepto, cantidad, forma."
      );
      return;
    }
    const years = [
      ...new Set(
        result.gastos.map((g) => new Date(g.fecha + "T12:00:00").getFullYear())
      ),
    ].sort();
    setSelectedYear(years[years.length - 1]);
    setSelectedMonth(0);
    setActiveTab("tabla");
    setImportedData({ gastos: result.gastos, filename, errors: result.errors, total: result.total });
  }

  function handleFile(file: File) {
    setImportError(null);
    const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const isCsv  = file.name.endsWith(".csv");
    if (!isXlsx && !isCsv) {
      setImportError("El archivo debe ser un Excel (.xlsx) o CSV (.csv)");
      return;
    }
    const reader = new FileReader();
    if (isXlsx) {
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        applyResult(parseXlsx(buffer), file.name);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        applyResult(parseCsv(e.target?.result as string), file.name);
      };
      reader.readAsText(file, "UTF-8");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function clearImport() {
    setImportedData(null);
    setImportError(null);
    setSelectedYear(2026);
    setSelectedMonth(0);
  }

  // ── Login overlay ─────────────────────────────────────────────────────────
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <div className="p-4">
          <button
            onClick={() => setShowLogin(false)}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la demo
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Login />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-gray-950 flex flex-col"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm border-2 border-dashed border-green-500 pointer-events-none">
          <div className="text-center">
            <Upload className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-white text-lg font-semibold">Soltá tu CSV acá</p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 px-6 py-10">
        <div className="max-w-screen-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500 mb-4 shadow-lg shadow-green-500/20">
            <DollarSign className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Gastos App
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto mb-6">
            Controlá tus gastos personales por mes, categorías y forma de pago.
            Gráficos, promedios anuales, gastos recurrentes y tipo de cambio USD.
          </p>

          <button
            onClick={signInWithGoogle}
            className="bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-xl py-3 px-6 inline-flex items-center gap-2 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Entrar con Google
          </button>

          {/* Import row */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/plantilla-gastos.xlsx"
              download
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border border-gray-700"
            >
              <Download className="w-4 h-4" />
              Descargar plantilla Excel
            </a>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-green-700 hover:bg-green-600 text-white transition-colors"
            >
              <Upload className="w-4 h-4" />
              Subir mis datos
            </button>
          </div>

          {/* Try with your data hint */}
          <p className="text-gray-500 text-xs mt-3">
            Descargá la plantilla, completala con tus gastos y subila para ver tus propios gráficos y promedios.
            <span className="text-gray-600"> Los datos no se almacenan y el acceso es gratuito.</span>
          </p>

          {/* Import error */}
          {importError && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-red-950 text-red-400 border border-red-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {importError}
            </div>
          )}
        </div>
      </section>

      {/* ── Import banner ─────────────────────────────────────────────────── */}
      {isImported && importedData && (
        <div className="bg-green-950/60 border-b border-green-800/50 px-4 py-2.5">
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-green-300 min-w-0">
              <Upload className="w-4 h-4 flex-shrink-0 text-green-400" />
              <span className="truncate font-medium">{importedData.filename}</span>
              <span className="text-green-500 flex-shrink-0">
                · {importedData.gastos.length} gastos importados
                {importedData.errors > 0 && (
                  <span className="text-yellow-500 ml-1">
                    ({importedData.errors} con error)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowLogin(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white font-medium transition-colors"
              >
                Registrate para guardarlos
              </button>
              <button
                onClick={clearImport}
                className="p-1.5 rounded-lg text-green-500 hover:text-white hover:bg-green-800 transition-colors"
                title="Volver al demo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <Header
        total={isPromedios ? totalAno : totalMes}
        usdRate={currentRate}
        usdRates={usdRates}
        setUsdRates={() => {}}
        monthKey={currentMonthKey}
        monthLabel={
          isPromedios
            ? `Año ${selectedYear}`
            : `${MONTH_FULL[selectedMonth]} ${selectedYear}`
        }
        isPromedios={isPromedios}
        user={null}
        demo
        onSignIn={() => setShowLogin(true)}
      />

      {/* ── Month / year nav ───────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-2 overflow-x-auto py-1">
          {/* Year selector */}
          {availableYears.length > 1 ? (
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-1 py-1 mr-2 flex-shrink-0">
              {availableYears.map((y) => (
                <button
                  key={y}
                  onClick={() => { setSelectedYear(y); setSelectedMonth(0); }}
                  className={`px-2 py-0.5 rounded text-sm font-bold transition-colors ${
                    selectedYear === y
                      ? "bg-gray-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1.5 mr-2 flex-shrink-0">
              <span className="text-white font-bold text-sm w-10 text-center">
                {selectedYear}
              </span>
            </div>
          )}

          {MONTH_NAMES.map((name, idx) => {
            const hasData = allGastos.some((g) => {
              const d = new Date(g.fecha + "T12:00:00");
              return d.getFullYear() === selectedYear && d.getMonth() === idx;
            });
            const isActive = !isPromedios && selectedMonth === idx;
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedMonth(idx);
                  setActiveTab("tabla");
                }}
                className={`flex-shrink-0 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? "bg-green-600 text-white"
                    : hasData
                      ? "text-gray-200 hover:bg-gray-700"
                      : "text-gray-600"
                }`}
              >
                {name}
                {String(selectedYear).slice(2)}
                {hasData && !isActive && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500 inline-block align-middle" />
                )}
              </button>
            );
          })}

          <div className="w-px h-6 bg-gray-700 mx-1 flex-shrink-0" />
          <button
            onClick={() => setActiveTab("promedios")}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              isPromedios
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Promedios
          </button>
        </div>
      </div>

      {!isPromedios && (
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-6">
          <div className="max-w-screen-2xl mx-auto flex gap-1">
            <button
              onClick={() => setActiveTab("tabla")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "tabla"
                  ? "border-green-500 text-green-400"
                  : "border-transparent text-gray-500 hover:text-white"
              }`}
            >
              <Table2 className="w-4 h-4" />
              Tabla
            </button>
            <button
              onClick={() => setActiveTab("charts")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "charts"
                  ? "border-green-500 text-green-400"
                  : "border-transparent text-gray-500 hover:text-white"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Gráficos
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden">
        <div className="max-w-screen-2xl mx-auto h-full p-6">
          {isPromedios ? (
            <div
              className="overflow-y-auto scrollbar-thin"
              style={{ maxHeight: "calc(100vh - 280px)" }}
            >
              <Promedios
                gastos={gastos}
                selectedYear={selectedYear}
                usdRates={usdRates}
                prevYearGastos={prevYearGastos}
                prevYear={selectedYear - 1}
                activeTab={promediosTab}
                onTabChange={setPromediosTab}
              />
            </div>
          ) : activeTab === "tabla" ? (
            <div
              className="flex flex-col"
              style={{ minHeight: "calc(100vh - 320px)" }}
            >
              <GastosTable
                gastos={gastosDelMes}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                demo
              />
            </div>
          ) : (
            <div
              className="overflow-y-auto scrollbar-thin"
              style={{ maxHeight: "calc(100vh - 320px)" }}
            >
              <Charts
                gastos={gastosDelMes}
                prevGastos={gastosDelMesAnterior}
                monthLabel={currMonthLabel}
                prevMonthLabel={prevMonthLabel}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
