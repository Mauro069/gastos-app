import { Loader2, Bell } from 'lucide-react'
import { AppShell } from '@/components'

export default function RecordatoriosPage() {
  return (
    <AppShell>
      {/* ── Header ── */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-5"
        style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}
      >
        <Bell className="w-4 h-4 hidden sm:block" style={{ color: 'var(--accent)' }} />
        <h1 className="text-sm font-semibold hidden sm:block" style={{ color: 'var(--ink)' }}>Recordatorios</h1>
        <div className="flex-1" />
      </header>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col items-center justify-center py-24 gap-4" style={{ color: 'var(--ink-3)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'var(--surface-alt)' }}>
            🔔
          </div>
          <p className="text-sm">Próximamente: crea recordatorios personalizados</p>
        </div>
      </main>
    </AppShell>
  )
}
