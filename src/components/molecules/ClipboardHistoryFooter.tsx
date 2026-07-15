'use client'
import { scaledPx } from '@/utils/css'
import { useState } from 'react'

import { Box } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

import { TrashIcon } from '@/components/atoms/icons'
import { EditModeActionRow } from '@/components/molecules/EditModeActionRow'
import { FONT_CODE } from '@/theme/fonts'

type Props = {
  itemCount: number
  editMode: boolean
  editDirty: boolean
  isSaving: boolean
  onClear: () => void
  onCancel: () => void
  onSave: () => void
}

/**
 * クリップボード履歴シートの固定フッター。
 * 通常時は件数表示と Clear ボタン、編集モード時は変更状態表示と
 * Cancel / Save ボタン（EditModeActionRow）を表示する。
 */
export function ClipboardHistoryFooter({
  itemCount,
  editMode,
  editDirty,
  isSaving,
  onClear,
  onCancel,
  onSave,
}: Props) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        flexShrink: 0,
        borderTop: `0.5px solid ${theme.palette.divider}`,
        background: theme.palette.ui.footerBg,
        p: '10px 14px 12px',
      }}
    >
      {editMode ? (
        <EditModeActionRow
          editDirty={editDirty}
          isSaving={isSaving}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <Box
            sx={{
              fontFamily: FONT_CODE,
              fontSize: scaledPx(theme.custom.fontSize.captionSm),
              color: 'text.secondary',
              letterSpacing: '0.02em',
              minWidth: 0,
            }}
          >
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Box>
          <ClearHistoryButton disabled={itemCount === 0} onClick={onClear} />
        </Box>
      )}
    </Box>
  )
}

/** 履歴全削除ボタン（破壊的操作のため赤系アウトライン） */
function ClearHistoryButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled: boolean
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [hov, setHov] = useState(false)
  const alertColor = theme.palette.alert.main

  return (
    <Box
      component='button'
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background:
          !disabled && hov
            ? alpha(alertColor, isDark ? 0.12 : 0.1)
            : 'transparent',
        border: `0.5px solid ${
          disabled
            ? theme.palette.divider
            : alpha(alertColor, hov ? 0.45 : isDark ? 0.28 : 0.26)
        }`,
        borderRadius: '7px',
        padding: '4px 11px',
        fontFamily: theme.typography.fontFamily,
        fontSize: scaledPx(theme.custom.fontSize.caption),
        fontWeight: 600,
        color: disabled ? theme.palette.text.disabled : alertColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'all 0.14s',
      }}
    >
      <TrashIcon size={12} strokeWidth={2} />
      Clear
    </Box>
  )
}
