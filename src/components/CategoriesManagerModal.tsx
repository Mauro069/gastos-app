import { useState } from "react";
import { X, Pencil, Check, Plus, Loader2, CreditCard, Tag } from "lucide-react";
import { FORMA_BG, CONCEPTO_BG } from "@/constants";
import type { Forma, Concepto } from "@/types";
import { useUserSettings } from "@/contexts";

// ── Single editable chip ──────────────────────────────────────────────────────

function Chip({
  value,
  colorClass,
  onRename,
  onDelete,
  existing,
}: {
  value: string;
  colorClass?: string;
  onRename: (newName: string) => Promise<void>;
  onDelete: () => Promise<void>;
  existing: string[];
}) {
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const [renameVal, setRenameVal] = useState(value);
  const [loading, setLoading] = useState(false);

  const isDuplicate =
    renameVal.trim().toLowerCase() !== value.toLowerCase() &&
    existing.some((e) => e.toLowerCase() === renameVal.trim().toLowerCase());

  const handleRename = async () => {
    const trimmed = renameVal.trim();
    if (!trimmed || trimmed === value || isDuplicate) {
      setRenameVal(value);
      setMode("view");
      return;
    }
    setLoading(true);
    try {
      await onRename(trimmed);
      setMode("view");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
    }
  };

  if (mode === "rename") {
    return (
      <div className="flex items-center gap-1 bg-gray-700 rounded-full px-2 py-1.5 ring-2 ring-blue-500/50">
        <input
          autoFocus
          value={renameVal}
          onChange={(e) => setRenameVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setRenameVal(value);
              setMode("view");
            }
          }}
          className="bg-transparent text-white text-xs outline-none w-24"
          maxLength={30}
        />
        {isDuplicate && (
          <span className="text-red-400 text-[10px]">ya existe</span>
        )}
        <button
          onClick={handleRename}
          disabled={loading || isDuplicate}
          className="text-green-400 hover:text-green-300 disabled:text-gray-600 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={() => {
            setRenameVal(value);
            setMode("view");
          }}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (mode === "delete") {
    return (
      <div className="flex items-center gap-1.5 bg-red-900/40 border border-red-700/60 rounded-full px-2.5 py-1.5">
        <span className="text-red-200 text-xs font-medium">{value}</span>
        <span className="text-red-500 text-[10px]">¿borrar?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-red-400 hover:text-red-300 disabled:text-gray-600 transition-colors"
          title="Confirmar"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={() => setMode("view")}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-0.5 rounded-full px-2.5 py-1.5 ${colorClass ?? "bg-gray-700 text-gray-300"}`}
    >
      <span className="text-xs font-semibold">{value}</span>
      <button
        onClick={() => {
          setRenameVal(value);
          setMode("rename");
        }}
        className="opacity-0 group-hover:opacity-70 hover:!opacity-100 ml-1 text-current transition-all"
        title="Renombrar"
      >
        <Pencil className="w-3 h-3" />
      </button>
      <button
        onClick={() => setMode("delete")}
        className="opacity-0 group-hover:opacity-70 hover:!opacity-100 text-current transition-all"
        title="Eliminar"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Add chip input ────────────────────────────────────────────────────────────

function AddChipInput({
  existing,
  onAdd,
  onCancel,
}: {
  existing: string[];
  onAdd: (value: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const trimmed = value.trim();
  const isDuplicate = existing.some(
    (e) => e.toLowerCase() === trimmed.toLowerCase(),
  );

  const handleAdd = async () => {
    if (!trimmed || isDuplicate) return;
    setLoading(true);
    try {
      await onAdd(trimmed);
      setValue("");
      onCancel();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-gray-700 rounded-full px-2 py-1.5">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Nuevo..."
        maxLength={30}
        className="bg-transparent text-white text-xs w-24 outline-none placeholder-gray-500"
      />
      <button
        onClick={handleAdd}
        disabled={!trimmed || isDuplicate || loading}
        title={isDuplicate ? "Ya existe" : "Agregar"}
        className="text-green-400 hover:text-green-300 disabled:text-gray-600 transition-colors"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Check className="w-3.5 h-3.5" />
        )}
      </button>
      <button
        onClick={onCancel}
        className="text-gray-400 hover:text-gray-200 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function CategoriesManagerModal({
  onClose,
  initialSection = "formas",
}: {
  onClose: () => void;
  initialSection?: "formas" | "conceptos";
}) {
  const {
    settings,
    renameForma,
    renameConcepto,
    deleteForma,
    deleteConcepto,
    updateFormas,
    updateConceptos,
  } = useUserSettings();

  const [addingForma, setAddingForma] = useState(false);
  const [addingConcepto, setAddingConcepto] = useState(false);
  const [activeSection] = useState(initialSection);

  const handleAddForma = async (name: string) => {
    await updateFormas([...settings.formas, name]);
  };

  const handleAddConcepto = async (name: string) => {
    await updateConceptos([...settings.conceptos, name]);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-sm font-semibold text-white">
            Gestionar formas y conceptos
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* ── Formas de pago ── */}
          <div
            className={`space-y-3 rounded-xl p-4 transition-colors ${activeSection === "formas" ? "ring-1 ring-blue-800/50 bg-blue-950/10" : ""}`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Formas de pago
              </h3>
              <span className="text-gray-600 text-xs">
                {settings.formas.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.formas.map((f) => (
                <Chip
                  key={f}
                  value={f}
                  colorClass={FORMA_BG[f as Forma] ?? "bg-gray-600 text-white"}
                  existing={settings.formas}
                  onRename={(newName) => renameForma(f, newName)}
                  onDelete={() => deleteForma(f)}
                />
              ))}
              {addingForma ? (
                <AddChipInput
                  existing={settings.formas}
                  onAdd={handleAddForma}
                  onCancel={() => setAddingForma(false)}
                />
              ) : (
                <button
                  onClick={() => setAddingForma(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-gray-500 hover:text-blue-400 bg-gray-800 border border-dashed border-gray-700 hover:border-blue-600 transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* ── Conceptos ── */}
          <div
            className={`space-y-3 rounded-xl p-4 transition-colors ${activeSection === "conceptos" ? "ring-1 ring-green-800/50 bg-green-950/10" : ""}`}
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-green-400" />
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Conceptos
              </h3>
              <span className="text-gray-600 text-xs">
                {settings.conceptos.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.conceptos.map((c) => (
                <Chip
                  key={c}
                  value={c}
                  colorClass={
                    CONCEPTO_BG[c as Concepto] ?? "bg-gray-600 text-white"
                  }
                  existing={settings.conceptos}
                  onRename={(newName) => renameConcepto(c, newName)}
                  onDelete={() => deleteConcepto(c)}
                />
              ))}
              {addingConcepto ? (
                <AddChipInput
                  existing={settings.conceptos}
                  onAdd={handleAddConcepto}
                  onCancel={() => setAddingConcepto(false)}
                />
              ) : (
                <button
                  onClick={() => setAddingConcepto(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-gray-500 hover:text-green-400 bg-gray-800 border border-dashed border-gray-700 hover:border-green-600 transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Note about orphaned gastos */}
          <p className="text-xs text-gray-600 leading-relaxed px-1">
            Al borrar una opción, los gastos que la usaban quedan sin concepto o
            forma asignado. Podés reasignarlos editando cada gasto.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 font-medium text-sm transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
