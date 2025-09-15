'use client'

import { CustomThemeProvider, useTheme } from '@/contexts/ThemeContext'
import { useThemeStore } from '@/hooks/useThemeStore'
import { ThemeProvider } from '@mui/material/styles'
import { ReactNode, useEffect } from 'react'

function ThemeProviderInner({ children }: { children: ReactNode }) {
  const { currentTheme, setThemeMode } = useTheme()
  const { themeMode, isLoading } = useThemeStore()

  useEffect(() => {
    if (!isLoading) {
      setThemeMode(themeMode)
    }
  }, [themeMode, isLoading, setThemeMode])

  return <ThemeProvider theme={currentTheme}>{children}</ThemeProvider>
}

export function ThemeProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <CustomThemeProvider>
      <ThemeProviderInner>{children}</ThemeProviderInner>
    </CustomThemeProvider>
  )
}
