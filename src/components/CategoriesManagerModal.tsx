import { useState, useRef, useEffect } from "react";
import { X, Pencil, Check, Plus, Loader2, CreditCard, Tag, Palette } from "lucide-react";
import { useUserSettings } from "@/contexts";
import { getChipHex, getChipStyle } from "@/utils/chipColor";

// ── Preset colour palette ─────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#22C55E", "#10B981", "#14B8A6", "#06B6D4",
  "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7",
  "#EC4899", "#6B7280", "#FFD700", "#009EE3",
];

// ── Color picker popover ──────────────────────────────────────────────────────

const PICKER_WIDTH = 194;

function ColorPicker({
  currentHex,
  onSelect,
  onClose,
  anchorRect,
}: {
  currentHex: string;
  onSelect: (hex: string) => void;
  onClose: () => void;
  anchorRect: DOMRect;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [custom, setCustom] = useState(currentHex);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Position fixed relative to the viewport so overflow-hidden parents don't clip it
  const top = anchorRect.bottom + 6;
  const left = Math.min(anchorRect.left, window.innerWidth - PICKER_WIDTH - 8);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top, left, width: PICKER_WIDTH, zIndex: 9999 }}
      className="bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-2xl"
    >
      {/* Preset grid */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {PRESET_COLORS.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => { onSelect(hex); onClose(); }}
            className="w-9 h-9 rounded-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/40"
            style={{ backgroundColor: hex }}
            title={hex}
          >
            {currentHex === hex && (
              <span className="flex items-center justify-center w-full h-full">
                <Check className="w-4 h-4 text-white drop-shadow" />
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Custom color input */}
      <div className="flex items-center gap-2 border-t border-gray-700 pt-2.5">
        <div
          className="w-7 h-7 rounded-md border border-gray-600 flex-shrink-0 overflow-hidden cursor-pointer relative"
          style={{ backgroundColor: custom }}
          title="Color personalizado"
        >
          <input
            type="color"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onBlur={(e) => { onSelect(e.target.value); onClose(); }}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={custom}
          onChange={(e) => {
            const val = e.target.value;
            setCustom(val);
            if (/^#[0-9a-fA-F]{6}$/.test(val)) onSelect(val);
          }}
          className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
          maxLength={7}
          placeholder="#RRGGBB"
        />
      </div>
    </div>
  );
}

// ── Single editable chip ──────────────────────────────────────────────────────

function Chip({
  value,
  chipStyle,
  currentHex,
  onRename,
  onDelete,
  onColorChange,
  existing,
}: {
  value: string;
  chipStyle: { backgroundColor: string; color: string };
  currentHex: string;
  onRename: (newName: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onColorChange: (hex: string) => Promise<void>;
  existing: string[];
}) {
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const [renameVal, setRenameVal] = useState(value);
  const [loading, setLoading] = useState(false);
  const [colorPickerAnchor, setColorPickerAnchor] = useState<DOMRect | null>(null);
  const paletteButtonRef = useRef<HTMLButtonElement>(null);

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

  const handleColorSelect = async (hex: string) => {
    await onColorChange(hex);
    setColorPickerAnchor(null);
  };

  if (mode === "rename") {
    return (
      <div
        className="flex items-center gap-1 rounded-full px-2 py-1.5 ring-2 ring-blue-500/50"
        style={chipStyle}
      >
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
          className="bg-transparent text-inherit text-xs outline-none w-24"
          style={{ color: chipStyle.color }}
          maxLength={30}
        />
        {isDuplicate && (
          <span className="text-red-400 text-[10px]">ya existe</span>
        )}
        <button
          onClick={handleRename}
          disabled={loading || isDuplicate}
          className="opacity-80 hover:opacity-100 disabled:opacity-30 transition-opacity"
          style={{ color: chipStyle.color }}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={() => { setRenameVal(value); setMode("view"); }}
          className="opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: chipStyle.color }}
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
    <div className="relative">
      <div
        className="group flex items-center gap-0.5 rounded-full px-2.5 py-1.5"
        style={chipStyle}
      >
        <span className="text-xs font-semibold">{value}</span>

        {/* Color picker button */}
        <button
          ref={paletteButtonRef}
          type="button"
          onClick={() =>
            setColorPickerAnchor((prev) =>
              prev ? null : paletteButtonRef.current?.getBoundingClientRect() ?? null
            )
          }
          className="opacity-0 group-hover:opacity-70 hover:!opacity-100 ml-1 transition-all"
          style={{ color: chipStyle.color }}
          title="Cambiar color"
        >
          <Palette className="w-3 h-3" />
        </button>

        {/* Rename button */}
        <button
          type="button"
          onClick={() => { setRenameVal(value); setMode("rename"); }}
          className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-all"
          style={{ color: chipStyle.color }}
          title="Renombrar"
        >
          <Pencil className="w-3 h-3" />
        </button>

        {/* Delete button */}
        <button
          type="button"
          onClick={() => setMode("delete")}
          className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-all"
          style={{ color: chipStyle.color }}
          title="Eliminar"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {colorPickerAnchor && (
        <ColorPicker
          currentHex={currentHex}
          onSelect={handleColorSelect}
          onClose={() => setColorPickerAnchor(null)}
          anchorRect={colorPickerAnchor}
        />
      )}
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
    updateFormaColor,
    updateConceptoColor,
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
                  chipStyle={getChipStyle(f, "forma", settings)}
                  currentHex={getChipHex(f, "forma", settings)}
                  existing={settings.formas}
                  onRename={(newName) => renameForma(f, newName)}
                  onDelete={() => deleteForma(f)}
                  onColorChange={(hex) => updateFormaColor(f, hex)}
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
                  chipStyle={getChipStyle(c, "concepto", settings)}
                  currentHex={getChipHex(c, "concepto", settings)}
                  existing={settings.conceptos}
                  onRename={(newName) => renameConcepto(c, newName)}
                  onDelete={() => deleteConcepto(c)}
                  onColorChange={(hex) => updateConceptoColor(c, hex)}
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
