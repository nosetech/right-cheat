'use client'
import { forwardRef, useState } from 'react'

import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { EditIconButton } from '@/components/atoms/EditIconButton'
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  TrashIcon,
} from '@/components/atoms/icons'
import {
  getActionIconBoxSx,
  getCommandBoxSx,
  getCommandTextSx,
  getNumberHintTextSx,
  numberHintBoxSx,
} from '@/components/molecules/commandFieldStyles'
import { useClipboard } from '@/hooks/useClipboard'

export type HistoryItemRowProps = {
  text: string
  numberHint?: string
  editMode?: boolean
  onAddToSheet?: () => void
  onDelete?: () => void
}

/**
 * クリップボード履歴の1行。
 * CommandField と同じ見た目（行番号 + コピー可能なテキストボックス）だが
 * description 行はなく、編集モード時は右側に Add to Cheat Sheet / Delete の
 * アイコンボタンを表示する。
 * 見た目のスタイルは commandFieldStyles で CommandField と共有している。
 */
export const HistoryItemRow = forwardRef<HTMLDivElement, HistoryItemRowProps>(
  ({ text, numberHint, editMode = false, onAddToSheet, onDelete }, ref) => {
    const theme = useTheme()
    const { copy, hasCopied, error: copyError } = useClipboard(text)

    const [isFocused, setIsFocused] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    const isMultiLine = text.includes('\n')

    return (
      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
        {/* 行番号ヒント */}
        <Box sx={numberHintBoxSx}>
          {numberHint && (
            <Typography sx={getNumberHintTextSx(theme, isFocused)}>
              {numberHint}
            </Typography>
          )}
        </Box>

        {/* コピー可能なテキストボックス */}
        <Box
          ref={ref}
          tabIndex={editMode ? -1 : 0}
          sx={{
            ...getCommandBoxSx(theme, {
              hasError: !!copyError,
              hasDone: hasCopied,
              isFocused,
              isHovered,
            }),
            padding: '5px 8px',
            cursor: editMode ? 'default' : 'pointer',
            transition: 'all 0.14s ease',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1,
            outline: 'none',
            flex: 1,
            minWidth: 0,
          }}
          onClick={editMode ? undefined : copy}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (editMode) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              copy()
            }
          }}
        >
          <Typography
            sx={getCommandTextSx(theme, { isMultiLine, hasDone: hasCopied })}
          >
            {text}
          </Typography>
          <Box
            sx={getActionIconBoxSx(theme, {
              hasDone: hasCopied,
              isFocused,
              isHovered,
            })}
          >
            {hasCopied ? (
              <CheckIcon size={11} strokeWidth={2.5} />
            ) : (
              <CopyIcon size={11} strokeWidth={2} />
            )}
          </Box>
        </Box>

        {/* 編集モード時の行操作（チートシートへ追加 / 削除） */}
        {editMode && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '1px',
              flexShrink: 0,
              paddingTop: '3px',
            }}
          >
            <EditIconButton
              title='Add to Cheat Sheet'
              onClick={() => onAddToSheet?.()}
            >
              <PencilIcon size={13} />
            </EditIconButton>
            <EditIconButton title='Delete' danger onClick={() => onDelete?.()}>
              <TrashIcon size={13} />
            </EditIconButton>
          </Box>
        )}
      </Box>
    )
  },
)

HistoryItemRow.displayName = 'HistoryItemRow'
