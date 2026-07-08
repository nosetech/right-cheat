'use client'
import { scaledPx } from '@/utils/css'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { PlusIcon } from '@/components/atoms/icons'

type Props = {
  label: string
  onClick: () => void
  icon?: React.ReactNode
}

export function AddRowButton({ label, onClick, icon }: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box
      component='button'
      onClick={onClick}
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        padding: '6px 10px',
        background: 'transparent',
        border: `1px dashed ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}`,
        borderRadius: '7px',
        color: theme.palette.text.secondary,
        fontFamily: theme.typography.fontFamily,
        fontSize: scaledPx(theme.custom.fontSize.caption),
        cursor: 'pointer',
        transition: 'all 0.14s',
        '&:hover': {
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          borderColor: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
          color: theme.palette.text.primary,
        },
      }}
    >
      {icon ?? <PlusIcon size={11} strokeWidth={2.5} />}
      {label}
    </Box>
  )
}
