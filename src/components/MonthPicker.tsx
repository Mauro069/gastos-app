import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { MONTH_NAMES, MONTH_FULL } from "@/constants"

/**
 * Month/year picker – uses 0-indexed months (Jan = 0) to match JS Date convention.
 */
export default function MonthPicker({
  year,
  month,
  onChange,
}: {
  year: number
  month: number
  onChange: (y: number, m: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(year)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPickerYear(year)
  }, [year])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const select = (m: number) => {
    onChange(pickerYear, m)
    setOpen(false)
  }

  const prevMonth = () => {
    const pm = month === 0 ? 11 : month - 1
    const py = month === 0 ? year - 1 : year
    onChange(py, pm)
  }

  const nextMonth = () => {
    const nm = month === 11 ? 0 : month + 1
    const ny = month === 11 ? year + 1 : year
    onChange(ny, nm)
  }

  return (
    <div ref={ref} className="flex items-center gap-0.5 relative">
      {/* Prev */}
      <button
        onClick={prevMonth}
        className="p-1.5 rounded-md transition-opacity hover:opacity-70"
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)" }}
      >
        <ChevronLeft size={15} strokeWidth={2} />
      </button>

      {/* Label */}
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
        <span style={{ minWidth: 110, textAlign: "center" }}>
          {MONTH_FULL[month]} {year}
        </span>
      </button>

      {/* Next */}
      <button
        onClick={nextMonth}
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
            width: 220,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {/* Year nav */}
          <div className="flex items-center justify-between mb-2.5 px-1">
            <button
              onClick={() => setPickerYear((y) => y - 1)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: "2px 6px" }}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="num text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {pickerYear}
            </span>
            <button
              onClick={() => setPickerYear((y) => y + 1)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: "2px 6px" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1">
            {MONTH_NAMES.map((name, idx) => {
              const isActive = idx === month && pickerYear === year
              return (
                <button
                  key={idx}
                  onClick={() => select(idx)}
                  className="py-1.5 text-xs font-medium rounded-lg transition-colors"
                  style={{
                    background: isActive ? "var(--accent)" : "transparent",
                    color: isActive ? "var(--accent-ink)" : "var(--ink-2)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
