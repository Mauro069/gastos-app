import { useState, useEffect, useRef } from "react";
import { X, Check } from "lucide-react";

interface AddChipInputProps {
  onAdd: (value: string) => void;
  onCancel: () => void;
  existing: string[];
}

export default function AddChipInput({ onAdd, onCancel, existing }: AddChipInputProps) {
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
