'use client'

export type ThemeMode = 'light' | 'dark' | 'system'
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
      } catch (error) {
        console.error('Failed to load theme mode:', error)
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
    } catch (error) {
      console.error('Failed to save theme mode:', error)
    }
  }

  return {
    themeMode,
    setThemeMode,
    isLoading,
  }
}
