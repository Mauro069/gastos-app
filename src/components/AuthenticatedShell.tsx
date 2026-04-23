/**
 * AuthenticatedShell — wraps all logged-in pages with Sidebar + layout.
 * Usage: wrap each authenticated route with <AuthenticatedShell>.
 */
import { useAuth } from '@/contexts'
import AppShell from './AppShell'

interface Props {
  children: React.ReactNode
  onQuickAdd?: () => void
}

export default function AuthenticatedShell({ children, onQuickAdd }: Props) {
  const { user } = useAuth()

  // If not authenticated, pages handle their own redirect (keeps existing behavior)
  return (
    <AppShell user={user} onQuickAdd={onQuickAdd}>
      {children}
    </AppShell>
  )
}
