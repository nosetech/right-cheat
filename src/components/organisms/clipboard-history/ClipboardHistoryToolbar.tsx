'use client'
import { Ref } from 'react'

import PushPin from '@mui/icons-material/PushPin'
import PushPinOutlined from '@mui/icons-material/PushPinOutlined'
import { Box, IconButton } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

import { PencilIcon } from '@/components/atoms/icons'

type Props = {
  editMode: boolean
  onToggleEdit: () => void
  isPinned: boolean
  onTogglePin: () => void
  pinButtonRef?: Ref<HTMLButtonElement>
}

/**
 * Clipboard History ウィンドウのヘッダー右側の操作群。
 * 編集モードトグル（鉛筆）とウィンドウサイズのピン留めを提供する。
 * チートシートと異なりシート切り替えは持たない。
 */
export function ClipboardHistoryToolbar({
  editMode,
  onToggleEdit,
  isPinned,
  onTogglePin,
  pinButtonRef,
}: Props) {
  const theme = useTheme()
  // 編集モード中はサイズ変更を許容するためピン操作を無効化する
  const canPin = !editMode

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {/* 編集モードトグル（鉛筆アイコン） */}
      <IconButton
        onClick={onToggleEdit}
        size='small'
        title={editMode ? 'Cancel edit mode (Esc)' : 'Edit mode (e)'}
        sx={{
          background: editMode
            ? alpha(theme.palette.accent.main, 0.18)
            : 'transparent',
          border: editMode
            ? `0.5px solid ${theme.palette.accent.main}`
            : 'none',
          borderRadius: '6px',
          p: '3px',
          color: editMode
            ? theme.palette.accent.main
            : theme.palette.text.disabled,
          transition: 'all 0.15s',
          ml: '2px',
          '&.Mui-focusVisible': {
            outline: 'none',
            background: editMode
              ? alpha(theme.palette.accent.main, 0.18)
              : 'transparent',
          },
        }}
      >
        <PencilIcon size={13} />
      </IconButton>

      {/* ピン留めボタン */}
      <IconButton
        ref={pinButtonRef}
        onClick={canPin ? onTogglePin : undefined}
        size='small'
        disabled={!canPin}
        title={isPinned ? 'Unpin (p)' : 'Pin (p)'}
        sx={{
          opacity: canPin ? 1 : 0.3,
          color: isPinned
            ? theme.palette.accent.main
            : theme.palette.text.disabled,
          p: '4px',
        }}
      >
        {isPinned ? (
          <PushPin sx={{ fontSize: 13 }} />
        ) : (
          <PushPinOutlined sx={{ fontSize: 13 }} />
        )}
      </IconButton>
    </Box>
  )
}
