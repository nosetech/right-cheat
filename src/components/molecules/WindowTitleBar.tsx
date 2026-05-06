'use client'
import { ReactNode } from 'react'

import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { TITLEBAR_HEIGHT } from '@/constants/layout'

type Props = {
  title?: string
  rightControls?: ReactNode
}

export const WindowTitleBar = ({ title, rightControls }: Props) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: `${TITLEBAR_HEIGHT}px`,
        zIndex: 1000,
        background: theme.palette.background.default,
        borderBottom: `0.5px solid ${theme.palette.divider}`,
        display: 'flex',
        alignItems: 'center',
        px: 1.75,
        pointerEvents: 'none',
      }}
    >
      {/* traffic lights 分のスペーサー */}
      <Box sx={{ width: '72px', flexShrink: 0 }} />

      {title && (
        <Box
          sx={{
            position: 'absolute',
            left: 72,
            right: rightControls ? 72 : 16,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 600,
              color: theme.palette.text.secondary,
              letterSpacing: '0.02em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {title}
          </Typography>
        </Box>
      )}

      {rightControls && (
        <Box
          sx={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            pointerEvents: 'all',
          }}
        >
          {rightControls}
        </Box>
      )}
    </Box>
  )
}
