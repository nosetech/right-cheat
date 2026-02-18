import { load, StoreOptions } from '@tauri-apps/plugin-store'
import { type ThemeMode } from './useThemeStore'

const PREFERENCES_FILENAME = 'rightcheat-settings.json'

export const usePreferencesStore = (options?: StoreOptions) => {
  const loadPreferencesFile = () => {
    return load(PREFERENCES_FILENAME, options ?? { autoSave: true })
  }

  const getCheatSheetFilePath = async () => {
    const store = await loadPreferencesFile()
    const inputpath = await store.get<{ path: string }>('input_path')
    return inputpath != undefined ? inputpath.path : ''
  }

  const setCheatSheetFilePath = async (filepath: string) => {
    const store = await loadPreferencesFile()
    await store.set('input_path', { path: filepath })
  }

  const getThemeMode = async (): Promise<ThemeMode> => {
    const store = await loadPreferencesFile()
    const theme = await store.get<{ mode: ThemeMode }>('theme')
    return theme?.mode ?? 'system'
  }

  const setThemeMode = async (mode: ThemeMode) => {
    const store = await loadPreferencesFile()
    await store.set('theme', { mode })
  }

  const getVisibleOnAllWorkspacesSettings = async (): Promise<boolean> => {
    const store = await loadPreferencesFile()
    const settings = await store.get<{ enabled: boolean }>(
      'visible_on_all_workspaces_settings',
    )
    return settings?.enabled ?? true
  }

  return {
    getCheatSheetFilePath,
    setCheatSheetFilePath,
    getThemeMode,
    setThemeMode,
    getVisibleOnAllWorkspacesSettings,
  }
}
