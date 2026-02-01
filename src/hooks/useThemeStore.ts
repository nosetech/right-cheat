'use client'

export type ThemeMode = 'light' | 'dark' | 'system'
import { error } from '@tauri-apps/plugin-log'
import { useEffect, useState } from 'react'
import { usePreferencesStore } from './usePreferencesStore'

export const useThemeStore = () => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system')
  const [isLoading, setIsLoading] = useState(true)
  const { getThemeMode, setThemeMode: persistThemeMode } = usePreferencesStore()

  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedMode = await getThemeMode()
        setThemeModeState(savedMode)
      } catch (err) {
        error(`Failed to load theme mode: ${err}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadThemeMode()
  }, [getThemeMode])

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode)
      await persistThemeMode(mode)
    } catch (err) {
      error(`Failed to save theme mode: ${err}`)
    }
  }

  return {
    themeMode,
    setThemeMode,
    isLoading,
  }
}
