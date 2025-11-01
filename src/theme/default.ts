'use client'

import { blue, cyan, green, pink, red, yellow } from '@mui/material/colors'
import { createTheme, Theme } from '@mui/material/styles'

import { grey } from '@/theme/color'

import { Roboto } from 'next/font/google'

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
})

declare module '@mui/material/styles' {
  interface BreakpointOverrides {
    xs: true
    sm: true
    md: true
    lg: true
    xl: true
  }
  interface Palette {
    alert: {
      main: string
    }
    base: {
      main: string
      deep: string
      middle: string
      pale: string
      bright: string
    }
  }
  interface PaletteOptions {
    alert?: {
      main?: string
    }
    base?: {
      main?: string
      deep?: string
      middle?: string
      pale?: string
      bright?: string
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
    fontFamily: roboto.style.fontFamily,
    fontSize: 15 * fontScale,
    htmlFontSize: 15 * fontScale,
    body1: { fontSize: 15 * fontScale },
    body2: {
      fontSize: 15 * fontScale,
    },
    button: {
      fontSize: 13 * fontScale,
      color: '#ffffff',
    },
    caption: { fontSize: 12 * fontScale },
    h1: {
      fontSize: 20 * fontScale,
      fontWeight: 700,
    },
    h2: {
      fontSize: 18 * fontScale,
      fontWeight: 700,
    },
    h3: {
      fontSize: 15 * fontScale,
      fontWeight: 500,
    },
    h4: {
      fontSize: 14 * fontScale,
    },
  },
})

const getLightPalette = () => ({
  mode: 'light' as const,
  primary: {
    main: blue[300],
  },
  secondary: {
    main: pink[300],
  },
  error: {
    main: red[500],
  },
  warning: {
    main: yellow[500],
  },
  info: {
    main: cyan[300],
  },
  success: {
    main: green[300],
  },
  text: {
    primary: '#181818',
    secondary: '#313131',
    disabled: '#BEBEBF',
  },
  alert: {
    main: '#FF6161',
  },
  base: {
    main: '#101010',
    deep: '#404040',
    middle: '#707070',
    pale: '#C0C0C0',
    bright: '#f5f5f5',
  },
  background: {
    default: grey[0],
    paper: grey[0],
  },
})

const getDarkPalette = () => ({
  mode: 'dark' as const,
  primary: {
    main: grey[900],
  },
  secondary: {
    main: pink[400],
  },
  error: {
    main: red[400],
  },
  warning: {
    main: yellow[600],
  },
  info: {
    main: cyan[400],
  },
  success: {
    main: green[400],
  },
  text: {
    primary: '#ffffff',
    secondary: '#AEC0E4',
    disabled: '#707070',
  },
  alert: {
    main: '#FF0000',
  },
  base: {
    main: '#f5f5f5',
    deep: '#E8E8E8',
    middle: '#CFCFCF',
    pale: '#5A5A5A',
    bright: '#252525',
  },
  background: {
    default: '#163050',
    paper: '#163050',
  },
})

const baseThemeOptions = getBaseThemeOptions()

export const lightTheme: Theme = createTheme({
  ...baseThemeOptions,
  palette: getLightPalette(),
  typography: {
    ...baseThemeOptions.typography,
    body2: {
      fontSize: 15,
      color: grey[300],
    },
  },
})

export const darkTheme: Theme = createTheme({
  ...baseThemeOptions,
  palette: getDarkPalette(),
  typography: {
    ...baseThemeOptions.typography,
    body2: {
      fontSize: 15,
      color: grey[600],
    },
  },
})

// 後方互換性のためのデフォルトテーマ
export const defaultTheme = lightTheme

// フォントサイズスケールを適用してテーマを生成する関数
export const createScaledLightTheme = (fontScale: number = 1.0): Theme => {
  const scaledBaseOptions = getBaseThemeOptions(fontScale)
  return createTheme({
    ...scaledBaseOptions,
    palette: getLightPalette(),
    typography: {
      ...scaledBaseOptions.typography,
      body2: {
        fontSize: 15 * fontScale,
        color: grey[300],
      },
    },
  })
}

export const createScaledDarkTheme = (fontScale: number = 1.0): Theme => {
  const scaledBaseOptions = getBaseThemeOptions(fontScale)
  return createTheme({
    ...scaledBaseOptions,
    palette: getDarkPalette(),
    typography: {
      ...scaledBaseOptions.typography,
      body2: {
        fontSize: 15 * fontScale,
        color: grey[600],
      },
    },
  })
}
