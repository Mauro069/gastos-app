import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  Wallet, TrendingUp, TrendingDown, Save, X, Settings2, Check,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  fetchActivoCuentas, createActivoCuenta, updateActivoCuenta, deleteActivoCuenta,
  fetchActivoSnapshots, createActivoSnapshot, updateActivoSnapshot, deleteActivoSnapshot,
  fetchUsdRates,
} from "@/api";
import { useNumericInput } from "@/hooks";
import { useAuth } from "@/contexts";
import type { ActivoCuenta, ActivoSnapshot, ActivoItem, CuentaTipo, UsdRates } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split("T")[0];

const fmtUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtArs = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const fmtUsdDec = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

function getRate(usdRates: UsdRates, date: string): number | undefined {
  const mk = date.slice(0, 7);
  if (usdRates[mk]) return usdRates[mk];
  const prior = [...Object.keys(usdRates).sort()].reverse().find((k) => k <= mk);
  return prior ? usdRates[prior] : undefined;
}

/** USD value of a snapshot item given cuentas list and snapshot's usd_rate */
function itemToUsd(item: ActivoItem, cuenta: ActivoCuenta | undefined, usdRate: number): number {
  if (!cuenta) return 0;
  if (cuenta.tipo === "disponible") return item.valor; // already USD
  return usdRate > 0 ? item.valor / usdRate : 0;       // ARS → USD
}

// ── AmountField — wraps useNumericInput so it can be used in dynamic lists ────

function AmountField({
  initialValue, onValueChange, prefix, placeholder, className, autoFocus,
}: {
  initialValue?: number;
  onValueChange: (v: number | "") => void;
  prefix?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const { inputRef, display, numericValue, onChange, reset } = useNumericInput(initialValue ?? "");
  const reported = useRef<number | "">(initialValue ?? "");
  const cbRef = useRef(onValueChange);
  cbRef.current = onValueChange;

  useEffect(() => { reset(initialValue ?? ""); }, []); // init once

  // Report to parent on every render if value changed
  useEffect(() => {
    if (numericValue !== reported.current) {
      reported.current = numericValue;
      cbRef.current(numericValue);
    }
  });

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">{prefix}</span>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={onChange}
        placeholder={placeholder ?? "0"}
        autoFocus={autoFocus}
        autoComplete="off"
        className={`w-full bg-gray-800 border border-gray-700 rounded-lg py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${prefix ? "pl-7 pr-3" : "px-3"} ${className ?? ""}`}
      />
    </div>
  );
}

// ── Snapshot Modal ─────────────────────────────────────────────────────────────

interface SnapshotModalProps {
  snapshot: ActivoSnapshot | null;
  cuentas: ActivoCuenta[];
  defaultRate?: number;
  onClose: () => void;
  onSave: (
    snap: { fecha: string; usd_rate: number },
    items: Omit<ActivoItem, "id" | "snapshot_id">[],
  ) => Promise<void>;
}

