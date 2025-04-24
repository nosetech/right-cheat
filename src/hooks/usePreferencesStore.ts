import { load, StoreOptions } from '@tauri-apps/plugin-store'

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

  return {
    getCheatSheetFilePath,
    setCheatSheetFilePath,
  }
}
