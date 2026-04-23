import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Plus, Pencil, Trash2,
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
import { AppShell } from "@/components";
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

  useEffect(() => {
    if (numericValue !== reported.current) {
      reported.current = numericValue;
      cbRef.current(numericValue);
    }
  });

  return (
    <div className="relative">
      {prefix && (
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none"
          style={{ color: 'var(--ink-3)' }}
        >
          {prefix}
        </span>
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
        className={`w-full rounded-lg py-2 text-sm focus:outline-none ${prefix ? "pl-7 pr-3" : "px-3"} ${className ?? ""}`}
        style={{
          background: 'var(--surface-alt)',
          border: '1px solid var(--line)',
          color: 'var(--ink)',
        }}
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
    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              {snapshot ? "Editar registro" : "Nuevo registro"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--ink-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: 'var(--ink-3)' }}>Fecha *</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: 'var(--surface-alt)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                }}
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: 'var(--ink-3)' }}>Valor dólar *</label>
              <AmountField
                initialValue={snapshot?.usd_rate ?? defaultRate}
                onValueChange={(v) => rateHook.reset(typeof v === "number" ? v : "")}
                placeholder="1.000"
              />
            </div>
          </div>

          {disponibles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>Dinero disponible</span>
                <span className="text-xs" style={{ color: 'var(--line)' }}>(USD)</span>
              </div>
              <div className="space-y-2">
                {disponibles.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-sm w-28 flex-shrink-0" style={{ color: 'var(--ink-2)' }}>{c.nombre}</span>
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
                <div className="mt-2 text-right text-xs" style={{ color: 'var(--ink-3)' }}>
                  Total disponible: <span className="font-semibold num" style={{ color: 'var(--accent)' }}>{fmtUsd(totalDispUsd)}</span>
                </div>
              )}
            </div>
          )}

          {inversiones.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>Inversiones</span>
                <span className="text-xs" style={{ color: 'var(--line)' }}>(ARS → USD)</span>
              </div>
              <div className="space-y-2">
                {inversiones.map((c) => {
                  const ars = Number(valores[c.id]) || 0;
                  const usd = usdRate > 0 && ars > 0 ? ars / usdRate : null;
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-sm w-28 flex-shrink-0" style={{ color: 'var(--ink-2)' }}>{c.nombre}</span>
                      <div className="flex-1">
                        <AmountField
                          initialValue={typeof valores[c.id] === "number" ? (valores[c.id] as number) : undefined}
                          onValueChange={(v) => setValor(c.id, v)}
                          placeholder="0"
                        />
                      </div>
                      {usd !== null && (
                        <span className="text-xs num w-20 text-right flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
                          {fmtUsd(usd)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {totalInvUsd > 0 && (
                <div className="mt-2 text-right text-xs" style={{ color: 'var(--ink-3)' }}>
                  Total inversión: <span className="font-semibold num" style={{ color: 'var(--positive)' }}>{fmtUsd(totalInvUsd)}</span>
                </div>
              )}
            </div>
          )}

          {grandTotalUsd > 0 && (
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: 'var(--pos-soft)', border: '1px solid var(--positive)' }}
            >
              <span className="text-xs font-medium" style={{ color: 'var(--positive)' }}>Total portafolio</span>
              <span className="font-bold text-lg num" style={{ color: 'var(--positive)' }}>{fmtUsd(grandTotalUsd)}</span>
            </div>
          )}

          {error && (
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--neg-soft)', border: '1px solid var(--negative)', color: 'var(--negative)' }}
            >
              {error}
            </div>
          )}
        </form>

        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 font-medium text-sm transition-colors"
            style={{ background: 'var(--surface-alt)', color: 'var(--ink-2)', border: '1px solid var(--line)', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', cursor: 'pointer' }}
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
      <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--ink-3)' }}>
        {titulo} <span style={{ color: 'var(--line)' }}>(USD)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 group"
            style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)' }}
          >
            {renamingId === c.id ? (
              <>
                <input
                  autoFocus
                  value={renameVal}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRename(c.id); if (e.key === "Escape") setRenamingId(null); }}
                  className="bg-transparent text-xs outline-none w-24"
                  style={{ color: 'var(--ink)' }}
                  maxLength={30}
                />
                <button
                  onClick={() => handleRename(c.id)}
                  className="transition-colors"
                  style={{ color: 'var(--positive)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setRenamingId(null)}
                  className="transition-colors"
                  style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{c.nombre}</span>
                <button
                  onClick={() => { setRenamingId(c.id); setRenameVal(c.nombre); }}
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-colors"
                  style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-colors"
                  style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        ))}

        {addingTipo === tipo ? (
          <div
            className="flex items-center gap-1 rounded-full px-2 py-1"
            style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)' }}
          >
            <input
              autoFocus
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAddingTipo(null); setNewNombre(""); } }}
              placeholder="Nombre..."
              maxLength={30}
              className="bg-transparent text-xs w-20 outline-none"
              style={{ color: 'var(--ink)', caretColor: 'var(--accent)' }}
            />
            <button
              onClick={handleAdd}
              disabled={!newNombre.trim()}
              className="transition-colors disabled:opacity-40"
              style={{ color: 'var(--positive)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setAddingTipo(null); setNewNombre(""); }}
              className="transition-colors"
              style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingTipo(tipo)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs transition-all"
            style={{
              color: 'var(--ink-3)',
              background: 'var(--surface-alt)',
              border: '1px dashed var(--line)',
              cursor: 'pointer',
            }}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
    >
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
    <div
      className="rounded-lg px-3 py-2.5 shadow-xl text-xs space-y-1"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
    >
      <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold num">{fmtUsdDec(p.value)}</span>
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
      const dispArs = dispUsd * snap.usd_rate;
      const invArs = invUsd * snap.usd_rate;

      return { ...snap, dispUsd, invUsd, totalUsd, totalArs, dispArs, invArs, deltaUsd, deltaPct };
    });
  }, [snapshots, disponibles, inversiones]);

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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  );
  if (!user) { navigate("/", { replace: true }); return null; }

  const loading = cuentasLoading || snapshotsLoading;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell user={user}>
      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-10"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="max-w-screen-2xl mx-auto flex items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h1 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Activos</h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors"
              style={{
                background: showSettings ? 'var(--surface-alt)' : 'transparent',
                color: showSettings ? 'var(--ink)' : 'var(--ink-3)',
                border: showSettings ? '1px solid var(--line)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cuentas</span>
            </button>
            <button
              onClick={() => { setEditingSnapshot(null); setModalOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', cursor: 'pointer', borderRadius: 7 }}
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

          {showSettings && (
            <CuentasManager
              cuentas={cuentas}
              onAdd={handleAddCuenta}
              onRename={handleRenameCuenta}
              onDelete={handleDeleteCuenta}
            />
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64 gap-3" style={{ color: 'var(--ink-2)' }}>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
              <span className="text-sm">Cargando activos...</span>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4" style={{ color: 'var(--ink-3)' }}>
              <Wallet className="w-10 h-10" />
              <p className="text-sm">No hay registros todavía</p>
              <p className="text-xs max-w-xs text-center" style={{ color: 'var(--ink-3)' }}>
                Primero agregá tus cuentas usando el botón "Cuentas", luego cargá tu primer registro.
              </p>
              <button
                onClick={() => { setEditingSnapshot(null); setModalOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 7, cursor: 'pointer' }}
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
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
                  >
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ink-3)' }}>Portafolio total</p>
                    <p className="text-2xl font-bold num" style={{ color: 'var(--positive)' }}>{fmtUsd(latestSnapshot.totalUsd)}</p>
                    <p className="text-xs mt-1 num" style={{ color: 'var(--ink-3)' }}>{fmtArs(latestSnapshot.totalArs)}</p>
                  </div>
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
                  >
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ink-3)' }}>Disponible</p>
                    <p className="text-2xl font-bold num" style={{ color: 'var(--accent)' }}>{fmtUsd(latestSnapshot.dispUsd)}</p>
                    <p className="text-xs mt-1 num" style={{ color: 'var(--ink-3)' }}>{fmtArs(latestSnapshot.dispArs)}</p>
                  </div>
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
                  >
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ink-3)' }}>Inversiones</p>
                    <p className="text-2xl font-bold num" style={{ color: 'var(--warn)' }}>{fmtUsd(latestSnapshot.invUsd)}</p>
                    <p className="text-xs mt-1 num" style={{ color: 'var(--ink-3)' }}>{fmtArs(latestSnapshot.invArs)}</p>
                  </div>
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
                  >
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ink-3)' }}>Variación (vs anterior)</p>
                    <p
                      className="text-2xl font-bold num"
                      style={{ color: latestSnapshot.deltaUsd >= 0 ? 'var(--positive)' : 'var(--negative)' }}
                    >
                      {latestSnapshot.deltaUsd >= 0 ? "+" : ""}{fmtUsd(latestSnapshot.deltaUsd)}
                    </p>
                    {latestSnapshot.deltaPct !== 0 && (
                      <p
                        className="text-xs mt-1 num"
                        style={{ color: latestSnapshot.deltaPct >= 0 ? 'var(--positive)' : 'var(--negative)' }}
                      >
                        {fmtPct(latestSnapshot.deltaPct)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Evolution chart ── */}
              {chartData.length > 1 && (
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
                >
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--ink-3)' }}>
                    Evolución del portafolio (USD)
                  </h2>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis
                          tick={{ fill: 'var(--ink-3)', fontSize: 10 }}
                          tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                          width={52} axisLine={false} tickLine={false}
                        />
                        <Tooltip content={<ChartTooltipActivos />} />
                        <Legend
                          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                          formatter={(v) => <span style={{ color: 'var(--ink-2)' }}>{v}</span>}
                        />
                        <Line type="monotone" dataKey="Portafolio USD" stroke="var(--positive)" strokeWidth={2.5} dot={{ fill: 'var(--positive)', r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="Disponible" stroke="var(--accent)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                        <Line type="monotone" dataKey="Inversiones" stroke="var(--warn)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── Snapshots table ── */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Historial de registros</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-max">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-alt)' }}>
                        <th
                          className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider sticky left-0"
                          style={{ color: 'var(--ink-3)', background: 'var(--surface-alt)' }}
                        >
                          Fecha
                        </th>
                        {disponibles.map((c) => (
                          <th key={c.id} className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--accent)' }}>{c.nombre}</th>
                        ))}
                        <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--accent)' }}>Disponible</th>
                        {inversiones.map((c) => (
                          <th key={c.id} className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--warn)' }}>{c.nombre}</th>
                        ))}
                        <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--warn)' }}>Inversiones</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>Dólar</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--positive)' }}>Total USD</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>Δ</th>
                        <th className="px-4 py-2.5 w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {[...snapshotsComputed].reverse().map((snap) => {
                        const isConfirming = confirmDeleteId === snap.id;
                        const isDeleting = deletingId === snap.id;
                        const fechaLabel = new Date(snap.fecha + "T12:00:00").toLocaleDateString("es-AR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                        });
                        return (
                          <tr
                            key={snap.id}
                            className={isConfirming ? "" : "row-hover"}
                            style={{
                              transition: 'background 0.15s',
                              background: isConfirming ? 'var(--neg-soft)' : undefined,
                              borderTop: '1px solid var(--line-soft)',
                            }}
                          >
                            <td
                              className="px-4 py-3 text-xs num whitespace-nowrap font-medium sticky left-0"
                              style={{ color: 'var(--ink-2)', background: 'var(--surface)' }}
                            >
                              {fechaLabel}
                            </td>

                            {disponibles.map((c) => {
                              const item = snap.activos_items.find((i) => i.cuenta_id === c.id);
                              return (
                                <td key={c.id} className="px-3 py-3 text-right text-xs num whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>
                                  {item ? fmtUsd(item.valor) : <span style={{ color: 'var(--line)' }}>—</span>}
                                </td>
                              );
                            })}

                            <td className="px-3 py-3 text-right font-semibold text-xs num whitespace-nowrap" style={{ color: 'var(--accent)' }}>
                              {fmtUsd(snap.dispUsd)}
                            </td>

                            {inversiones.map((c) => {
                              const item = snap.activos_items.find((i) => i.cuenta_id === c.id);
                              return (
                                <td key={c.id} className="px-3 py-3 text-right text-xs num whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>
                                  {item ? fmtArs(item.valor) : <span style={{ color: 'var(--line)' }}>—</span>}
                                </td>
                              );
                            })}

                            <td className="px-3 py-3 text-right font-semibold text-xs num whitespace-nowrap" style={{ color: 'var(--warn)' }}>
                              {fmtUsd(snap.invUsd)}
                            </td>

                            <td className="px-3 py-3 text-right text-xs num whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
                              {snap.usd_rate.toLocaleString("es-AR")}
                            </td>

                            <td className="px-4 py-3 text-right font-bold text-sm num whitespace-nowrap" style={{ color: 'var(--positive)' }}>
                              {fmtUsd(snap.totalUsd)}
                            </td>

                            <td className="px-3 py-3 text-right text-xs num whitespace-nowrap">
                              {snap.deltaUsd !== 0 ? (
                                <span
                                  className="flex items-center justify-end gap-0.5 font-semibold"
                                  style={{ color: snap.deltaUsd > 0 ? 'var(--positive)' : 'var(--negative)' }}
                                >
                                  {snap.deltaUsd > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {fmtPct(snap.deltaPct)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--line)' }}>—</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {isConfirming ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleDeleteSnapshot(snap.id)}
                                    disabled={isDeleting}
                                    className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors"
                                    style={{ background: 'var(--negative)', color: '#fff', border: 'none', cursor: 'pointer' }}
                                  >
                                    {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Eliminar
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                                    style={{ background: 'var(--surface-alt)', color: 'var(--ink-2)', border: '1px solid var(--line)', cursor: 'pointer' }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => { setEditingSnapshot(snap); setModalOpen(true); }}
                                    className="p-1.5 rounded-lg transition-colors"
                                    style={{ color: 'var(--ink-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                    title="Editar"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(snap.id)}
                                    className="p-1.5 rounded-lg transition-colors"
                                    style={{ color: 'var(--ink-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
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

      {modalOpen && (
        <SnapshotModal
          snapshot={editingSnapshot}
          cuentas={cuentas}
          defaultRate={currentRate}
          onClose={() => { setModalOpen(false); setEditingSnapshot(null); }}
          onSave={handleSaveSnapshot}
        />
      )}
    </AppShell>
  );
}
