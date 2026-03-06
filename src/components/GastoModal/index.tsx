import { useState, useEffect, useMemo } from "react";
import { X, Save, Plus } from "lucide-react";
import type { GastoModalProps, GastoFormState, Forma, Concepto } from "@/types";
import { useUserSettings } from "@/contexts";
import { useNumericInput } from "@/hooks";
import CategoriesManagerModal from "../CategoriesManagerModal";
import ChipSelectorField from "./ChipSelectorField";

const today = (): string => new Date().toISOString().split("T")[0];

const emptyForm = (): GastoFormState => ({
  fecha: today(),
  cantidad: "",
  forma: "Lemon",
  concepto: "Salidas",
  nota: "",
});

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

  const [addingForma, setAddingForma] = useState(false);
  const [addingConcepto, setAddingConcepto] = useState(false);
  const [catManager, setCatManager] = useState<"formas" | "conceptos" | null>(null);

  const formasToShow = useMemo(
    () =>
      form.forma && !settings.formas.includes(form.forma)
        ? [...settings.formas, form.forma]
        : settings.formas,
    [settings.formas, form.forma],
  );
  const conceptosToShow = useMemo(
    () =>
      form.concepto && !settings.conceptos.includes(form.concepto)
        ? [...settings.conceptos, form.concepto]
        : settings.conceptos,
    [settings.conceptos, form.concepto],
  );

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
    <>
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
            <ChipSelectorField
              label="Forma de pago *"
              items={formasToShow}
              allItems={settings.formas}
              selected={form.forma}
              chipType="forma"
              settings={settings}
              isAdding={addingForma}
              onSelect={(v) => setForm((prev) => ({ ...prev, forma: v as Forma }))}
              onAdd={handleAddForma}
              onStartAdding={() => setAddingForma(true)}
              onCancelAdding={() => setAddingForma(false)}
              onManage={() => setCatManager("formas")}
              addTitle="Agregar forma de pago"
            />

            {/* Concepto */}
            <ChipSelectorField
              label="Concepto *"
              items={conceptosToShow}
              allItems={settings.conceptos}
              selected={form.concepto}
              chipType="concepto"
              settings={settings}
              isAdding={addingConcepto}
              onSelect={(v) => setForm((prev) => ({ ...prev, concepto: v as Concepto }))}
              onAdd={handleAddConcepto}
              onStartAdding={() => setAddingConcepto(true)}
              onCancelAdding={() => setAddingConcepto(false)}
              onManage={() => setCatManager("conceptos")}
              addTitle="Agregar concepto"
            />

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

      {catManager && (
        <CategoriesManagerModal
          initialSection={catManager}
          onClose={() => setCatManager(null)}
        />
      )}
    </>
  );
}
