'use client'

import { useThemeStore, type ThemeMode } from '@/hooks/useThemeStore'
import { darkTheme, lightTheme } from '@/theme/default'
import { ThemeProvider } from '@mui/material/styles'
import { listen } from '@tauri-apps/api/event'
import { ReactNode, useCallback, useEffect, useState } from 'react'

export function ThemeProviderWrapper({ children }: { children: ReactNode }) {
  const { themeMode: storedThemeMode, isLoading } = useThemeStore()
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
      // Reload the page to pick up the new theme from store
      window.location.reload()
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  return <ThemeProvider theme={currentTheme}>{children}</ThemeProvider>
}
