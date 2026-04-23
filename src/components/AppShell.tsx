import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  DollarSign,
  Wallet,
  History,
  Target,
  User,
  Plus,
  TrendingUp,
} from 'lucide-react'

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Finanzas',
    items: [
      { id: '/',          label: 'Gastos',      Icon: LayoutDashboard, key: 'G' },
      { id: '/promedios', label: 'Promedios',   Icon: TrendingUp,      key: 'P' },
      { id: '/ingresos',  label: 'Ingresos',    Icon: DollarSign,      key: 'I' },
      { id: '/activos',   label: 'Activos',     Icon: Wallet,          key: 'A' },
    ],
  },
  {
    label: 'Planificación',
    items: [
      { id: '/presupuesto', label: 'Presupuesto', Icon: Target,   key: 'B' },
      { id: '/historial',   label: 'Historial',   Icon: History,  key: 'H' },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { id: '/perfil', label: 'Perfil', Icon: User, key: ',' },
    ],
  },
]

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ user }: { user?: { email?: string; user_metadata?: Record<string, unknown> } | null }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = (id: string) =>
    id === '/' ? pathname === '/' : pathname.startsWith(id)

  const initials =
    ((user?.user_metadata?.full_name as string) || user?.email || 'U')
      .charAt(0)
      .toUpperCase()

  return (
    <aside
      className="hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen overflow-y-auto"
      style={{
        width: 228,
        background: 'var(--surface)',
        borderRight: '1px solid var(--line)',
        padding: '18px 12px 14px',
        gap: 2,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2.5 pb-5">
        <div
          className="flex-shrink-0 grid place-items-center rounded-lg text-sm font-bold"
          style={{
            width: 28, height: 28,
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
          }}
        >
          g
        </div>
        <span className="text-sm font-semibold" style={{ letterSpacing: '-0.01em' }}>
          gastos
        </span>
        <span
          className="ml-auto text-[9px] num px-1.5 py-0.5 rounded"
          style={{
            color: 'var(--ink-3)',
            border: '1px solid var(--line)',
            background: 'var(--surface)',
          }}
        >
          v2.6
        </span>
      </div>

      {/* Nav groups */}
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p
            className="text-[10px] font-medium uppercase tracking-widest px-2.5 pb-1.5 pt-3"
            style={{ color: 'var(--ink-3)' }}
          >
            {group.label}
          </p>
          {group.items.map(({ id, label, Icon, key }) => {
            const isActive = active(id)
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`relative flex items-center gap-2.5 w-full px-2.5 py-2 text-[13px] rounded-lg transition-colors text-left ${
                  isActive ? 'nav-active' : ''
                }`}
                style={{
                  background: isActive ? 'var(--surface-alt)' : 'transparent',
                  color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Icon
                  size={15}
                  strokeWidth={1.5}
                  style={{ color: isActive ? 'var(--accent)' : 'var(--ink-3)', flexShrink: 0 }}
                />
                <span className="flex-1">{label}</span>
                <kbd
                  className="text-[9px] num px-1.5 py-0.5 rounded"
                  style={{
                    color: 'var(--ink-3)',
                    border: '1px solid var(--line)',
                    background: 'var(--surface)',
                  }}
                >
                  {key}
                </kbd>
              </button>
            )
          })}
        </div>
      ))}

      {/* User footer */}
      {user && (
        <div
          className="mt-auto flex items-center gap-2.5 px-2.5 pt-3"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url as string}
              alt=""
              className="w-7 h-7 rounded-full flex-shrink-0"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 grid place-items-center text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--positive))',
                color: 'var(--accent-ink)',
              }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>
              {(user.user_metadata?.full_name as string) || 'Usuario'}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'var(--ink-3)' }}>
              {user.email}
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}

// ── Mobile bottom nav ─────────────────────────────────────────────────────────

function MobileNav({ onQuickAdd }: { onQuickAdd?: () => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = (id: string) =>
    id === '/' ? pathname === '/' : pathname.startsWith(id)

  const mobileItems = [
    { id: '/',           label: 'Gastos',   Icon: LayoutDashboard },
    { id: '/ingresos',   label: 'Ingresos', Icon: DollarSign },
    { id: '/presupuesto',label: 'Budget',   Icon: Target },
    { id: '/activos',    label: 'Activos',  Icon: Wallet },
    { id: '/perfil',     label: 'Perfil',   Icon: User },
  ]

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-center"
      style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--line)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {mobileItems.map(({ id, label, Icon }, i) => {
        // Insert FAB in the middle
        const isMiddle = i === 2
        const isActive = active(id)
        return (
          <div key={id} className="flex-1 flex justify-center">
            {isMiddle && onQuickAdd ? (
              <button
                onClick={onQuickAdd}
                className="grid place-items-center rounded-full -translate-y-3 shadow-lg"
                style={{
                  width: 48, height: 48,
                  background: 'var(--accent)',
                  color: 'var(--accent-ink)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus size={20} strokeWidth={2} />
              </button>
            ) : (
              <button
                onClick={() => navigate(id)}
                className="flex flex-col items-center gap-0.5 py-2.5 px-2 transition-colors"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isActive ? 'var(--accent)' : 'var(--ink-3)',
                }}
              >
                <Icon size={20} strokeWidth={1.5} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// ── AppShell ──────────────────────────────────────────────────────────────────

interface AppShellProps {
  user?: { email?: string; user_metadata?: Record<string, unknown> } | null
  onQuickAdd?: () => void
  children: React.ReactNode
}

export default function AppShell({ user, onQuickAdd, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar user={user} />

      <div className="flex-1 min-w-0 flex flex-col">
        {children}
      </div>

      <MobileNav onQuickAdd={onQuickAdd} />
    </div>
  )
}
