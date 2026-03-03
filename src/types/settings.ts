export interface UserSettings {
  formas: string[]
  conceptos: string[]
}

export interface UserSettingsContextValue {
  settings: UserSettings
  updateFormas: (formas: string[]) => Promise<void>
  updateConceptos: (conceptos: string[]) => Promise<void>
  renameForma: (oldName: string, newName: string) => Promise<void>
  renameConcepto: (oldName: string, newName: string) => Promise<void>
  deleteForma: (name: string) => Promise<void>
  deleteConcepto: (name: string) => Promise<void>
  loading: boolean
}
