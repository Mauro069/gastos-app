import { createContext, useContext, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getUserSettings, saveUserSettings, bulkRenameGastoField } from '@/api'
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
  const queryClient = useQueryClient()
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
  }, [user?.id])

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

  const renameForma = async (oldName: string, newName: string) => {
    await bulkRenameGastoField('forma', oldName, newName)
    const next = { ...settings, formas: settings.formas.map(f => f === oldName ? newName : f) }
    setSettings(next)
    await saveUserSettings(next)
    queryClient.invalidateQueries({ queryKey: ['gastos'] })
  }

  const renameConcepto = async (oldName: string, newName: string) => {
    await bulkRenameGastoField('concepto', oldName, newName)
    const next = { ...settings, conceptos: settings.conceptos.map(c => c === oldName ? newName : c) }
    setSettings(next)
    await saveUserSettings(next)
    queryClient.invalidateQueries({ queryKey: ['gastos'] })
  }

  const deleteForma = async (name: string) => {
    const next = { ...settings, formas: settings.formas.filter(f => f !== name) }
    setSettings(next)
    await saveUserSettings(next)
    // gastos with this forma become orphaned — intentional
  }

  const deleteConcepto = async (name: string) => {
    const next = { ...settings, conceptos: settings.conceptos.filter(c => c !== name) }
    setSettings(next)
    await saveUserSettings(next)
    // gastos with this concepto become orphaned — intentional
  }

  return (
    <UserSettingsContext.Provider value={{ settings, updateFormas, updateConceptos, renameForma, renameConcepto, deleteForma, deleteConcepto, loading }}>
      {children}
    </UserSettingsContext.Provider>
  )
}

export function useUserSettings(): UserSettingsContextValue {
  const ctx = useContext(UserSettingsContext)
  if (!ctx) throw new Error('useUserSettings must be used within UserSettingsProvider')
  return ctx
}
