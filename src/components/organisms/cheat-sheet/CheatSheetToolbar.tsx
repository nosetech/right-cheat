'use client'
import { Ref } from 'react'

import PushPin from '@mui/icons-material/PushPin'
import PushPinOutlined from '@mui/icons-material/PushPinOutlined'
import { Box, IconButton } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

import { PencilIcon } from '@/components/atoms/icons'
import {
  SheetSwitchButton,
  SheetSwitchButtonHandle,
} from '@/components/molecules/SheetSwitchButton'

type Props = {
  titles: string[]
  selected: string
  onSelect: (value: string) => void
  editMode: boolean
  onToggleEdit: () => void
  isPinned: boolean
  onTogglePin: () => void
  /** ピン留め非対応のシート（クリップボード履歴など）で無効化する */
  pinDisabled?: boolean
  sheetSwitchRef: Ref<SheetSwitchButtonHandle>
  pinButtonRef: Ref<HTMLButtonElement>
}

/**
 * ウィンドウヘッダー右側の操作群。
 * シート切り替え・編集モードトグル・ウィンドウサイズのピン留めを提供する。
 */
export function CheatSheetToolbar({
  titles,
  selected,
  onSelect,
  editMode,
  onToggleEdit,
  isPinned,
  onTogglePin,
  pinDisabled = false,
  sheetSwitchRef,
  pinButtonRef,
}: Props) {
  const theme = useTheme()
  const hasSelection = !!selected
  const canPin = hasSelection && !editMode && !pinDisabled

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {/* シート切り替え（編集モード中は無効化） */}
      <Box
        sx={{
          opacity: editMode ? 0.35 : 1,
          pointerEvents: editMode ? 'none' : 'auto',
          transition: 'opacity 0.14s',
        }}
      >
        <SheetSwitchButton
          ref={sheetSwitchRef}
          titles={titles}
          selected={selected}
          onSelect={onSelect}
        />
      </Box>

      {/* 編集モードトグル（鉛筆アイコン） */}
      <IconButton
        onClick={onToggleEdit}
        size='small'
        disabled={!hasSelection}
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
          opacity: !hasSelection ? 0.3 : 1,
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
