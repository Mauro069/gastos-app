import { useState, useEffect } from "react";
import { X, Save, TrendingUp } from "lucide-react";
import { useNumericInput, useAsyncSubmit } from "@/hooks";
import type { Ingreso } from "@/types";

const today = (): string => new Date().toISOString().split("T")[0];

interface IngresoModalProps {
  ingreso: Ingreso | null;
  defaultDate?: string;
  defaultRate?: number;
  onClose: () => void;
  onSave: (data: Omit<Ingreso, "id" | "user_id" | "created_at">) => Promise<void>;
}

export default function IngresoModal({
  ingreso,
  defaultDate,
  defaultRate,
  onClose,
  onSave,
}: IngresoModalProps) {
  const [fecha, setFecha] = useState(defaultDate || today());
  const [descripcion, setDescripcion] = useState("");
  const { loading, error, setError, execute } = useAsyncSubmit();

  const usd = useNumericInput();
  const rate = useNumericInput();

  useEffect(() => {
    if (ingreso) {
      setFecha(ingreso.fecha);
      setDescripcion(ingreso.descripcion);
      usd.reset(ingreso.monto_usd);
      rate.reset(ingreso.usd_rate);
    } else {
      setFecha(defaultDate || today());
      setDescripcion("");
      usd.reset("");
      rate.reset(defaultRate ?? "");
    }
  }, [ingreso, defaultDate, defaultRate]);

  const montoArs =
    usd.numericValue !== "" && rate.numericValue !== "" &&
    usd.numericValue > 0 && rate.numericValue > 0
      ? usd.numericValue * rate.numericValue
      : null;

  const fmtArs = (n: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fecha || !descripcion.trim()) {
      setError("Completá todos los campos obligatorios");
      return;
    }
    if (usd.numericValue === "" || isNaN(usd.numericValue) || usd.numericValue <= 0) {
      setError("El monto en USD debe ser un número positivo");
      return;
    }
    if (rate.numericValue === "" || isNaN(rate.numericValue) || rate.numericValue <= 0) {
      setError("El tipo de cambio debe ser un número positivo");
      return;
    }

    await execute(async () => {
      await onSave({
        fecha,
        descripcion: descripcion.trim(),
        monto_usd: usd.numericValue as number,
        usd_rate: rate.numericValue as number,
        monto_ars: (usd.numericValue as number) * (rate.numericValue as number),
      });
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              {ingreso ? "Editar ingreso" : "Nuevo ingreso"}
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
          {/* Fecha */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">
              Fecha *
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">
              Descripción *
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Sueldo, Freelance, Dividendos..."
              maxLength={200}
              autoFocus={!ingreso}
            />
          </div>

          {/* Monto USD + Tipo de cambio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">
                Monto (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">$</span>
                <input
                  ref={usd.inputRef}
                  type="text"
                  inputMode="decimal"
                  value={usd.display}
                  onChange={usd.onChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">
                Tipo de cambio *
              </label>
              <input
                ref={rate.inputRef}
                type="text"
                inputMode="decimal"
                value={rate.display}
                onChange={rate.onChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1.000"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Monto ARS calculado */}
          {montoArs !== null && (
            <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-blue-300 text-xs font-medium">Total en ARS</span>
              <span className="text-blue-100 font-bold text-lg tabular-nums">
                {fmtArs(montoArs)}
              </span>
            </div>
          )}

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
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-2.5 font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? "Guardando..." : ingreso ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
