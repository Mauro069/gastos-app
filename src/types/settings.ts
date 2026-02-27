export interface UserSettings {
  formas: string[]
  conceptos: string[]
}

export interface UserSettingsContextValue {
  settings: UserSettings
  updateFormas: (formas: string[]) => Promise<void>
  updateConceptos: (conceptos: string[]) => Promise<void>
  loading: boolean
}
