import { createContext, useContext, useEffect, useState } from 'react'
import { getUserSettings, saveUserSettings } from '@/api'
import { useAuth } from './AuthContext'
import type { UserSettings, UserSettingsContextValue } from '@/types'
import { FORMAS, CONCEPTOS } from '@/constants'

const DEFAULT_SETTINGS: UserSettings = {
  formas: [...FORMAS],
  conceptos: [...CONCEPTOS],
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null)

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS)
      return
    }
    setLoading(true)
    getUserSettings()
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  const updateFormas = async (formas: string[]) => {
    const next = { ...settings, formas }
    setSettings(next)
    await saveUserSettings(next)
  }

  const updateConceptos = async (conceptos: string[]) => {
    const next = { ...settings, conceptos }
    setSettings(next)
    await saveUserSettings(next)
  }

  return (
    <UserSettingsContext.Provider value={{ settings, updateFormas, updateConceptos, loading }}>
      {children}
    </UserSettingsContext.Provider>
  )
}

export function useUserSettings(): UserSettingsContextValue {
  const ctx = useContext(UserSettingsContext)
  if (!ctx) throw new Error('useUserSettings must be used within UserSettingsProvider')
  return ctx
}
