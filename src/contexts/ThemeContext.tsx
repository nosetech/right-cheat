'use client'

import { darkTheme, lightTheme } from '@/theme/default'
import { Theme } from '@mui/material/styles'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  themeMode: ThemeMode
  currentTheme: Theme
  setThemeMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  initialThemeMode?: ThemeMode
}

export function CustomThemeProvider({
  children,
  initialThemeMode = 'system',
}: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialThemeMode)
  const [currentTheme, setCurrentTheme] = useState<Theme>(lightTheme)

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

  useEffect(() => {
    updateTheme(themeMode)
  }, [themeMode, updateTheme])

  useEffect(() => {
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => updateTheme('system')

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [themeMode, updateTheme])

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode)
  }

  return (
    <ThemeContext.Provider value={{ themeMode, currentTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a CustomThemeProvider')
  }
  return context
}
