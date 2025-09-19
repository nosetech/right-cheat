'use client'

import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import { useThemeStore, type ThemeMode } from '@/hooks/useThemeStore'
import { darkTheme, lightTheme } from '@/theme/default'
import { ThemeProvider } from '@mui/material/styles'
import { listen } from '@tauri-apps/api/event'
import { ReactNode, useCallback, useEffect, useState } from 'react'

export function ThemeProviderWrapper({ children }: { children: ReactNode }) {
  const { themeMode: storedThemeMode, isLoading } = useThemeStore()
  const { getThemeMode } = usePreferencesStore()
  const [currentTheme, setCurrentTheme] = useState(lightTheme)

  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }
    return 'light'
  }

  const updateTheme = useCallback((mode: ThemeMode) => {
    let resolvedMode: 'light' | 'dark'

    if (mode === 'system') {
      resolvedMode = getSystemTheme()
    } else {
      resolvedMode = mode
    }

    setCurrentTheme(resolvedMode === 'dark' ? darkTheme : lightTheme)
  }, [])

  // Update theme when stored theme mode changes
  useEffect(() => {
    if (!isLoading) {
      updateTheme(storedThemeMode)
    }
  }, [storedThemeMode, isLoading, updateTheme])

  // Listen for system theme changes when mode is 'system'
  useEffect(() => {
    if (storedThemeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => updateTheme('system')

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [storedThemeMode, updateTheme])

  // Listen for theme change events from other windows
  useEffect(() => {
    const unlisten = listen('theme_changed', async () => {
      // Update theme without page reload by fetching latest theme from store
      try {
        const latestMode = await getThemeMode()
        updateTheme(latestMode)
      } catch (error) {
        console.error('Failed to update theme from event:', error)
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [getThemeMode, updateTheme])

  return (
    !isLoading && <ThemeProvider theme={currentTheme}>{children}</ThemeProvider>
  )
}
