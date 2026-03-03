import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Loader2, CalendarRange, ChevronDown, ChevronUp,
  Pencil, Trash2, Search, X,
} from "lucide-react";
import { fetchGastosByRange, deleteGasto, updateGasto } from "@/api";
import { useAuth } from "@/contexts";
import { useUserSettings } from "@/contexts";
import { GastoModal } from "@/components";
import { getChipStyle } from "@/utils/chipColor";
import type { Gasto, UserSettings } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MONTH_FULL  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const fmtArs = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const fmtDay = (fecha: string) => {
  const d = new Date(fecha + "T12:00:00");
  return d.getDate();
};
const fmtDayOfWeek = (fecha: string) => {
  const d = new Date(fecha + "T12:00:00");
  return ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][d.getDay()];
};

function lastDayOfMonth(year: number, month: number): string {
  return new Date(year, month + 1, 0).toISOString().split("T")[0];
}

// ── MultiSelectFilter ────────────────────────────────────────────────────────

function MultiSelectFilter({
  placeholder, options, selected, onChange,
}: {
  placeholder: string;
  options: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (opt: string) => {
    const next = new Set(selected);
    next.has(opt) ? next.delete(opt) : next.add(opt);
    onChange(next);
  };

  const label =
    selected.size === 0
      ? placeholder
      : selected.size === 1
        ? [...selected][0]
        : `${selected.size} selec.`;

  const isActive = selected.size > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-colors whitespace-nowrap ${
          isActive
            ? "bg-green-900/40 border border-green-600 text-green-300"
            : "bg-gray-800 border border-gray-700 text-white hover:border-gray-600"
        }`}
      >
        <span>{label}</span>
        {isActive && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(new Set()); }}
            className="text-green-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-30 min-w-[180px] py-1 max-h-64 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-700 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => toggle(opt)}
                className="w-3.5 h-3.5 rounded accent-green-500 cursor-pointer"
              />
              <span className="text-sm text-gray-200">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Month picker ──────────────────────────────────────────────────────────────

function MonthPicker({
  year, month, onChange, label, min, max,
}: {
  year: number; month: number;
  onChange: (year: number, month: number) => void;
  label: string;
  min?: { year: number; month: number };
  max?: { year: number; month: number };
}) {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = 2020; y <= currentYear + 1; y++) years.push(y);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        <select
          value={month}
          onChange={(e) => onChange(year, parseInt(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {MONTH_FULL.map((name, i) => {
            const disabled =
              (min && (year < min.year || (year === min.year && i < min.month))) ||
              (max && (year > max.year || (year === max.year && i > max.month)));
            return (
              <option key={i} value={i} disabled={!!disabled}>{name}</option>
            );
          })}
        </select>
        <select
          value={year}
          onChange={(e) => onChange(parseInt(e.target.value), month)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Day group row ─────────────────────────────────────────────────────────────

function DayGroup({
  fecha,
  gastos,
  settings,
  onEdit,
  onDelete,
  deletingId,
  confirmDeleteId,
  onConfirmDelete,
  onCancelDelete,
}: {
  fecha: string;
  gastos: Gasto[];
  settings: Pick<UserSettings, "formaColors" | "conceptoColors">;
  onEdit: (g: Gasto) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  confirmDeleteId: string | null;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  const dayTotal = gastos
    .filter((g) => g.concepto !== "Inversiones")
    .reduce((a, g) => a + Number(g.cantidad), 0);

  return (
    <>
      {/* Day header */}
      <tr className="bg-gray-800/40">
        <td colSpan={5} className="px-4 py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-semibold text-xs tabular-nums">
              {fmtDayOfWeek(fecha)} {fmtDay(fecha)}
            </span>
            <span className="text-gray-600 text-xs tabular-nums">{fmtArs(dayTotal)}</span>
          </div>
        </td>
      </tr>
      {/* Gastos rows */}
      {gastos.map((g) => {
        const isConfirming = confirmDeleteId === g.id;
        const isDeleting = deletingId === g.id;
        return (
          <tr
            key={g.id}
            className={`border-b border-gray-800/40 transition-colors ${isConfirming ? "bg-red-950/20" : "hover:bg-gray-800/20"}`}
          >
            <td className="pl-8 pr-3 py-2.5">
              <span
                className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                style={getChipStyle(g.forma, "forma", settings)}
              >
                {g.forma}
              </span>
            </td>
            <td className="px-3 py-2.5">
              <span
                className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                style={getChipStyle(g.concepto, "concepto", settings)}
              >
                {g.concepto}
              </span>
            </td>
            <td className="px-3 py-2.5 text-white text-sm font-semibold tabular-nums text-right">
              {fmtArs(Number(g.cantidad))}
            </td>
            <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[180px] truncate">
              {g.nota}
            </td>
            <td className="px-4 py-2.5">
              {isConfirming ? (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onDelete(g.id)}
                    disabled={isDeleting}
                    className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                    Eliminar
                  </button>
                  <button
                    onClick={onCancelDelete}
                    className="px-2 py-1 rounded-lg text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(g)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-gray-700 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onConfirmDelete(g.id)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RangePage() {
  const { user, loading: authLoading } = useAuth();
  const { settings } = useUserSettings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Date range state (default: 3 months back → today) ─────────────────────
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const [fromYear, setFromYear] = useState(defaultFrom.getFullYear());
  const [fromMonth, setFromMonth] = useState(defaultFrom.getMonth());
  const [toYear, setToYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth());

  // ── UI state ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [selectedFormas, setSelectedFormas] = useState<Set<string>>(new Set());
  const [selectedConceptos, setSelectedConceptos] = useState<Set<string>>(new Set());
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Range strings ─────────────────────────────────────────────────────────
  const fromDate = `${fromYear}-${String(fromMonth + 1).padStart(2, "0")}-01`;
  const toDate = lastDayOfMonth(toYear, toMonth);

  // Clamp: from must not exceed to
  const fromIsAfterTo =
    fromYear > toYear || (fromYear === toYear && fromMonth > toMonth);

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: gastos = [], isLoading } = useQuery({
    queryKey: ["gastos_range", user?.id, fromDate, toDate],
    queryFn: () => fetchGastosByRange(fromDate, toDate),
    enabled: !!user && !fromIsAfterTo,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["gastos_range", user?.id] });

  const deleteMut = useMutation({
    mutationFn: deleteGasto,
    onSuccess: invalidate,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Gasto }) => updateGasto(id, data),
    onSuccess: () => {
      invalidate();
      // Also invalidate main gastos cache
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
    },
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await deleteMut.mutateAsync(id);
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveEdit = async (form: Omit<Gasto, "id" | "user_id" | "created_at">) => {
    if (!editingGasto) return;
    await updateMut.mutateAsync({ id: editingGasto.id, data: { ...editingGasto, ...form } });
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return gastos.filter((g) => {
      if (selectedFormas.size > 0 && !selectedFormas.has(g.forma)) return false;
      if (selectedConceptos.size > 0 && !selectedConceptos.has(g.concepto)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          g.concepto?.toLowerCase().includes(q) ||
          g.forma?.toLowerCase().includes(q) ||
          g.nota?.toLowerCase().includes(q) ||
          String(g.cantidad).includes(q)
        );
      }
      return true;
    });
  }, [gastos, search, selectedFormas, selectedConceptos]);

  // ── Group by month → day ──────────────────────────────────────────────────
  const byMonth = useMemo(() => {
    const map = new Map<string, Map<string, Gasto[]>>();
    for (const g of filtered) {
      const mk = g.fecha.slice(0, 7);
      if (!map.has(mk)) map.set(mk, new Map());
      const dayMap = map.get(mk)!;
      if (!dayMap.has(g.fecha)) dayMap.set(g.fecha, []);
      dayMap.get(g.fecha)!.push(g);
    }
    // Sort months descending, days descending within each month
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mk, dayMap]) => ({
        mk,
        days: [...dayMap.entries()].sort(([a], [b]) => b.localeCompare(a)),
      }));
  }, [filtered]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalRange = useMemo(
    () =>
      filtered
        .filter((g) => g.concepto !== "Inversiones")
        .reduce((a, g) => a + Number(g.cantidad), 0),
    [filtered],
  );

  const monthTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of filtered) {
      if (g.concepto === "Inversiones") continue;
      const mk = g.fecha.slice(0, 7);
      map[mk] = (map[mk] ?? 0) + Number(g.cantidad);
    }
    return map;
  }, [filtered]);

  const toggleMonth = (mk: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(mk)) next.delete(mk);
      else next.add(mk);
      return next;
    });
  };

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (authLoading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-400" />
      </div>
    );
  if (!user) { navigate("/", { replace: true }); return null; }

  const rangeLabel =
    fromYear === toYear && fromMonth === toMonth
      ? `${MONTH_FULL[fromMonth]} ${fromYear}`
      : `${MONTH_NAMES[fromMonth]} ${fromYear} → ${MONTH_NAMES[toMonth]} ${toYear}`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Top bar ── */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto flex items-center gap-4 px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="w-px h-5 bg-gray-700" />
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-green-400" />
            <h1 className="text-sm font-semibold text-white">Historial</h1>
          </div>
        </div>
      </div>

      {/* ── Filters bar ── */}
      <div className="bg-gray-900/60 border-b border-gray-800/60 sticky top-[52px] z-10">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex flex-wrap items-end gap-4">
          {/* Range pickers */}
          <MonthPicker
            label="Desde"
            year={fromYear}
            month={fromMonth}
            onChange={(y, m) => { setFromYear(y); setFromMonth(m); }}
            max={{ year: toYear, month: toMonth }}
          />
          <MonthPicker
            label="Hasta"
            year={toYear}
            month={toMonth}
            onChange={(y, m) => { setToYear(y); setToMonth(m); }}
            min={{ year: fromYear, month: fromMonth }}
          />

          {/* Divider */}
          <div className="w-px h-8 bg-gray-700 hidden sm:block" />

          {/* Forma filter */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Forma</span>
            <MultiSelectFilter
              placeholder="Todas"
              options={settings.formas}
              selected={selectedFormas}
              onChange={setSelectedFormas}
            />
          </div>

          {/* Concepto filter */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Concepto</span>
            <MultiSelectFilter
              placeholder="Todos"
              options={settings.conceptos}
              selected={selectedConceptos}
              onChange={setSelectedConceptos}
            />
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-700 hidden sm:block" />

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-8 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Summary */}
          <div className="ml-auto text-right">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{rangeLabel}</p>
            <p className="text-lg font-bold tabular-nums text-white">{fmtArs(totalRange)}</p>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 overflow-auto scrollbar-thin">
        <div className="max-w-screen-xl mx-auto p-4 lg:p-6">
          {fromIsAfterTo ? (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
              El inicio no puede ser posterior al fin del rango.
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-40 gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin text-green-400" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : byMonth.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-600 gap-2">
              <CalendarRange className="w-8 h-8" />
              <p className="text-sm">
                {search || selectedFormas.size > 0 || selectedConceptos.size > 0
                  ? "Sin resultados para los filtros aplicados"
                  : "No hay gastos en este período"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {byMonth.map(({ mk, days }) => {
                const [y, m] = mk.split("-").map(Number);
                const collapsed = collapsedMonths.has(mk);
                const monthTotal = monthTotals[mk] ?? 0;
                const count = days.reduce((a, [, gs]) => a + gs.length, 0);

                return (
                  <div key={mk} className="bg-gray-900 ring-1 ring-gray-800 rounded-2xl overflow-hidden">
                    {/* Month header */}
                    <button
                      onClick={() => toggleMonth(mk)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">
                          {MONTH_FULL[m - 1]} {y}
                        </span>
                        <span className="text-xs text-gray-500 tabular-nums">
                          {count} {count === 1 ? "gasto" : "gastos"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums text-green-300">
                          {fmtArs(monthTotal)}
                        </span>
                        {collapsed ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </button>

                    {/* Month body */}
                    {!collapsed && (
                      <div className="border-t border-gray-800">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-800/60 bg-gray-900/60">
                              <th className="pl-8 pr-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Forma</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nota</th>
                              <th className="px-4 py-2 w-20" />
                            </tr>
                          </thead>
                          <tbody>
                            {days.map(([fecha, dayGastos]) => (
                              <DayGroup
                                key={fecha}
                                fecha={fecha}
                                gastos={dayGastos}
                                settings={settings}
                                onEdit={(g) => { setEditingGasto(g); setShowModal(true); }}
                                onDelete={handleDelete}
                                deletingId={deletingId}
                                confirmDeleteId={confirmDeleteId}
                                onConfirmDelete={setConfirmDeleteId}
                                onCancelDelete={() => setConfirmDeleteId(null)}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Edit modal ── */}
      {showModal && editingGasto && (
        <GastoModal
          gasto={editingGasto}
          onClose={() => { setShowModal(false); setEditingGasto(null); }}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
