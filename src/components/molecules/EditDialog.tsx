'use client'
import { useLayoutEffect, useState } from 'react'

import { Dialog } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window'
import { error as logError } from '@tauri-apps/plugin-log'

import { TITLEBAR_HEIGHT } from '@/constants/layout'

type Props = {
  width?: number
  onClose: () => void
  children: React.ReactNode
}

export function EditDialog({ width = 440, onClose, children }: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [paperEl, setPaperEl] = useState<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (!paperEl) return
    // offsetWidth/Height はレイアウト上の実寸（overflow・visibility に依存しない）
    const neededWidth = paperEl.offsetWidth
    // タイトルバーは position: fixed のため viewport には含まれていない
    const neededHeight = paperEl.offsetHeight + TITLEBAR_HEIGHT
    const currentWidth = window.innerWidth
    const currentHeight = window.innerHeight
    if (currentWidth >= neededWidth && currentHeight >= neededHeight) return
    ;(async () => {
      try {
        await getCurrentWindow().setSize(
          new LogicalSize(
            Math.max(currentWidth, neededWidth),
            Math.max(currentHeight, neededHeight),
          ),
        )
      } catch (e) {
        logError(`[EditDialog] Failed to resize window: ${e}`)
      }
    })()
  }, [paperEl])

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
          ref: setPaperEl,
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
