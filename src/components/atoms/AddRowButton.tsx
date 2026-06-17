'use client'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'

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
        fontSize: '11.5px',
        cursor: 'pointer',
        transition: 'all 0.14s',
        '&:hover': {
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          borderColor: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
          color: theme.palette.text.primary,
        },
      }}
    >
      {icon ?? (
        <svg
          width='11'
          height='11'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2.5'
        >
          <line x1='12' y1='5' x2='12' y2='19' />
          <line x1='5' y1='12' x2='19' y2='12' />
        </svg>
      )}
      {label}
    </Box>
  )
}
