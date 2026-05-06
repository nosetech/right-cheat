'use client'
import { ReactNode } from 'react'

import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { TITLEBAR_HEIGHT, TRAFFIC_LIGHTS_WIDTH } from '@/constants/layout'

type Props = {
  title?: string
  rightControls?: ReactNode
}

// このコンポーネント自体はドラッグ機能を持たない（pointerEvents: 'none'）。
// ドラッグ領域は呼び出し側が data-tauri-drag-region を持つ透明な Box を
// 同じ位置・高さ（TITLEBAR_HEIGHT）で別途配置する必要がある。
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
        background:
          theme.palette.mode === 'dark'
            ? 'rgba(15,34,54,0.75)'
            : 'rgba(236,242,252,0.72)',
        backdropFilter: 'blur(28px) saturate(200%)',
        WebkitBackdropFilter: 'blur(28px) saturate(200%)',
        borderBottom: `0.5px solid ${
          theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.09)'
            : 'rgba(200,210,230,0.72)'
        }`,
        display: 'flex',
        alignItems: 'center',
        px: 1.75,
        pointerEvents: 'none',
      }}
    >
      {/* traffic lights 分のスペーサー */}
      <Box sx={{ width: `${TRAFFIC_LIGHTS_WIDTH}px`, flexShrink: 0 }} />

      {title && (
        <Box
          sx={{
            position: 'absolute',
            left: TRAFFIC_LIGHTS_WIDTH,
            right: rightControls ? TRAFFIC_LIGHTS_WIDTH : 16,
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
