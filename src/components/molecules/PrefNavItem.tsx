'use client'

import { scaledPx } from '@/utils/css'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'

type PrefNavItemProps = {
  label: string
  active: boolean
  onClick: () => void
}

export function PrefNavItem({ label, active, onClick }: PrefNavItemProps) {
  const theme = useTheme()

  return (
    <Box
      component='button'
      type='button'
      onClick={onClick}
      sx={{
        textAlign: 'left',
        width: '100%',
        border: 'none',
        cursor: 'pointer',
        padding: '7px 11px',
        borderRadius: '7px',
        fontFamily: 'inherit',
        fontSize: scaledPx(theme.custom.fontSize.dialogMessage),
        fontWeight: active ? 600 : 500,
        color: active ? 'text.primary' : 'text.secondary',
        backgroundColor: active
          ? theme.palette.surface.selected
          : 'transparent',
        transition: 'background-color 0.12s, color 0.12s',
        outline: 'none',
        '&:hover': {
          backgroundColor: active
            ? theme.palette.surface.selected
            : theme.palette.surface.hover,
          color: 'text.primary',
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: '-2px',
        },
      }}
    >
      {label}
    </Box>
  )
}