function SnapshotModal({ snapshot, cuentas, defaultRate, onClose, onSave }: SnapshotModalProps) {
  const [fecha, setFecha] = useState(snapshot?.fecha ?? today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const disponibles = cuentas.filter((c) => c.tipo === "disponible");
  const inversiones = cuentas.filter((c) => c.tipo === "inversion");

  // valores: cuenta_id → number | ""
  const [valores, setValores] = useState<Record<string, number | "">>(() => {
    const init: Record<string, number | ""> = {};
    for (const c of cuentas) {
      const item = snapshot?.activos_items.find((i) => i.cuenta_id === c.id);
      init[c.id] = item?.valor ?? "";
    }
    return init;
  });

  const rateHook = useNumericInput(snapshot?.usd_rate ?? defaultRate ?? "");
  const usdRate = typeof rateHook.numericValue === "number" ? rateHook.numericValue : 0;

  const setValor = useCallback((id: string, v: number | "") => {
    setValores((prev) => ({ ...prev, [id]: v }));
  }, []);

  // Live totals
  const totalDispUsd = disponibles.reduce((a, c) => a + (Number(valores[c.id]) || 0), 0);
  const totalInvArs = inversiones.reduce((a, c) => a + (Number(valores[c.id]) || 0), 0);
  const totalInvUsd = usdRate > 0 ? totalInvArs / usdRate : 0;
  const grandTotalUsd = totalDispUsd + totalInvUsd;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha) { setError("Ingresá la fecha"); return; }
    if (!usdRate || usdRate <= 0) { setError("Ingresá el tipo de cambio"); return; }

    const items: Omit<ActivoItem, "id" | "snapshot_id">[] = cuentas
      .filter((c) => valores[c.id] !== "" && Number(valores[c.id]) > 0)
      .map((c) => ({ cuenta_id: c.id, valor: Number(valores[c.id]) }));

    setLoading(true);
    setError("");
    try {
      await onSave({ fecha, usd_rate: usdRate }, items);
      onClose();
    } catch {
      setError("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              {snapshot ? "Editar registro" : "Nuevo registro"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Fecha + Tipo de cambio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Fecha *</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Valor dólar *</label>
              <AmountField
                initialValue={snapshot?.usd_rate ?? defaultRate}
                onValueChange={(v) => rateHook.reset(typeof v === "number" ? v : "")}
                placeholder="1.000"
              />
              {/* Hack: render the actual rate input using rateHook directly */}
            </div>
          </div>

          {/* Disponible — USD */}
          {disponibles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dinero disponible</span>
                <span className="text-gray-700 text-xs">(USD)</span>
              </div>
              <div className="space-y-2">
                {disponibles.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-gray-300 text-sm w-28 flex-shrink-0">{c.nombre}</span>
                    <AmountField
                      initialValue={typeof valores[c.id] === "number" ? (valores[c.id] as number) : undefined}
                      onValueChange={(v) => setValor(c.id, v)}
                      prefix="$"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              {totalDispUsd > 0 && (
                <div className="mt-2 text-right text-xs text-gray-500">
                  Total disponible: <span className="text-blue-300 font-semibold">{fmtUsd(totalDispUsd)}</span>
                </div>
              )}
            </div>
          )}

          {/* Inversión — ARS → USD */}
          {inversiones.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inversiones</span>
                <span className="text-gray-700 text-xs">(ARS → USD)</span>
              </div>
              <div className="space-y-2">
                {inversiones.map((c) => {
                  const ars = Number(valores[c.id]) || 0;
                  const usd = usdRate > 0 && ars > 0 ? ars / usdRate : null;
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-gray-300 text-sm w-28 flex-shrink-0">{c.nombre}</span>
                      <div className="flex-1">
                        <AmountField
                          initialValue={typeof valores[c.id] === "number" ? (valores[c.id] as number) : undefined}
                          onValueChange={(v) => setValor(c.id, v)}
                          placeholder="0"
                        />
                      </div>
                      {usd !== null && (
                        <span className="text-gray-500 text-xs tabular-nums w-20 text-right flex-shrink-0">
                          {fmtUsd(usd)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {totalInvUsd > 0 && (
                <div className="mt-2 text-right text-xs text-gray-500">
                  Total inversión: <span className="text-purple-300 font-semibold">{fmtUsd(totalInvUsd)}</span>
                </div>
              )}
            </div>
          )}

          {/* Grand total preview */}
          {grandTotalUsd > 0 && (
            <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-blue-300 text-xs font-medium">Total portafolio</span>
              <span className="text-blue-100 font-bold text-lg tabular-nums">{fmtUsd(grandTotalUsd)}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-sm">{error}</div>
          )}
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-800">
          <button type="button" onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 font-medium text-sm transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-2.5 font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? "Guardando..." : snapshot ? "Actualizar" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cuentas Manager ───────────────────────────────────────────────────────────

function CuentasManager({
  cuentas, onAdd, onRename, onDelete,
}: {
  cuentas: ActivoCuenta[];
  onAdd: (nombre: string, tipo: CuentaTipo) => void;
  onRename: (id: string, nombre: string) => void;
  onDelete: (id: string) => void;
}) {
  const [addingTipo, setAddingTipo] = useState<CuentaTipo | null>(null);
  const [newNombre, setNewNombre] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const disponibles = cuentas.filter((c) => c.tipo === "disponible");
  const inversiones = cuentas.filter((c) => c.tipo === "inversion");

  const handleAdd = () => {
    const trimmed = newNombre.trim();
    if (!trimmed || !addingTipo) return;
    onAdd(trimmed, addingTipo);
    setNewNombre("");
    setAddingTipo(null);
  };

  const handleRename = (id: string) => {
    const trimmed = renameVal.trim();
    if (trimmed) onRename(id, trimmed);
    setRenamingId(null);
  };

  const Section = ({ titulo, tipo, items }: { titulo: string; tipo: CuentaTipo; items: ActivoCuenta[] }) => (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{titulo} <span className="text-gray-700">(USD)</span></p>
      <div className="flex flex-wrap gap-2">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-1 bg-gray-800 rounded-full px-3 py-1.5 group">
            {renamingId === c.id ? (
              <>
                <input
                  autoFocus
                  value={renameVal}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRename(c.id); if (e.key === "Escape") setRenamingId(null); }}
                  className="bg-transparent text-white text-xs outline-none w-24"
                  maxLength={30}
                />
                <button onClick={() => handleRename(c.id)} className="text-green-400 hover:text-green-300 transition-colors">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setRenamingId(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="text-gray-200 text-xs font-medium">{c.nombre}</span>
                <button
                  onClick={() => { setRenamingId(c.id); setRenameVal(c.nombre); }}
                  className="text-gray-600 hover:text-blue-400 transition-colors ml-1 opacity-0 group-hover:opacity-100"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        ))}

        {/* Add button or input */}
        {addingTipo === tipo ? (
          <div className="flex items-center gap-1 bg-gray-700 rounded-full px-2 py-1">
            <input
              autoFocus
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAddingTipo(null); setNewNombre(""); } }}
              placeholder="Nombre..."
              maxLength={30}
              className="bg-transparent text-white text-xs w-20 outline-none placeholder-gray-500"
            />
            <button onClick={handleAdd} disabled={!newNombre.trim()} className="text-green-400 hover:text-green-300 disabled:text-gray-600 transition-colors">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setAddingTipo(null); setNewNombre(""); }} className="text-gray-500 hover:text-gray-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingTipo(tipo)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-gray-500 hover:text-green-400 bg-gray-800 border border-dashed border-gray-700 hover:border-green-600 transition-all"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-gray-900 ring-1 ring-gray-800 rounded-2xl p-4 space-y-4">
      <Section titulo="Dinero disponible" tipo="disponible" items={disponibles} />
      <Section titulo="Inversiones" tipo="inversion" items={inversiones} />
    </div>
  );
}

// ── Chart tooltip ──────────────────────────────────────────────────────────────

function ChartTooltipActivos({ active, payload, label }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 shadow-xl text-xs space-y-1">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{fmtUsdDec(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ActivosPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showSettings, setShowSettings] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<ActivoSnapshot | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: cuentas = [], isLoading: cuentasLoading } = useQuery({
    queryKey: ["activos_cuentas", user?.id],
    queryFn: fetchActivoCuentas,
    enabled: !!user,
  });

  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery({
    queryKey: ["activos_snapshots", user?.id],
    queryFn: fetchActivoSnapshots,
    enabled: !!user,
  });

  const { data: usdRates = {} as UsdRates } = useQuery({
    queryKey: ["usd_rates", user?.id],
    queryFn: fetchUsdRates,
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const currentRate = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return getRate(usdRates, key + "-01");
  }, [usdRates]);

  // ── Mutations ──────────────────────────────────────────────────────────

  const invalidateSnapshots = () =>
    queryClient.invalidateQueries({ queryKey: ["activos_snapshots", user?.id] });
  const invalidateCuentas = () =>
    queryClient.invalidateQueries({ queryKey: ["activos_cuentas", user?.id] });

  const createCuentaMut = useMutation({ mutationFn: createActivoCuenta, onSuccess: invalidateCuentas });
  const updateCuentaMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ActivoCuenta> }) => updateActivoCuenta(id, data),
    onSuccess: invalidateCuentas,
  });
  const deleteCuentaMut = useMutation({ mutationFn: deleteActivoCuenta, onSuccess: invalidateCuentas });

  const createSnapshotMut = useMutation({
    mutationFn: ({ snap, items }: { snap: { fecha: string; usd_rate: number }; items: Omit<ActivoItem, "id" | "snapshot_id">[] }) =>
      createActivoSnapshot(snap, items),
    onSuccess: invalidateSnapshots,
  });
  const updateSnapshotMut = useMutation({
    mutationFn: ({ id, snap, items }: { id: string; snap: { fecha?: string; usd_rate?: number }; items: Omit<ActivoItem, "id" | "snapshot_id">[] }) =>
      updateActivoSnapshot(id, snap, items),
    onSuccess: invalidateSnapshots,
  });
  const deleteSnapshotMut = useMutation({ mutationFn: deleteActivoSnapshot, onSuccess: invalidateSnapshots });

  const handleSaveSnapshot = async (
    snap: { fecha: string; usd_rate: number },
    items: Omit<ActivoItem, "id" | "snapshot_id">[],
  ) => {
    if (editingSnapshot) {
      await updateSnapshotMut.mutateAsync({ id: editingSnapshot.id, snap, items });
    } else {
      await createSnapshotMut.mutateAsync({ snap, items });
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try { await deleteSnapshotMut.mutateAsync(id); }
    finally { setDeletingId(null); }
  };

  const handleAddCuenta = (nombre: string, tipo: CuentaTipo) => {
    createCuentaMut.mutate({ nombre, tipo, orden: cuentas.length });
  };
  const handleRenameCuenta = (id: string, nombre: string) => {
    updateCuentaMut.mutate({ id, data: { nombre } });
  };
  const handleDeleteCuenta = (id: string) => {
    deleteCuentaMut.mutate(id);
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const disponibles = useMemo(() => cuentas.filter((c) => c.tipo === "disponible"), [cuentas]);
  const inversiones = useMemo(() => cuentas.filter((c) => c.tipo === "inversion"), [cuentas]);

  // Compute totals for each snapshot
  const snapshotsComputed = useMemo(() => {
    return snapshots.map((snap, idx) => {
      const dispUsd = disponibles.reduce((a, c) => {
        const item = snap.activos_items.find((i) => i.cuenta_id === c.id);
        return a + (item ? itemToUsd(item, c, snap.usd_rate) : 0);
      }, 0);
      const invUsd = inversiones.reduce((a, c) => {
        const item = snap.activos_items.find((i) => i.cuenta_id === c.id);
        return a + (item ? itemToUsd(item, c, snap.usd_rate) : 0);
      }, 0);
      const totalUsd = dispUsd + invUsd;
      const totalArs = totalUsd * snap.usd_rate;

      const prev = idx > 0 ? snapshots[idx - 1] : null;
      let prevTotalUsd = 0;
      if (prev) {
        const pDisp = disponibles.reduce((a, c) => {
          const item = prev.activos_items.find((i) => i.cuenta_id === c.id);
          return a + (item ? itemToUsd(item, c, prev.usd_rate) : 0);
        }, 0);
        const pInv = inversiones.reduce((a, c) => {
          const item = prev.activos_items.find((i) => i.cuenta_id === c.id);
          return a + (item ? itemToUsd(item, c, prev.usd_rate) : 0);
        }, 0);
        prevTotalUsd = pDisp + pInv;
      }

      const deltaUsd = prev ? totalUsd - prevTotalUsd : 0;
      const deltaPct = prev && prevTotalUsd > 0 ? (deltaUsd / prevTotalUsd) * 100 : 0;

      return { ...snap, dispUsd, invUsd, totalUsd, totalArs, deltaUsd, deltaPct };
    });
  }, [snapshots, disponibles, inversiones]);

  // Chart data (chronological)
  const chartData = useMemo(() =>
    snapshotsComputed.map((s) => ({
      label: new Date(s.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }),
      "Portafolio USD": parseFloat(s.totalUsd.toFixed(2)),
      "Disponible": parseFloat(s.dispUsd.toFixed(2)),
      "Inversiones": parseFloat(s.invUsd.toFixed(2)),
    })), [snapshotsComputed]);

  const latestSnapshot = snapshotsComputed[snapshotsComputed.length - 1];

  // ── Auth guard ──────────────────────────────────────────────────────────

  if (authLoading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );
  if (!user) { navigate("/", { replace: true }); return null; }

  const loading = cuentasLoading || snapshotsLoading;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-4 px-4 py-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="w-px h-5 bg-gray-700" />
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-semibold text-white">Activos</h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${showSettings ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cuentas</span>
            </button>
            <button
              onClick={() => { setEditingSnapshot(null); setModalOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo registro
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 overflow-auto scrollbar-thin">
        <div className="max-w-screen-2xl mx-auto p-4 lg:p-6 space-y-5">

          {/* ── Accounts manager (collapsible) ── */}
          {showSettings && (
            <CuentasManager
              cuentas={cuentas}
              onAdd={handleAddCuenta}
              onRename={handleRenameCuenta}
              onDelete={handleDeleteCuenta}
            />
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-sm">Cargando activos...</span>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-600">
              <Wallet className="w-10 h-10" />
              <p className="text-sm">No hay registros todavía</p>
              <p className="text-xs text-gray-700 max-w-xs text-center">
                Primero agregá tus cuentas usando el botón "Cuentas", luego cargá tu primer registro.
              </p>
              <button
                onClick={() => { setEditingSnapshot(null); setModalOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Primer registro
              </button>
            </div>
          ) : (
            <>
              {/* ── Latest snapshot stat cards ── */}
              {latestSnapshot && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-gray-900 ring-1 ring-emerald-800/40 rounded-2xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Portafolio total</p>
                    <p className="text-2xl font-bold tabular-nums text-emerald-300">{fmtUsd(latestSnapshot.totalUsd)}</p>
                    <p className="text-xs text-gray-600 mt-1 tabular-nums">{fmtArs(latestSnapshot.totalArs)}</p>
                  </div>
                  <div className="bg-gray-900 ring-1 ring-blue-800/40 rounded-2xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Disponible</p>
                    <p className="text-2xl font-bold tabular-nums text-blue-300">{fmtUsd(latestSnapshot.dispUsd)}</p>
                  </div>
                  <div className="bg-gray-900 ring-1 ring-purple-800/40 rounded-2xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Inversiones</p>
                    <p className="text-2xl font-bold tabular-nums text-purple-300">{fmtUsd(latestSnapshot.invUsd)}</p>
                  </div>
                  <div className={`bg-gray-900 ring-1 rounded-2xl p-4 ${latestSnapshot.deltaUsd >= 0 ? "ring-emerald-800/40" : "ring-red-800/40"}`}>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Variación (vs anterior)</p>
                    <p className={`text-2xl font-bold tabular-nums ${latestSnapshot.deltaUsd >= 0 ? "text-emerald-300" : "text-red-400"}`}>
                      {latestSnapshot.deltaUsd >= 0 ? "+" : ""}{fmtUsd(latestSnapshot.deltaUsd)}
                    </p>
                    {latestSnapshot.deltaPct !== 0 && (
                      <p className={`text-xs mt-1 tabular-nums ${latestSnapshot.deltaPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {fmtPct(latestSnapshot.deltaPct)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Evolution chart ── */}
              {chartData.length > 1 && (
                <div className="bg-gray-900 ring-1 ring-gray-800 rounded-2xl p-4">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Evolución del portafolio (USD)</h2>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis
                          tick={{ fill: "#6B7280", fontSize: 10 }}
                          tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                          width={52} axisLine={false} tickLine={false}
                        />
                        <Tooltip content={<ChartTooltipActivos />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(v) => <span style={{ color: "#9CA3AF" }}>{v}</span>} />
                        <Line type="monotone" dataKey="Portafolio USD" stroke="#10B981" strokeWidth={2.5} dot={{ fill: "#10B981", r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="Disponible" stroke="#3B82F6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                        <Line type="monotone" dataKey="Inversiones" stroke="#A855F7" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── Snapshots table ── */}
              <div className="bg-gray-900 ring-1 ring-gray-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h2 className="text-sm font-semibold text-white">Historial de registros</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-max">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-900/60">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-900/95">Fecha</th>
                        {disponibles.map((c) => (
                          <th key={c.id} className="text-right px-3 py-2.5 text-xs font-semibold text-blue-600/70 uppercase tracking-wider whitespace-nowrap">{c.nombre}</th>
                        ))}
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-blue-500/70 uppercase tracking-wider whitespace-nowrap">Disponible</th>
                        {inversiones.map((c) => (
                          <th key={c.id} className="text-right px-3 py-2.5 text-xs font-semibold text-purple-600/70 uppercase tracking-wider whitespace-nowrap">{c.nombre}</th>
                        ))}
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-purple-500/70 uppercase tracking-wider whitespace-nowrap">Inversiones</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Dólar</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-emerald-500/80 uppercase tracking-wider whitespace-nowrap">Total USD</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Δ</th>
                        <th className="px-4 py-2.5 w-20" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {[...snapshotsComputed].reverse().map((snap) => {
                        const isConfirming = confirmDeleteId === snap.id;
                        const isDeleting = deletingId === snap.id;
                        const fechaLabel = new Date(snap.fecha + "T12:00:00").toLocaleDateString("es-AR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                        });
                        return (
                          <tr key={snap.id} className={`transition-colors ${isConfirming ? "bg-red-950/20" : "hover:bg-gray-800/30"}`}>
                            <td className="px-4 py-3 text-gray-300 text-xs tabular-nums whitespace-nowrap font-medium sticky left-0 bg-gray-900/80">
                              {fechaLabel}
                            </td>

                            {/* Disponible per-account values */}
                            {disponibles.map((c) => {
                              const item = snap.activos_items.find((i) => i.cuenta_id === c.id);
                              return (
                                <td key={c.id} className="px-3 py-3 text-right text-gray-400 text-xs tabular-nums whitespace-nowrap">
                                  {item ? fmtUsd(item.valor) : <span className="text-gray-700">—</span>}
                                </td>
                              );
                            })}

                            {/* Disponible total */}
                            <td className="px-3 py-3 text-right text-blue-300 font-semibold text-xs tabular-nums whitespace-nowrap">
                              {fmtUsd(snap.dispUsd)}
                            </td>

                            {/* Inversion per-account values (in ARS) */}
                            {inversiones.map((c) => {
                              const item = snap.activos_items.find((i) => i.cuenta_id === c.id);
                              return (
                                <td key={c.id} className="px-3 py-3 text-right text-gray-400 text-xs tabular-nums whitespace-nowrap">
                                  {item ? fmtArs(item.valor) : <span className="text-gray-700">—</span>}
                                </td>
                              );
                            })}

                            {/* Inversion total in USD */}
                            <td className="px-3 py-3 text-right text-purple-300 font-semibold text-xs tabular-nums whitespace-nowrap">
                              {fmtUsd(snap.invUsd)}
                            </td>

                            {/* Dollar rate */}
                            <td className="px-3 py-3 text-right text-gray-500 text-xs tabular-nums whitespace-nowrap">
                              {snap.usd_rate.toLocaleString("es-AR")}
                            </td>

                            {/* Grand total */}
                            <td className="px-4 py-3 text-right text-emerald-300 font-bold text-sm tabular-nums whitespace-nowrap">
                              {fmtUsd(snap.totalUsd)}
                            </td>

                            {/* Delta */}
                            <td className="px-3 py-3 text-right text-xs tabular-nums whitespace-nowrap">
                              {snap.deltaUsd !== 0 ? (
                                <span className={`flex items-center justify-end gap-0.5 font-semibold ${snap.deltaUsd > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  {snap.deltaUsd > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {fmtPct(snap.deltaPct)}
                                </span>
                              ) : (
                                <span className="text-gray-700">—</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3">
                              {isConfirming ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleDeleteSnapshot(snap.id)}
                                    disabled={isDeleting}
                                    className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Eliminar
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => { setEditingSnapshot(snap); setModalOpen(true); }}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-gray-700 transition-colors"
                                    title="Editar"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(snap.id)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── Snapshot modal ── */}
      {modalOpen && (
        <SnapshotModal
          snapshot={editingSnapshot}
          cuentas={cuentas}
          defaultRate={currentRate}
          onClose={() => { setModalOpen(false); setEditingSnapshot(null); }}
          onSave={handleSaveSnapshot}
        />
      )}
    </div>
  );
}
