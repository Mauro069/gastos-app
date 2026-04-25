import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

/**
 * Year-only picker – same visual style as MonthPicker.
 */
export default function YearPicker({
  year,
  onChange,
}: {
  year: number
  onChange: (y: number) => void
}) {
  const [open, setOpen] = useState(false)
  // Show a 12-year block; initialize so the selected year is visible
  const [blockStart, setBlockStart] = useState(() => year - (year % 12))
  const ref = useRef<HTMLDivElement>(null)

  // Keep blockStart in sync if year changes externally and falls outside current block
  useEffect(() => {
    if (year < blockStart || year >= blockStart + 12) {
      setBlockStart(year - (year % 12))
    }
  }, [year, blockStart])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const years = Array.from({ length: 12 }, (_, i) => blockStart + i)

  return (
    <div ref={ref} className="flex items-center gap-0.5 relative">
      {/* Prev year */}
      <button
        onClick={() => onChange(year - 1)}
        className="p-1.5 rounded-md transition-opacity hover:opacity-70"
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)" }}
      >
        <ChevronLeft size={15} strokeWidth={2} />
      </button>

      {/* Label button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
        style={{
          background: open ? "var(--surface-alt)" : "var(--surface)",
          color: "var(--ink)",
          border: "1px solid var(--line)",
          cursor: "pointer",
        }}
      >
        <Calendar size={12} style={{ color: "var(--ink-3)" }} />
        <span className="num" style={{ minWidth: 36, textAlign: "center" }}>{year}</span>
      </button>

      {/* Next year */}
      <button
        onClick={() => onChange(year + 1)}
        className="p-1.5 rounded-md transition-opacity hover:opacity-70"
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)" }}
      >
        <ChevronRight size={15} strokeWidth={2} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full mt-1 rounded-xl shadow-xl z-50 p-3"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            width: 200,
            right: 0,
          }}
        >
          {/* Block nav */}
          <div className="flex items-center justify-between mb-2.5 px-1">
            <button
              onClick={() => setBlockStart((b) => b - 12)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: "2px 6px" }}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="num text-xs font-semibold" style={{ color: "var(--ink-3)" }}>
              {blockStart}–{blockStart + 11}
            </span>
            <button
              onClick={() => setBlockStart((b) => b + 12)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: "2px 6px" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Year grid */}
          <div className="grid grid-cols-3 gap-1">
            {years.map((y) => {
              const isActive = y === year
              return (
                <button
                  key={y}
                  onClick={() => { onChange(y); setOpen(false) }}
                  className="py-1.5 text-xs font-medium rounded-lg transition-colors num"
                  style={{
                    background: isActive ? "var(--accent)" : "transparent",
                    color: isActive ? "var(--accent-ink)" : "var(--ink-2)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {y}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
