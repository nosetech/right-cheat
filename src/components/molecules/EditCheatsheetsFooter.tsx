'use client'
import { scaledPx } from '@/utils/css'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { AlertCircleIcon } from '@/components/atoms/icons'
import { WindowActionFooter } from '@/components/molecules/WindowActionFooter'

type Props = {
  dirty: boolean
  errorCt: number
  canSave: boolean
  onCancel: () => void
  onSave: () => void
}

/**
 * Edit Cheatsheets 画面のフッター。
 * 左側にエラー件数 / 変更状態を表示し、右側に Cancel / Save を配置する。
 * 親（Pinned controls）が背景・角丸を持つため、背景は透過にして border のみ引く。
 */
export function EditCheatsheetsFooter({
  dirty,
  errorCt,
  canSave,
  onCancel,
  onSave,
}: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const divider = theme.palette.divider

  const status = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        minHeight: '18px',
      }}
    >
      {errorCt > 0 ? (
        <>
          <AlertCircleIcon
            size={12}
            strokeWidth={2.2}
            color={theme.palette.danger.text}
            style={{ flexShrink: 0 }}
          />
          <Box
            component='span'
            sx={{
              fontFamily: theme.typography.fontFamily,
              fontSize: scaledPx(theme.custom.fontSize.captionSm),
              color: theme.palette.danger.text,
              fontWeight: 500,
            }}
          >
            {errorCt} {errorCt === 1 ? 'error' : 'errors'}
          </Box>
        </>
      ) : dirty ? (
        <Box
          component='span'
          sx={{
            fontFamily: theme.typography.fontFamily,
            fontSize: scaledPx(theme.custom.fontSize.captionSm),
            color: theme.palette.text.secondary,
            fontStyle: 'italic',
          }}
        >
          Unsaved changes
        </Box>
      ) : (
        <Box
          component='span'
          sx={{
            fontFamily: theme.typography.fontFamily,
            fontSize: scaledPx(theme.custom.fontSize.captionSm),
            color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.28)',
          }}
        >
          No changes
        </Box>
      )}
    </Box>
  )

  return (
    <WindowActionFooter
      onCancel={onCancel}
      onSave={onSave}
      canSave={canSave}
      leading={status}
      sx={{
        position: 'static',
        height: 'auto',
        alignItems: 'center',
        p: '10px 16px 14px',
        background: 'transparent',
        borderTop: `0.5px solid ${divider}`,
      }}
    />
  )
}
