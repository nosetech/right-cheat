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
  return (
    <Box
      component='button'
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      sx={{
        background: disabled
          ? theme.palette.surface.hover
          : primary
            ? theme.palette.accent.main
            : theme.palette.glass.field,
        color: disabled
          ? theme.palette.text.disabled
          : primary
            ? '#fff'
            : theme.palette.text.primary,
        border: `0.5px solid ${
          primary && !disabled ? 'transparent' : theme.palette.divider
        }`,
        borderRadius: '7px',
        padding: '5px 16px',
        fontFamily: theme.typography.fontFamily,
        fontSize: scaledPx(theme.custom.fontSize.body),
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
            : theme.palette.glass.panel,
        },
      }}
    >
      {children}
    </Box>
  )
}
