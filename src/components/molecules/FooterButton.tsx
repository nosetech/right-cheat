'use client'
import { scaledPx } from '@/utils/css'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'

type Props = {
  onClick?: () => void
  primary?: boolean
  disabled?: boolean
  children: React.ReactNode
}

export function FooterButton({ onClick, primary, disabled, children }: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accent = isDark ? '#64b4ff' : '#0071e3'

  return (
    <Box
      component='button'
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      sx={{
        background: disabled
          ? isDark
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(0,0,0,0.04)'
          : primary
            ? accent
            : isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.75)',
        color: disabled
          ? isDark
            ? 'rgba(255,255,255,0.25)'
            : 'rgba(0,0,0,0.28)'
          : primary
            ? '#fff'
            : theme.palette.text.primary,
        border: `0.5px solid ${
          primary && !disabled
            ? 'transparent'
            : isDark
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(0,0,0,0.12)'
        }`,
        borderRadius: '7px',
        padding: '5px 16px',
        fontFamily: theme.typography.fontFamily,
        fontSize: scaledPx(12),
        fontWeight: 600,
        letterSpacing: '0.01em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.14s',
        minWidth: '78px',
        boxShadow:
          !isDark && !disabled ? 'inset 0 1px 0 rgba(255,255,255,0.5)' : 'none',
        '&:hover:not(:disabled)': {
          background: primary
            ? isDark
              ? '#7cc0ff'
              : '#1a82eb'
            : isDark
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(255,255,255,0.95)',
        },
      }}
    >
      {children}
    </Box>
  )
}
