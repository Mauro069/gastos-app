import { Plus, Settings2, AlertTriangle } from "lucide-react";
import { getChipStyle } from "@/utils/chipColor";
import type { UserSettings } from "@/types";
import AddChipInput from "./AddChipInput";

interface ChipSelectorFieldProps {
  label: string;
  items: string[];
  allItems: string[];
  selected: string;
  chipType: "forma" | "concepto";
  settings: UserSettings;
  isAdding: boolean;
  onSelect: (value: string) => void;
  onAdd: (value: string) => void;
  onStartAdding: () => void;
  onCancelAdding: () => void;
  onManage: () => void;
  addTitle: string;
}

export default function ChipSelectorField({
  label,
  items,
  allItems,
  selected,
  chipType,
  settings,
  isAdding,
  onSelect,
  onAdd,
  onStartAdding,
  onCancelAdding,
  onManage,
  addTitle,
}: ChipSelectorFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">
          {label}
        </label>
        <button
          type="button"
          onClick={onManage}
          className="text-gray-600 hover:text-gray-300 transition-colors"
          title={`Gestionar ${label.toLowerCase()}`}
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isOrphaned = !allItems.includes(item);
          const isSelected = selected === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelect(item)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                isOrphaned
                  ? isSelected
                    ? "bg-orange-900/50 border border-orange-500/70 text-orange-200 ring-2 ring-orange-400/30 scale-105"
                    : "bg-orange-900/20 border border-dashed border-orange-700/50 text-orange-500 hover:bg-orange-900/30"
                  : isSelected
                    ? "ring-2 ring-white/30 scale-105"
                    : "opacity-60 hover:opacity-100"
              }`}
              style={isOrphaned ? undefined : getChipStyle(item, chipType, settings)}
              title={isOrphaned ? "Este valor fue eliminado de la lista" : undefined}
            >
              {isOrphaned && <AlertTriangle className="w-3 h-3" />}
              {item}
            </button>
          );
        })}

        {isAdding ? (
          <AddChipInput
            existing={allItems}
            onAdd={onAdd}
            onCancel={onCancelAdding}
          />
        ) : (
          <button
            type="button"
            onClick={onStartAdding}
            title={addTitle}
            className="px-2.5 py-1.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-500 hover:text-green-400 hover:bg-gray-700 border border-dashed border-gray-600 hover:border-green-500 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
