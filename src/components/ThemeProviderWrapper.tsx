'use client'

import { useFontSize } from '@/hooks/useFontSize'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import { useThemeStore, type ThemeMode } from '@/hooks/useThemeStore'
import {
  createScaledDarkTheme,
  createScaledLightTheme,
  lightTheme,
} from '@/theme/default'
import { ThemeProvider } from '@mui/material/styles'
import { listen } from '@tauri-apps/api/event'
import { ReactNode, useCallback, useEffect, useState } from 'react'

export function ThemeProviderWrapper({ children }: { children: ReactNode }) {
  const { themeMode: storedThemeMode, isLoading } = useThemeStore()
  const { getThemeMode } = usePreferencesStore()
  const { fontSizeSettings } = useFontSize()
  const [currentTheme, setCurrentTheme] = useState(lightTheme)

  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }
    return 'light'
  }

  const updateTheme = useCallback(
    (mode: ThemeMode, fontScale: number = 1.0) => {
      let resolvedMode: 'light' | 'dark'

      if (mode === 'system') {
        resolvedMode = getSystemTheme()
      } else {
        resolvedMode = mode
      }

      const theme =
        resolvedMode === 'dark'
          ? createScaledDarkTheme(fontScale)
          : createScaledLightTheme(fontScale)
      setCurrentTheme(theme)
    },
    [],
  )

  // Update theme when stored theme mode or font size changes
  useEffect(() => {
    if (!isLoading) {
      updateTheme(storedThemeMode, fontSizeSettings.scale)
    }
  }, [storedThemeMode, isLoading, fontSizeSettings.scale, updateTheme])

  // Listen for system theme changes when mode is 'system'
  useEffect(() => {
    if (storedThemeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => updateTheme('system', fontSizeSettings.scale)

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [storedThemeMode, fontSizeSettings.scale, updateTheme])

  // Listen for theme change events from other windows
  useEffect(() => {
    const unlisten = listen('theme_changed', async () => {
      // Update theme without page reload by fetching latest theme from store
      try {
        const latestMode = await getThemeMode()
        updateTheme(latestMode, fontSizeSettings.scale)
      } catch (error) {
        console.error('Failed to update theme from event:', error)
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [getThemeMode, fontSizeSettings.scale, updateTheme])

  return (
    !isLoading && <ThemeProvider theme={currentTheme}>{children}</ThemeProvider>
  )
}
