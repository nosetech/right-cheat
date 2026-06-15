'use client'
import { Dialog } from '@mui/material'
import { useTheme } from '@mui/material/styles'

type Props = {
  width?: number
  onClose: () => void
  children: React.ReactNode
}

export function EditDialog({ width = 440, onClose, children }: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: isDark
              ? 'rgba(0,0,10,0.45)'
              : 'rgba(20,30,60,0.28)',
            backdropFilter: 'blur(3px)',
          },
        },
        paper: {
          sx: {
            width,
            maxWidth: width,
            borderRadius: '14px',
            border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'}`,
            boxShadow: isDark
              ? '0 24px 64px rgba(0,0,0,0.65)'
              : '0 24px 64px rgba(0,0,50,0.30)',
            overflow: 'hidden',
            m: 0,
          },
        },
      }}
    >
      {children}
    </Dialog>
  )
}
