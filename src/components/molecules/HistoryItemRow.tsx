'use client'
import { scaledPx } from '@/utils/css'
import { forwardRef, useState } from 'react'

import { Box, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

import { EditIconButton } from '@/components/atoms/EditIconButton'
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  TrashIcon,
} from '@/components/atoms/icons'
import { COMMAND_HINT_WIDTH } from '@/constants/layout'
import { useClipboard } from '@/hooks/useClipboard'
import { FONT_CODE } from '@/theme/fonts'

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
 */
export const HistoryItemRow = forwardRef<HTMLDivElement, HistoryItemRowProps>(
  ({ text, numberHint, editMode = false, onAddToSheet, onDelete }, ref) => {
    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'
    const { copy, hasCopied, error: copyError } = useClipboard(text)

    const [isFocused, setIsFocused] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    const isMultiLine = text.includes('\n')
    const accentColor = theme.palette.accent.main

    const getBoxSx = () => {
      if (copyError) {
        return {
          background: `${theme.palette.alert.main}20`,
          border: `0.5px solid ${theme.palette.alert.main}`,
          borderRadius: 1,
        }
      }
      if (hasCopied) {
        return {
          background: alpha(accentColor, isDark ? 0.09 : 0.06),
          border: `0.5px solid ${alpha(accentColor, isDark ? 0.32 : 0.3)}`,
          borderRadius: 1,
        }
      }
      if (isFocused) {
        return {
          background: theme.palette.glass.field,
          border: `0.5px solid ${alpha(accentColor, isDark ? 0.18 : 0.22)}`,
          borderLeft: `2.5px solid ${accentColor}`,
          borderRadius: '0 4px 4px 0',
        }
      }
      return {
        background: isHovered
          ? theme.palette.glass.field
          : theme.palette.glass.panel,
        border: `0.5px solid ${theme.palette.divider}`,
        borderRadius: 1,
      }
    }

    return (
      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
        {/* 行番号ヒント */}
        <Box
          sx={{
            width: COMMAND_HINT_WIDTH,
            minWidth: COMMAND_HINT_WIDTH,
            flexShrink: 0,
            textAlign: 'right',
            paddingTop: '6px',
            userSelect: 'none',
          }}
        >
          {numberHint && (
            <Typography
              sx={{
                fontFamily: FONT_CODE,
                fontSize: scaledPx(theme.custom.fontSize.numberHint),
                color: isFocused ? accentColor : theme.palette.text.disabled,
                transition: 'color 0.14s',
              }}
            >
              {numberHint}
            </Typography>
          )}
        </Box>

        {/* コピー可能なテキストボックス */}
        <Box
          ref={ref}
          tabIndex={editMode ? -1 : 0}
          sx={{
            ...getBoxSx(),
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
            sx={{
              fontFamily: FONT_CODE,
              fontSize: isMultiLine
                ? scaledPx(theme.custom.fontSize.commandMultiline)
                : scaledPx(theme.custom.fontSize.caption),
              color: hasCopied ? accentColor : theme.palette.text.primary,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              lineHeight: 1.55,
              flex: 1,
              minWidth: 0,
              transition: 'color 0.14s',
            }}
          >
            {text}
          </Typography>
          <Box
            sx={{
              opacity: hasCopied ? 1 : isFocused || isHovered ? 0.55 : 0,
              transition: 'opacity 0.14s',
              color: hasCopied ? accentColor : theme.palette.text.disabled,
              flexShrink: 0,
              paddingTop: '2px',
            }}
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
