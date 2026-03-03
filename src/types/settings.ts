export interface UserSettings {
  formas: string[]
  conceptos: string[]
  formaColors?: Record<string, string>    // hex e.g. "#3B82F6"
  conceptoColors?: Record<string, string> // hex e.g. "#22C55E"
}

export interface UserSettingsContextValue {
  settings: UserSettings
  updateFormas: (formas: string[]) => Promise<void>
  updateConceptos: (conceptos: string[]) => Promise<void>
  renameForma: (oldName: string, newName: string) => Promise<void>
  renameConcepto: (oldName: string, newName: string) => Promise<void>
  deleteForma: (name: string) => Promise<void>
  deleteConcepto: (name: string) => Promise<void>
  updateFormaColor: (name: string, color: string) => Promise<void>
  updateConceptoColor: (name: string, color: string) => Promise<void>
  loading: boolean
}
