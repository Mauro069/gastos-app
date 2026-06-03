import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, X, Trash2, Pencil, RefreshCw, Loader2, ChevronDown, Check } from "lucide-react";
import { getChipHex } from "@/utils/chipColor";
import { toARS } from "@/utils/currency";
import GastoModal from "../GastoModal";
import {
  createGasto,
  updateGasto,
  deleteGasto,
  deleteManyGastos,
  setFijoManyGastos,
} from "@/api";
import type { GastosTableProps, Gasto } from "@/types";
import { useAuth } from "@/contexts";
import { useUserSettings } from "@/contexts";
import { useSetQueryParam } from "@/hooks";
import MultiSelectFilter from "./MultiSelectFilter";

// ── Formatters ──────────────────────────────────────────────────────────────

const fmt = (n: number, moneda?: string) => {
  if (moneda === "USD") {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(n);
  }
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
};

const DAYS_SHORT = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

// ── Main component ───────────────────────────────────────────────────────────

export default function GastosTable({
  gastos,
  selectedYear,
  usdRates = {},
  demo,
  externalShowAdd,
  onAddClose,
}: GastosTableProps) {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<null | "new" | Gasto>(null);

  useEffect(() => {
    if (externalShowAdd) setModal("new");
  }, [externalShowAdd]);

  const [deleteConfirm, setDeleteConfirm] = useState<Gasto | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [togglingFijoId, setTogglingFijoId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterFormas, setFilterFormas] = useSetQueryParam("formas");
  const [filterConceptos, setFilterConceptos] = useSetQueryParam("conceptos");
  const validSorts = ["fecha", "monto_desc", "monto_asc"] as const;
  const rawSort = new URLSearchParams(window.location.search).get("sort") ?? "fecha";
  const [sortBy, _setSortBy] = useState<"fecha" | "monto_desc" | "monto_asc">(
    validSorts.includes(rawSort as never) ? (rawSort as "fecha" | "monto_desc" | "monto_asc") : "fecha"
  );
  const setSortBy = (next: "fecha" | "monto_desc" | "monto_asc") => {
    _setSortBy(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "fecha") params.delete("sort");
    else params.set("sort", next);
    window.history.replaceState(null, "", `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`);
  };
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  const queryKey = ["gastos", user?.id, selectedYear];

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createGasto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Gasto }) =>
      updateGasto(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteGasto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  const bulkDeleteMutation = useMutation({
    mutationFn: deleteManyGastos,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
    },
  });

  const bulkFijoMutation = useMutation({
    mutationFn: ({ ids, fijo }: { ids: string[]; fijo: boolean }) =>
      setFijoManyGastos(ids, fijo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setSelectedIds(new Set());
    },
  });

  const toggleFijoSingle = async (g: Gasto) => {
    if (togglingFijoId) return;
    setTogglingFijoId(g.id);
    try {
      await updateGasto(g.id, { ...g, fijo: !g.fijo });
      queryClient.invalidateQueries({ queryKey });
    } finally {
      setTogglingFijoId(null);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSave = async (
    data: Partial<Gasto> & {
      fecha: string;
      cantidad: number;
      forma: string;
      concepto: string;
      nota?: string;
      moneda?: 'ARS' | 'USD';
    },
  ) => {
    if (modal && modal !== "new") {
      await updateMutation.mutateAsync({
        id: modal.id,
        data: { ...modal, ...data } as Gasto,
      });
    } else {
      await createMutation.mutateAsync(data);
    }
    setModal(null);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const handleBulkDelete = async () => {
    await bulkDeleteMutation.mutateAsync([...selectedIds]);
  };

  const defaultDate = new Date().toISOString().split("T")[0];

  // ── Selection ────────────────────────────────────────────────────────────────
  const toggleRow = (id: string) =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // ── Derived data ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...gastos];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (g) =>
          g.nota?.toLowerCase().includes(s) ||
          g.concepto?.toLowerCase().includes(s) ||
          g.forma?.toLowerCase().includes(s),
      );
    }
    if (filterFormas.size > 0)
      result = result.filter((g) => filterFormas.has(g.forma));
    if (filterConceptos.size > 0)
      result = result.filter((g) => filterConceptos.has(g.concepto));
    if (sortBy === "monto_desc") {
      return result.sort((a, b) => Number(b.cantidad) - Number(a.cantidad));
    }
    if (sortBy === "monto_asc") {
      return result.sort((a, b) => Number(a.cantidad) - Number(b.cantidad));
    }
    return result.sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        Number(b.cantidad) - Number(a.cantidad),
    );
  }, [gastos, search, filterFormas, filterConceptos, sortBy]);

  const hasFilters =
    search || filterFormas.size > 0 || filterConceptos.size > 0;

  const selectedTotal = filtered
    .filter((g) => selectedIds.has(g.id))
    .reduce((acc, g) => acc + toARS(g, usdRates), 0);

  // Group by date (flat when sorting by amount)
  const groups = useMemo(() => {
    if (sortBy !== "fecha") {
      // Flat list — one virtual group, no date header
      return [{ date: null as null | string, items: filtered }];
    }
    const map: Record<string, Gasto[]> = {};
    const order: string[] = [];
    for (const g of filtered) {
      if (!map[g.fecha]) {
        map[g.fecha] = [];
        order.push(g.fecha);
      }
      map[g.fecha].push(g);
    }
    return order.map((date) => ({ date, items: map[date] }));
  }, [filtered, sortBy]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      {/* ── Toolbar ── */}
      <div
        className="flex flex-wrap gap-2 p-4"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div className="relative flex-1 min-w-[160px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--ink-3)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full rounded-xl pl-8 pr-4 py-2 text-sm focus:outline-none"
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ink-3)",
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <MultiSelectFilter
          placeholder="Formas"
          options={settings.formas}
          selected={filterFormas}
          onChange={setFilterFormas}
        />
        <MultiSelectFilter
          placeholder="Conceptos"
          options={settings.conceptos}
          selected={filterConceptos}
          onChange={setFilterConceptos}
        />

        {/* Sort selector */}
        {(() => {
          const sortOptions: { value: typeof sortBy; label: string }[] = [
            { value: "fecha", label: "Fecha" },
            { value: "monto_desc", label: "Mayor monto" },
            { value: "monto_asc", label: "Menor monto" },
          ];
          const isActive = sortBy !== "fecha";
          const currentLabel = sortOptions.find((o) => o.value === sortBy)!.label;
          return (
            <div ref={sortRef} className="relative">
              <button
                type="button"
                onClick={() => setSortOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
                style={{
                  background: isActive ? "var(--accent-soft)" : "var(--surface)",
                  color: isActive ? "var(--accent)" : "var(--ink-2)",
                  border: `1px solid ${isActive ? "var(--accent)" : "var(--line)"}`,
                  cursor: "pointer",
                }}
              >
                <span>{currentLabel}</span>
                {isActive ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSortBy("fecha"); setSortOpen(false); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", display: "flex", padding: 0 }}
                  >
                    <X size={11} />
                  </button>
                ) : (
                  <ChevronDown
                    size={11}
                    style={{
                      color: "var(--ink-3)",
                      transform: sortOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.15s",
                    }}
                  />
                )}
              </button>

              {sortOpen && (
                <div
                  className="absolute top-full mt-1 right-0 rounded-xl shadow-xl z-50 flex flex-col"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    minWidth: 150,
                    overflow: "hidden",
                  }}
                >
                  {sortOptions.map((opt) => {
                    const isSel = sortBy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors"
                        style={{
                          background: isSel ? "var(--accent-soft)" : "transparent",
                          color: isSel ? "var(--accent)" : "var(--ink-2)",
                          border: "none",
                          borderBottom: "1px solid var(--line)",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = "var(--surface-alt)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isSel ? "var(--accent-soft)" : "transparent"; }}
                      >
                        <span
                          className="flex-shrink-0 flex items-center justify-center rounded"
                          style={{
                            width: 14, height: 14,
                            background: isSel ? "var(--accent)" : "var(--surface-alt)",
                            border: isSel ? "none" : "1px solid var(--line)",
                          }}
                        >
                          {isSel && <Check size={9} style={{ color: "var(--accent-ink)", strokeWidth: 3 }} />}
                        </span>
                        <span className="flex-1">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Selection bar (shows only when something is selected) ── */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center justify-between px-4 py-2.5 flex-wrap gap-2"
          style={{
            borderBottom: "1px solid var(--line)",
            background: "var(--accent-soft)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ink-3)",
              }}
            >
              <X size={14} />
            </button>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--accent)" }}
            >
              {selectedIds.size} seleccionado{selectedIds.size > 1 ? "s" : ""}
            </span>
            <span
              className="num text-sm font-semibold"
              style={{ color: "var(--ink)" }}
            >
              {fmt(selectedTotal)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                bulkFijoMutation.mutate({ ids: [...selectedIds], fijo: true })
              }
              disabled={bulkFijoMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{
                background: "rgba(184,208,107,0.15)",
                color: "var(--accent)",
                border: "1px solid rgba(184,208,107,0.3)",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={11} /> Marcar fijos
            </button>
            <button
              onClick={() =>
                bulkFijoMutation.mutate({ ids: [...selectedIds], fijo: false })
              }
              disabled={bulkFijoMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{
                background: "var(--surface-alt)",
                color: "var(--ink-2)",
                border: "1px solid var(--line)",
                cursor: "pointer",
              }}
            >
              Marcar variables
            </button>
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{
                background: "var(--neg-soft)",
                color: "var(--negative)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Trash2 size={12} /> Eliminar
            </button>
          </div>
        </div>
      )}

      {/* ── Column headers ── */}
      <div
        className="grid text-[10px] uppercase tracking-widest font-medium px-4 py-2"
        style={{
          color: "var(--ink-3)",
          borderBottom: "1px solid var(--line)",
          gridTemplateColumns: "60px 1fr 140px 110px 100px 90px",
        }}
      >
        <span>Fecha</span>
        <span>Descripción</span>
        <span className="hidden sm:block">Categoría</span>
        <span className="hidden sm:block">Forma</span>
        <span className="text-right">Importe</span>
        <span />
      </div>

      {/* ── Feed ── */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            {hasFilters
              ? "Ningún gasto coincide con los filtros."
              : "Sin gastos este mes."}
          </p>
        </div>
      ) : (
        <div>
          {groups.map(({ date, items }) => {
            const d = date ? new Date(date + "T12:00:00") : null;
            const dayLabel = d ? `${DAYS_SHORT[d.getDay()]} ${d.getDate()}` : null;
            const dayTotalARS = items.filter(g => !g.moneda || g.moneda === "ARS").reduce((a, g) => a + Number(g.cantidad), 0);
            const dayTotalUSD = items.filter(g => g.moneda === "USD").reduce((a, g) => a + Number(g.cantidad), 0);

            return (
              <div key={date ?? "flat"}>
                {/* Day header — omitted in flat (amount) sort mode */}
                {date && (
                <div
                  id={`day-${date}`}
                  className="flex items-center justify-between px-4 py-2 sticky top-0"
                  style={{
                    background: "var(--surface-alt)",
                    borderBottom: "1px solid var(--line)",
                    zIndex: 5,
                  }}
                >
                  <span
                    className="num text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {dayLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    {dayTotalARS > 0 && (
                      <span className="num text-[10px]" style={{ color: "var(--ink-3)" }}>
                        {fmt(dayTotalARS)}
                      </span>
                    )}
                    {dayTotalUSD > 0 && (
                      <span className="num text-[10px] font-semibold" style={{ color: "#3B82F6" }}>
                        {fmt(dayTotalUSD, "USD")}
                      </span>
                    )}
                  </div>
                </div>
                )}

                {/* Day rows — same grid as column headers */}
                {items.map((g) => {
                  const isSelected = selectedIds.has(g.id);
                  const dd = new Date(g.fecha + "T12:00:00");
                  const dateLabel = `${String(dd.getDate()).padStart(2, "0")}/${String(dd.getMonth() + 1).padStart(2, "0")}`;
                  const conceptoColor = getChipHex(
                    g.concepto,
                    "concepto",
                    settings,
                  );
                  const formaColor = getChipHex(g.forma, "forma", settings);

                  return (
                    <div
                      key={g.id}
                      onClick={!demo ? () => toggleRow(g.id) : undefined}
                      className="group grid items-center px-4 py-3 transition-colors"
                      style={{
                        gridTemplateColumns: "60px 1fr 140px 110px 100px 80px",
                        borderBottom: "1px solid var(--line)",
                        background: isSelected
                          ? "var(--accent-soft)"
                          : "transparent",
                        cursor: demo ? "default" : "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected)
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--surface-alt)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          isSelected ? "var(--accent-soft)" : "transparent";
                      }}
                    >
                      {/* Date */}
                      <span
                        className="num text-xs flex-shrink-0"
                        style={{ color: "var(--ink-3)" }}
                      >
                        {dateLabel}
                      </span>

                      {/* Description with colored left bar */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-[3px] h-[18px] rounded-full flex-shrink-0"
                          style={{ background: conceptoColor ?? "#6B7280" }}
                        />
                        <span
                          className="text-sm truncate"
                          style={{
                            color: g.nota ? "var(--ink)" : "var(--ink-3)",
                          }}
                        >
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

                      {/* Concepto — muted tag using category color */}
                      <div className="hidden sm:flex items-center min-w-0">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium truncate max-w-[130px]"
                          style={{
                            background: `${conceptoColor}18`,
                            color: conceptoColor,
                            border: `1px solid ${conceptoColor}30`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: conceptoColor }}
                          />
                          {g.concepto}
                        </span>
                      </div>

                      {/* Forma — muted tag using forma color */}
                      <div className="hidden sm:flex items-center min-w-0">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium truncate max-w-[100px]"
                          style={{
                            background: `${formaColor}18`,
                            color: formaColor,
                            border: `1px solid ${formaColor}30`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: formaColor }}
                          />
                          {g.forma}
                        </span>
                      </div>

                      {/* Amount */}
                      <span
                        className="num text-sm font-semibold text-right pr-2 flex flex-col items-end"
                        style={{ color: "var(--ink)" }}
                      >
                        {fmt(Number(g.cantidad), g.moneda)}
                        {g.moneda === "USD" && (
                          <span
                            className="text-[9px] font-bold uppercase tracking-wide px-1 rounded"
                            style={{ background: "rgba(59,130,246,0.12)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.3)", lineHeight: "1.4" }}
                          >
                            USD
                          </span>
                        )}
                      </span>

                      {/* Actions (hover) */}
                      <div
                        className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ paddingLeft: 8 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!demo && (
                          <>
                            <button
                              onClick={() => toggleFijoSingle(g)}
                              title={g.fijo ? "Marcar como variable" : "Marcar como fijo"}
                              disabled={togglingFijoId === g.id}
                              className="p-1.5 rounded-lg"
                              style={{
                                background: g.fijo ? "rgba(184,208,107,0.12)" : "none",
                                border: "none",
                                cursor: togglingFijoId === g.id ? "default" : "pointer",
                                color: togglingFijoId === g.id ? "var(--accent)" : g.fijo ? "var(--accent)" : "var(--ink-3)",
                              }}
                              onMouseEnter={(e) => {
                                if (togglingFijoId === g.id) return;
                                e.currentTarget.style.color = "var(--accent)";
                                e.currentTarget.style.background = "rgba(184,208,107,0.12)";
                              }}
                              onMouseLeave={(e) => {
                                if (togglingFijoId === g.id) return;
                                e.currentTarget.style.color = g.fijo ? "var(--accent)" : "var(--ink-3)";
                                e.currentTarget.style.background = g.fijo ? "rgba(184,208,107,0.12)" : "none";
                              }}
                            >
                              {togglingFijoId === g.id
                                ? <Loader2 size={13} className="animate-spin" />
                                : <RefreshCw size={13} />
                              }
                            </button>
                            <button
                              onClick={() => setModal(g)}
                              className="p-1.5 rounded-lg"
                              style={{
                                background: "none",
                                border: "none",
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
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(g)}
                              className="p-1.5 rounded-lg"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--ink-3)",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.color =
                                  "var(--negative)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.color = "var(--ink-3)")
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit / Create modal ── */}
      {modal && !demo && (
        <GastoModal
          gasto={modal === "new" ? null : modal}
          defaultDate={modal === "new" ? defaultDate : undefined}
          recentGastos={gastos}
          onClose={() => {
            setModal(null);
            onAddClose?.();
          }}
          onSave={handleSave}
        />
      )}

      {/* ── Single delete confirm ── */}
      {deleteConfirm && !demo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
            }}
          >
            <h3
              className="text-base font-semibold mb-2"
              style={{ color: "var(--ink)" }}
            >
              Eliminar gasto
            </h3>
            <p className="text-sm mb-1" style={{ color: "var(--ink-3)" }}>
              ¿Seguro que querés eliminar este gasto?
            </p>
            <p
              className="text-sm font-semibold mb-1"
              style={{ color: "var(--ink)" }}
            >
              {fmt(Number(deleteConfirm.cantidad))} — {deleteConfirm.concepto}
            </p>
            {deleteConfirm.nota && (
              <p
                className="text-xs italic mb-4"
                style={{ color: "var(--ink-3)" }}
              >
                "{deleteConfirm.nota}"
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
                style={{
                  background: "var(--surface-alt)",
                  color: "var(--ink-2)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
                style={{
                  background: "var(--neg-soft)",
                  color: "var(--negative)",
                  border: "1px solid var(--negative)",
                  cursor: "pointer",
                }}
              >
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk delete confirm ── */}
      {bulkDeleteConfirm && !demo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
            }}
          >
            <h3
              className="text-base font-semibold mb-2"
              style={{ color: "var(--ink)" }}
            >
              Eliminar gastos
            </h3>
            <p className="text-sm mb-3" style={{ color: "var(--ink-3)" }}>
              ¿Seguro que querés eliminar{" "}
              <span className="font-semibold" style={{ color: "var(--ink)" }}>
                {selectedIds.size} gastos
              </span>
              ?
            </p>
            <div
              className="rounded-xl px-4 py-3 mb-4"
              style={{ background: "var(--surface-alt)" }}
            >
              <p className="text-xs mb-0.5" style={{ color: "var(--ink-3)" }}>
                Total a eliminar
              </p>
              <p
                className="num font-bold text-lg"
                style={{ color: "var(--negative)" }}
              >
                {fmt(selectedTotal)}
              </p>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--negative)" }}>
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                disabled={bulkDeleteMutation.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
                style={{
                  background: "var(--surface-alt)",
                  color: "var(--ink-2)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
                style={{
                  background: "var(--neg-soft)",
                  color: "var(--negative)",
                  border: "1px solid var(--negative)",
                  cursor: "pointer",
                }}
              >
                {bulkDeleteMutation.isPending
                  ? "Eliminando..."
                  : `Eliminar ${selectedIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
