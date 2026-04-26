import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, CalendarRange, ChevronDown, ChevronUp,
  Pencil, Trash2, Search, X, RefreshCw,
} from "lucide-react";
import { fetchGastosByRange, deleteGasto, updateGasto } from "@/api";
import { useAuth } from "@/contexts";
import { useUserSettings } from "@/contexts";
import { AppShell, GastoModal } from "@/components";
import { getChipHex } from "@/utils/chipColor";
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

import { Check } from "lucide-react";

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

  const isActive = selected.size > 0;
  const label =
    selected.size === 0
      ? placeholder
      : selected.size === 1
        ? [...selected][0]
        : `${placeholder} · ${selected.size}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
        style={{
          background: isActive ? 'var(--accent-soft)' : 'var(--surface)',
          color: isActive ? 'var(--accent)' : 'var(--ink-2)',
          border: `1px solid ${isActive ? 'var(--accent)' : 'var(--line)'}`,
          cursor: 'pointer',
        }}
      >
        <span>{label}</span>
        {isActive ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(new Set()); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', padding: 0 }}
          >
            <X size={11} />
          </button>
        ) : (
          <ChevronDown
            size={11}
            style={{
              color: 'var(--ink-3)',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s',
            }}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 left-0 rounded-xl shadow-xl z-30 overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', minWidth: 180 }}
        >
          {options.map((opt) => {
            const isSel = selected.has(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors"
                style={{
                  background: isSel ? 'var(--accent-soft)' : 'transparent',
                  color: isSel ? 'var(--accent)' : 'var(--ink-2)',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--line)',
                }}
                onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--surface-alt)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isSel ? 'var(--accent-soft)' : 'transparent'; }}
              >
                <span
                  className="flex-shrink-0 flex items-center justify-center rounded"
                  style={{
                    width: 14, height: 14,
                    background: isSel ? 'var(--accent)' : 'var(--surface-alt)',
                    border: isSel ? 'none' : '1px solid var(--line)',
                  }}
                >
                  {isSel && <Check size={9} style={{ color: 'var(--accent-ink)', strokeWidth: 3 }} />}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
          {isActive && (
            <button
              type="button"
              onClick={() => { onChange(new Set()); setOpen(false); }}
              className="w-full text-center py-2 text-xs transition-colors"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-3)')}
            >
              Limpiar filtro
            </button>
          )}
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

  const selectStyle: React.CSSProperties = {
    background: 'var(--surface-alt)',
    border: '1px solid var(--line)',
    borderRadius: 8,
    padding: '6px 8px',
    color: 'var(--ink)',
    fontSize: 14,
    outline: 'none',
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>{label}</span>
      <div className="flex items-center gap-1.5">
        <select
          value={month}
          onChange={(e) => onChange(year, parseInt(e.target.value))}
          style={selectStyle}
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
          style={selectStyle}
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Grid columns shared between header and rows ────────────────────────────
const GRID_COLS = "130px 130px 110px 1fr 84px";

// ── Day group ──────────────────────────────────────────────────────────────────

function DayGroup({
  fecha,
  gastos,
  settings,
  onEdit,
  onDelete,
  onToggleFijo,
  deletingId,
  confirmDeleteId,
  togglingFijoId,
  onConfirmDelete,
  onCancelDelete,
}: {
  fecha: string;
  gastos: Gasto[];
  settings: Pick<UserSettings, "formaColors" | "conceptoColors">;
  onEdit: (g: Gasto) => void;
  onDelete: (id: string) => void;
  onToggleFijo: (g: Gasto) => void;
  deletingId: string | null;
  confirmDeleteId: string | null;
  togglingFijoId: string | null;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  const dayTotal = gastos
    .filter((g) => g.concepto !== "Inversiones")
    .reduce((a, g) => a + Number(g.cantidad), 0);

  return (
    <>
      {/* Day header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--line)" }}
      >
        <span className="num text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>
          {fmtDayOfWeek(fecha)} {fmtDay(fecha)}
        </span>
        <span className="num text-[10px]" style={{ color: "var(--ink-3)" }}>{fmtArs(dayTotal)}</span>
      </div>

      {/* Rows */}
      {gastos.map((g) => {
        const isConfirming = confirmDeleteId === g.id;
        const isDeleting = deletingId === g.id;
        const formaColor = getChipHex(g.forma, "forma", settings);
        const conceptoColor = getChipHex(g.concepto, "concepto", settings);

        return (
          <div
            key={g.id}
            className="group grid items-center px-4 py-3 transition-colors"
            style={{
              gridTemplateColumns: GRID_COLS,
              borderBottom: "1px solid var(--line)",
              background: isConfirming ? "var(--neg-soft)" : "transparent",
            }}
            onMouseEnter={(e) => { if (!isConfirming) (e.currentTarget as HTMLElement).style.background = "var(--surface-alt)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isConfirming ? "var(--neg-soft)" : "transparent"; }}
          >
            {/* Forma — muted tag */}
            <div className="flex items-center min-w-0">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium truncate max-w-[120px]"
                style={{
                  background: `${formaColor}18`,
                  color: formaColor,
                  border: `1px solid ${formaColor}30`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: formaColor }} />
                {g.forma}
              </span>
            </div>

            {/* Concepto — muted tag */}
            <div className="flex items-center min-w-0">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium truncate max-w-[120px]"
                style={{
                  background: `${conceptoColor}18`,
                  color: conceptoColor,
                  border: `1px solid ${conceptoColor}30`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: conceptoColor }} />
                {g.concepto}
              </span>
            </div>

            {/* Monto */}
            <span className="num text-sm font-semibold text-right" style={{ color: "var(--ink)" }}>
              {fmtArs(Number(g.cantidad))}
            </span>

            {/* Nota */}
            <div className="flex items-center gap-2 px-3 min-w-0">
              <span className="text-xs truncate" style={{ color: g.nota ? "var(--ink-2)" : "var(--ink-3)" }}>
                {g.nota || "—"}
              </span>
              {g.fijo && (
                <span
                  className="flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider"
                  style={{
                    background: "rgba(184,208,107,0.12)",
                    color: "var(--accent)",
                    border: "1px solid rgba(184,208,107,0.3)",
                  }}
                >
                  Fijo
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-0.5">
              {isConfirming ? (
                <>
                  <button
                    onClick={() => onDelete(g.id)}
                    disabled={isDeleting}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ background: "var(--negative)", color: "#fff", border: "none", cursor: "pointer" }}
                  >
                    {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                    Eliminar
                  </button>
                  <button
                    onClick={onCancelDelete}
                    className="px-2 py-1 rounded-lg text-xs"
                    style={{ background: "var(--surface-alt)", color: "var(--ink-2)", border: "none", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onToggleFijo(g)}
                    title={g.fijo ? "Marcar como variable" : "Marcar como fijo"}
                    disabled={togglingFijoId === g.id}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: g.fijo ? "rgba(184,208,107,0.12)" : "transparent",
                      border: "none",
                      cursor: togglingFijoId === g.id ? "default" : "pointer",
                      color: g.fijo ? "var(--accent)" : "var(--ink-3)",
                    }}
                    onMouseEnter={(e) => {
                      if (togglingFijoId === g.id) return;
                      e.currentTarget.style.color = "var(--accent)";
                      e.currentTarget.style.background = "rgba(184,208,107,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      if (togglingFijoId === g.id) return;
                      e.currentTarget.style.color = g.fijo ? "var(--accent)" : "var(--ink-3)";
                      e.currentTarget.style.background = g.fijo ? "rgba(184,208,107,0.12)" : "transparent";
                    }}
                  >
                    {togglingFijoId === g.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <RefreshCw size={13} />
                    }
                  </button>
                  <button
                    onClick={() => onEdit(g)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--ink-3)", background: "transparent", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-3)")}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => onConfirmDelete(g.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--ink-3)", background: "transparent", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--negative)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-3)")}
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
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
  const [tipoFilter, setTipoFilter] = useState<"todos" | "fijos" | "variables">("todos");
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingFijoId, setTogglingFijoId] = useState<string | null>(null);

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

  const handleToggleFijo = async (g: Gasto) => {
    if (togglingFijoId) return;
    setTogglingFijoId(g.id);
    try {
      await updateGasto(g.id, { ...g, fijo: !g.fijo });
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
    } finally {
      setTogglingFijoId(null);
    }
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return gastos.filter((g) => {
      if (selectedFormas.size > 0 && !selectedFormas.has(g.forma)) return false;
      if (selectedConceptos.size > 0 && !selectedConceptos.has(g.concepto)) return false;
      if (tipoFilter === "fijos" && !g.fijo) return false;
      if (tipoFilter === "variables" && g.fijo) return false;
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
  }, [gastos, search, selectedFormas, selectedConceptos, tipoFilter]);

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  if (!user) { navigate("/", { replace: true }); return null; }

  const rangeLabel =
    fromYear === toYear && fromMonth === toMonth
      ? `${MONTH_FULL[fromMonth]} ${fromYear}`
      : `${MONTH_NAMES[fromMonth]} ${fromYear} → ${MONTH_NAMES[toMonth]} ${toYear}`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell user={user}>
      <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
        {/* ── Top bar ── */}
        <div className="sticky top-0 z-10" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
          <div className="max-w-screen-xl mx-auto flex items-center gap-3 px-4 py-3">
            <CalendarRange className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h1 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Historial</h1>
          </div>
        </div>

        {/* ── Filters bar ── */}
        <div className="sticky top-[48px] z-10" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line-soft)', opacity: 0.97 }}>
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
            <div className="w-px h-8 hidden sm:block" style={{ background: 'var(--line)' }} />

            {/* Forma filter */}
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>Forma</span>
              <MultiSelectFilter
                placeholder="Todas"
                options={settings.formas}
                selected={selectedFormas}
                onChange={setSelectedFormas}
              />
            </div>

            {/* Concepto filter */}
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>Concepto</span>
              <MultiSelectFilter
                placeholder="Todos"
                options={settings.conceptos}
                selected={selectedConceptos}
                onChange={setSelectedConceptos}
              />
            </div>

            {/* Tipo filter (Fijos / Variables) */}
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>Tipo</span>
              <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
                {(["todos", "fijos", "variables"] as const).map((opt) => {
                  const active = tipoFilter === opt;
                  const label = opt === "todos" ? "Todos" : opt === "fijos" ? "🔁 Fijos" : "Variable";
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setTipoFilter(opt)}
                      className="px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
                      style={{
                        background: active ? 'var(--accent-soft)' : 'transparent',
                        color: active ? 'var(--accent)' : 'var(--ink-2)',
                        border: 'none',
                        cursor: 'pointer',
                        borderRight: opt !== "variables" ? '1px solid var(--line)' : 'none',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 hidden sm:block" style={{ background: 'var(--line)' }} />

            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--ink-3)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                style={{
                  width: '100%',
                  background: 'var(--surface-alt)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  paddingLeft: 32,
                  paddingRight: 32,
                  paddingTop: 6,
                  paddingBottom: 6,
                  color: 'var(--ink)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Summary */}
            <div className="ml-auto text-right">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>{rangeLabel}</p>
              <p className="text-lg font-bold num" style={{ color: 'var(--ink)' }}>{fmtArs(totalRange)}</p>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-screen-xl mx-auto p-4 lg:p-6">
            {fromIsAfterTo ? (
              <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--ink-3)' }}>
                El inicio no puede ser posterior al fin del rango.
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-40 gap-3" style={{ color: 'var(--ink-2)' }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />
                <span className="text-sm">Cargando...</span>
              </div>
            ) : byMonth.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: 'var(--ink-3)' }}>
                <CalendarRange className="w-8 h-8" />
                <p className="text-sm">
                  {search || selectedFormas.size > 0 || selectedConceptos.size > 0 || tipoFilter !== "todos"
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
                    <div
                      key={mk}
                      style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}
                    >
                      {/* Month header */}
                      <button
                        onClick={() => toggleMonth(mk)}
                        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                            {MONTH_FULL[m - 1]} {y}
                          </span>
                          <span className="text-xs num" style={{ color: 'var(--ink-3)' }}>
                            {count} {count === 1 ? "gasto" : "gastos"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold num" style={{ color: 'var(--accent)' }}>
                            {fmtArs(monthTotal)}
                          </span>
                          {collapsed ? (
                            <ChevronDown className="w-4 h-4" style={{ color: 'var(--ink-3)' }} />
                          ) : (
                            <ChevronUp className="w-4 h-4" style={{ color: 'var(--ink-3)' }} />
                          )}
                        </div>
                      </button>

                      {/* Month body */}
                      {!collapsed && (
                        <div style={{ borderTop: '1px solid var(--line)' }}>
                          {/* Column headers */}
                          <div
                            className="grid text-[10px] uppercase tracking-widest font-medium px-4 py-2"
                            style={{
                              color: "var(--ink-3)",
                              borderBottom: "1px solid var(--line)",
                              gridTemplateColumns: GRID_COLS,
                            }}
                          >
                            <span>Forma</span>
                            <span>Concepto</span>
                            <span className="text-right">Monto</span>
                            <span className="pl-3">Nota</span>
                            <span />
                          </div>
                          {/* Day groups */}
                          {days.map(([fecha, dayGastos]) => (
                            <DayGroup
                              key={fecha}
                              fecha={fecha}
                              gastos={dayGastos}
                              settings={settings}
                              onEdit={(g) => { setEditingGasto(g); setShowModal(true); }}
                              onDelete={handleDelete}
                              onToggleFijo={handleToggleFijo}
                              deletingId={deletingId}
                              confirmDeleteId={confirmDeleteId}
                              togglingFijoId={togglingFijoId}
                              onConfirmDelete={setConfirmDeleteId}
                              onCancelDelete={() => setConfirmDeleteId(null)}
                            />
                          ))}
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
    </AppShell>
  );
}
