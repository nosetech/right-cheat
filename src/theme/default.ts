'use client'

import { green, pink, red } from '@mui/material/colors'
import { createTheme, Theme } from '@mui/material/styles'

import { grey } from '@/theme/color'

const FONT_UI =
  '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif'

declare module '@mui/material/styles' {
  interface BreakpointOverrides {
    xs: true
    sm: true
    md: true
    lg: true
    xl: true
  }
  interface Palette {
    alert: { main: string }
    accent: { main: string }
    base: {
      main: string
      deep: string
      middle: string
      pale: string
      bright: string
    }
    switch: {
      checked: string
      unchecked: string
      track: string
      trackBackground: string
      checkedHover: string
      uncheckedHover: string
    }
  }
  interface PaletteOptions {
    alert?: { main?: string }
    accent?: { main?: string }
    base?: {
      main?: string
      deep?: string
      middle?: string
      pale?: string
      bright?: string
    }
    switch?: {
      checked?: string
      unchecked?: string
      track?: string
      trackBackground?: string
      checkedHover?: string
      uncheckedHover?: string
    }
  }
}

const getBaseThemeOptions = (fontScale: number = 1.0) => ({
  spacing: 8,
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 1280,
      lg: 1600,
      xl: 1920,
    },
  },
  typography: {
    fontFamily: FONT_UI,
    fontSize: 15 * fontScale,
    htmlFontSize: 15 * fontScale,
    body1: { fontSize: 15 * fontScale },
    body2: { fontSize: 15 * fontScale },
    button: { fontSize: 13 * fontScale, color: '#ffffff' },
    caption: { fontSize: 12 * fontScale },
    h1: { fontSize: 20 * fontScale, fontWeight: 700 },
    h2: { fontSize: 18 * fontScale, fontWeight: 700 },
    h3: { fontSize: 15 * fontScale, fontWeight: 500 },
    h4: { fontSize: 14 * fontScale },
  },
})

const getLightPalette = () => ({
  mode: 'light' as const,
  primary: { main: '#0071e3' },
  secondary: { main: pink[300] },
  error: { main: red[500] },
  warning: { main: '#f59e0b' },
  info: { main: '#0071e3' },
  success: { main: green[300] },
  text: {
    primary: '#1d1d1f',
    secondary: '#3a3a4a',
    disabled: 'rgba(0,0,0,0.28)',
  },
  divider: 'rgba(0,0,0,0.07)',
  alert: { main: '#FF6161' },
  accent: { main: '#0071e3' },
  base: {
    main: '#101010',
    deep: '#404040',
    middle: '#707070',
    pale: '#C0C0C0',
    bright: '#f5f5f5',
  },
  switch: {
    checked: '#0071e3',
    unchecked: grey[400],
    track: grey[300],
    trackBackground: 'rgba(0,0,0,0.12)',
    checkedHover: 'rgba(0,113,227,0.08)',
    uncheckedHover: 'rgba(0,0,0,0.08)',
  },
  background: {
    default: '#dce5f2',
    paper: '#e8eef6',
  },
})

const getDarkPalette = () => ({
  mode: 'dark' as const,
  primary: { main: '#64b4ff' },
  secondary: { main: pink[400] },
  error: { main: red[400] },
  warning: { main: '#f59e0b' },
  info: { main: '#64b4ff' },
  success: { main: green[400] },
  text: {
    primary: 'rgba(255,255,255,0.92)',
    secondary: 'rgba(180,210,255,0.65)',
    disabled: 'rgba(255,255,255,0.25)',
  },
  divider: 'rgba(255,255,255,0.08)',
  alert: { main: '#FF6161' },
  accent: { main: '#64b4ff' },
  base: {
    main: '#f5f5f5',
    deep: '#E8E8E8',
    middle: '#CFCFCF',
    pale: '#5A5A5A',
    bright: '#252525',
  },
  switch: {
    checked: '#64b4ff',
    unchecked: grey[600],
    track: grey[700],
    trackBackground: 'rgba(255,255,255,0.15)',
    checkedHover: 'rgba(100,180,255,0.08)',
    uncheckedHover: 'rgba(255,255,255,0.08)',
  },
  background: {
    default: '#0f2236',
    paper: '#0a1929',
  },
})

const baseThemeOptions = getBaseThemeOptions()

const lightComponents = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        background: 'linear-gradient(145deg,#e8eef6 0%,#dce5f2 100%)',
        minHeight: '100vh',
      },
    },
  },
}

const darkComponents = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        background: 'linear-gradient(145deg,#0a1929 0%,#0f2236 100%)',
        minHeight: '100vh',
      },
    },
  },
}

export const lightTheme: Theme = createTheme({
  ...baseThemeOptions,
  palette: getLightPalette(),
  typography: {
    ...baseThemeOptions.typography,
    body2: { ...baseThemeOptions.typography.body2, color: grey[300] },
  },
  components: lightComponents,
})

export const darkTheme: Theme = createTheme({
  ...baseThemeOptions,
  palette: getDarkPalette(),
  typography: {
    ...baseThemeOptions.typography,
    body2: { ...baseThemeOptions.typography.body2, color: grey[600] },
  },
  components: darkComponents,
})

export const defaultTheme = lightTheme

export const createScaledLightTheme = (fontScale: number = 1.0): Theme => {
  const scaledBaseOptions = getBaseThemeOptions(fontScale)
  return createTheme({
    ...scaledBaseOptions,
    palette: getLightPalette(),
    typography: {
      ...scaledBaseOptions.typography,
      body2: { fontSize: 15 * fontScale, color: grey[300] },
    },
    components: lightComponents,
  })
}

export const createScaledDarkTheme = (fontScale: number = 1.0): Theme => {
  const scaledBaseOptions = getBaseThemeOptions(fontScale)
  return createTheme({
    ...scaledBaseOptions,
    palette: getDarkPalette(),
    typography: {
      ...scaledBaseOptions.typography,
      body2: { fontSize: 15 * fontScale, color: grey[600] },
    },
    components: darkComponents,
  })
}
