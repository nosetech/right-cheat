'use client'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useEffect } from 'react'

import { EditDialog } from '@/components/molecules/EditDialog'
import { FooterButton } from '@/components/molecules/FooterButton'

type Props = {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
    }
    document.addEventListener('keydown', h, true)
    return () => document.removeEventListener('keydown', h, true)
  }, [onCancel])

  return (
    <EditDialog width={380} onClose={onCancel}>
      {/* ボディ */}
      <Box sx={{ p: '18px 20px 10px' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {/* 警告アイコン */}
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              flexShrink: 0,
              background: isDark
                ? 'rgba(255,107,107,0.12)'
                : 'rgba(255,80,80,0.10)',
              border: '0.5px solid rgba(255,107,107,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ff6b6b',
            }}
          >
            <WarningAmberIcon sx={{ fontSize: 18 }} />
          </Box>

          {/* テキスト */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'text.primary',
                mb: '4px',
                lineHeight: 1.4,
              }}
            >
              {title}
            </Box>
            <Box
              sx={{
                fontSize: '12px',
                lineHeight: 1.55,
                color: 'text.secondary',
                wordBreak: 'break-all',
              }}
            >
              {message}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* フッター */}
      <Box
        sx={{
          p: '12px 16px 14px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          background: isDark
            ? 'rgba(255,255,255,0.018)'
            : 'rgba(255,255,255,0.30)',
          borderTop: `0.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <FooterButton onClick={onCancel}>Cancel</FooterButton>
        <DangerButton onClick={onConfirm}>{confirmLabel}</DangerButton>
      </Box>
    </EditDialog>
  )
}

function DangerButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Box
      component='button'
      onClick={onClick}
      sx={{
        background: '#ff6b6b',
        color: '#fff',
        border: '0.5px solid transparent',
        borderRadius: '7px',
        padding: '5px 16px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.14s',
        minWidth: '78px',
        '&:hover': { background: '#e85555' },
      }}
    >
      {children}
    </Box>
  )
}
