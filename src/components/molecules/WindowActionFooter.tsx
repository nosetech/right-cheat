'use client'
import { Box } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'

import { FooterButton } from '@/components/molecules/FooterButton'

// 編集ウィンドウ（edit-command / edit-group など）で共通のフッター高さ。
// 本文側は下端がフッターに隠れないよう `WINDOW_ACTION_FOOTER_HEIGHT + 余白` を padding-bottom に指定する。
export const WINDOW_ACTION_FOOTER_HEIGHT = 50

type Props = {
  onCancel: () => void
  onSave: () => void
  canSave?: boolean
  cancelLabel?: string
  saveLabel?: string
  /** ボタン群の左側に表示する任意コンテンツ（ステータス表示など）。 */
  leading?: React.ReactNode
  /** 外側 Box の sx を上書きする。既定値より後に適用されるため個別のキーを上書きできる。 */
  sx?: SxProps<Theme>
}

/**
 * 画面下部のアクションフッター（Cancel / Save）。
 * 既定では独立ウィンドウの編集画面向けに画面下部へ固定表示するが、
 * `sx` で配置・背景などを上書きし、`leading` で左側にステータス表示を差し込める。
 */
export function WindowActionFooter({
  onCancel,
  onSave,
  canSave = true,
  cancelLabel = 'Cancel',
  saveLabel = 'Save',
  leading,
  sx,
}: Props) {
  const theme = useTheme()
  return (
    <Box
      sx={[
        {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${WINDOW_ACTION_FOOTER_HEIGHT}px`,
          p: '10px 16px',
          display: 'flex',
          justifyContent: leading ? 'space-between' : 'flex-end',
          gap: '10px',
          background: theme.palette.ui.footerBg,
          borderTop: `0.5px solid ${theme.palette.ui.borderSubtle}`,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {leading}
      <Box sx={{ display: 'flex', gap: '8px' }}>
        <FooterButton onClick={onCancel}>{cancelLabel}</FooterButton>
        <FooterButton primary disabled={!canSave} onClick={onSave}>
          {saveLabel}
        </FooterButton>
      </Box>
    </Box>
  )
}
