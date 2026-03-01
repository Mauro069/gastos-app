import { useState, useEffect, useRef } from "react";
import { X, Save, Plus, Check } from "lucide-react";
import { FORMA_BG, CONCEPTO_BG } from "@/constants";
import type { GastoModalProps, GastoFormState, Forma, Concepto } from "@/types";
import { useUserSettings } from "@/contexts";
import { useNumericInput } from "@/hooks";

const today = (): string => new Date().toISOString().split("T")[0];

const emptyForm = (): GastoFormState => ({
  fecha: today(),
  cantidad: "",
  forma: "Lemon",
  concepto: "Salidas",
  nota: "",
});

// ── Inline "add chip" sub-component ───────────────────────────────────────

function AddChipInput({
  onAdd,
  onCancel,
  existing,
}: {
  onAdd: (value: string) => void;
  onCancel: () => void;
  existing: string[];
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = value.trim();
  const isDuplicate = existing.some(
    (e) => e.toLowerCase() === trimmed.toLowerCase()
  );

  const handleConfirm = () => {
    if (!trimmed || isDuplicate) return;
    onAdd(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="flex items-center gap-1 bg-gray-700 rounded-full px-2 py-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nuevo..."
        maxLength={30}
        className="bg-transparent text-white text-xs w-24 outline-none placeholder-gray-400"
      />
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!trimmed || isDuplicate}
        title={isDuplicate ? "Ya existe" : "Confirmar"}
        className="text-green-400 hover:text-green-300 disabled:text-gray-600 transition-colors"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-gray-400 hover:text-gray-200 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function GastoModal({
  gasto,
  defaultDate,
  onClose,
  onSave,
}: GastoModalProps) {
  const { settings, updateFormas, updateConceptos } = useUserSettings();
  const [form, setForm] = useState<GastoFormState>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Inline add state
  const [addingForma, setAddingForma] = useState(false);
  const [addingConcepto, setAddingConcepto] = useState(false);

  const {
    inputRef,
    display,
    numericValue,
    onChange: onCantidadChange,
    reset: resetCantidad,
  } = useNumericInput();

  useEffect(() => {
    if (gasto) {
      setForm({ ...gasto, cantidad: gasto.cantidad, nota: gasto.nota ?? "" });
      resetCantidad(gasto.cantidad);
    } else {
      setForm({ ...emptyForm(), fecha: defaultDate || today() });
      resetCantidad("");
    }
  }, [gasto, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fecha || numericValue === "" || !form.forma || !form.concepto) {
      setError("Completá todos los campos obligatorios");
      return;
    }
    if (isNaN(numericValue) || numericValue <= 0) {
      setError("La cantidad debe ser un número positivo");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSave({ ...form, cantidad: numericValue });
      onClose();
    } catch {
      setError("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleAddForma = async (newForma: string) => {
    await updateFormas([...settings.formas, newForma]);
    setForm((prev) => ({ ...prev, forma: newForma as Forma }));
    setAddingForma(false);
  };

  const handleAddConcepto = async (newConcepto: string) => {
    await updateConceptos([...settings.conceptos, newConcepto]);
    setForm((prev) => ({ ...prev, concepto: newConcepto as Concepto }));
    setAddingConcepto(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">
              {gasto ? "Editar gasto" : "Nuevo gasto"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Fecha + Cantidad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">
                Fecha *
              </label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fecha: e.target.value }))
                }
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">
                Cantidad * (ARS)
              </label>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={display}
                onChange={onCantidadChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Forma de pago */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
              Forma de pago *
            </label>
            <div className="flex flex-wrap gap-2">
              {settings.formas.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, forma: f as Forma }))
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    form.forma === f
                      ? (FORMA_BG[f as Forma] ?? "bg-gray-600 text-white") +
                        " ring-2 ring-white/30 scale-105"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {f}
                </button>
              ))}

              {addingForma ? (
                <AddChipInput
                  existing={settings.formas}
                  onAdd={handleAddForma}
                  onCancel={() => setAddingForma(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingForma(true)}
                  title="Agregar forma de pago"
                  className="px-2.5 py-1.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-500 hover:text-green-400 hover:bg-gray-700 border border-dashed border-gray-600 hover:border-green-500 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
              Concepto *
            </label>
            <div className="flex flex-wrap gap-2">
              {settings.conceptos.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, concepto: c as Concepto }))
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    form.concepto === c
                      ? (CONCEPTO_BG[c as Concepto] ??
                          "bg-gray-600 text-white") +
                        " ring-2 ring-white/30 scale-105"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {c}
                </button>
              ))}

              {addingConcepto ? (
                <AddChipInput
                  existing={settings.conceptos}
                  onAdd={handleAddConcepto}
                  onCancel={() => setAddingConcepto(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingConcepto(true)}
                  title="Agregar concepto"
                  className="px-2.5 py-1.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-500 hover:text-green-400 hover:bg-gray-700 border border-dashed border-gray-600 hover:border-green-500 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Nota */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">
              Nota
            </label>
            <input
              type="text"
              value={form.nota}
              onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Descripción del gasto..."
              maxLength={200}
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl py-2.5 font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? "Guardando..." : gasto ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
