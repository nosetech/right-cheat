import { load, StoreOptions } from '@tauri-apps/plugin-store'
import { useCallback } from 'react'
import { type ThemeMode } from './useThemeStore'

const PREFERENCES_FILENAME = 'rightcheat-settings.json'

export const usePreferencesStore = (options?: StoreOptions) => {
  const loadPreferencesFile = useCallback(() => {
    return load(PREFERENCES_FILENAME, options ?? { autoSave: true })
  }, [options])

  const getCheatSheetFilePath = useCallback(async () => {
    const store = await loadPreferencesFile()
    const inputpath = await store.get<{ path: string }>('input_path')
    return inputpath != undefined ? inputpath.path : ''
  }, [loadPreferencesFile])

  const setCheatSheetFilePath = useCallback(
    async (filepath: string) => {
      const store = await loadPreferencesFile()
      await store.set('input_path', { path: filepath })
      await store.save()
    },
    [loadPreferencesFile],
  )

  const getThemeMode = useCallback(async (): Promise<ThemeMode> => {
    const store = await loadPreferencesFile()
    const theme = await store.get<{ mode: ThemeMode }>('theme')
    return theme?.mode ?? 'system'
  }, [loadPreferencesFile])

  const setThemeMode = useCallback(
    async (mode: ThemeMode) => {
      const store = await loadPreferencesFile()
      await store.set('theme', { mode })
      await store.save()
    },
    [loadPreferencesFile],
  )

  const getVisibleOnAllWorkspacesSettings =
    useCallback(async (): Promise<boolean> => {
      const store = await loadPreferencesFile()
      const settings = await store.get<{ enabled: boolean }>(
        'visible_on_all_workspaces_settings',
      )
      return settings?.enabled ?? true
    }, [loadPreferencesFile])

  const getConfirmActions = useCallback(async (): Promise<boolean> => {
    const store = await loadPreferencesFile()
    const setting = await store.get<{ enabled: boolean }>('confirm_actions')
    return setting?.enabled ?? true
  }, [loadPreferencesFile])

  const setConfirmActions = useCallback(
    async (enabled: boolean) => {
      const store = await loadPreferencesFile()
      await store.set('confirm_actions', { enabled })
      await store.save()
    },
    [loadPreferencesFile],
  )

  return {
    getCheatSheetFilePath,
    setCheatSheetFilePath,
    getThemeMode,
    setThemeMode,
    getVisibleOnAllWorkspacesSettings,
    getConfirmActions,
    setConfirmActions,
  }
}
