'use client'
import { Box } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useState } from 'react'

type Props = {
  title: string
  onClick: () => void
  danger?: boolean
  /** 'sm' = 3px padding (rows), 'xs' = 2px padding (group legend) */
  size?: 'sm' | 'xs'
  children: React.ReactNode
}

export function EditIconButton({
  title,
  onClick,
  danger,
  size = 'sm',
  children,
}: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [hov, setHov] = useState(false)

  return (
    <Box
      component='button'
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      sx={{
        background: hov
          ? danger
            ? alpha(theme.palette.danger.main, isDark ? 0.18 : 0.1)
            : isDark
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(0,0,0,0.07)'
          : 'transparent',
        border: 'none',
        borderRadius: size === 'xs' ? '3px' : '4px',
        padding: size === 'xs' ? '2px' : '3px',
        cursor: 'pointer',
        color: hov
          ? danger
            ? theme.palette.danger.text
            : theme.palette.text.primary
          : theme.palette.text.secondary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </Box>
  )
}
