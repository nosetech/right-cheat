'use client'
import { forwardRef, useState } from 'react'

import { Box, Tooltip, Typography } from '@mui/material'
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
import { HeatBarColorId, historyHeat } from '@/constants/heatPalette'
import { useClipboard } from '@/hooks/useClipboard'
import { scaledPx } from '@/utils/css'
import { formatCopyTimestamp } from '@/utils/date'

export type HistoryItemRowProps = {
  text: string
  numberHint?: string
  editMode?: boolean
  onAddToSheet?: () => void
  onDelete?: () => void
  /** 再コピー成功時に呼ばれる（copy_count のカウントアップに使用） */
  onCopied?: () => void
  /** コピー回数（ヒートバーの強調レベルとツールチップに使用） */
  copyCount?: number
  /** 初回コピー日時（DB の first_copied_at、UTC） */
  firstCopiedAt?: string
  /** 最終コピー日時（DB の copied_at、UTC） */
  lastCopiedAt?: string
  /** Preferences → Clipboard History の Heat bar color 設定 */
  heatColor?: HeatBarColorId
}

/**
 * クリップボード履歴の1行。
 * CommandField と同じ見た目（行番号 + コピー可能なテキストボックス）だが
 * description 行はなく、編集モード時は右側に Add to Cheat Sheet / Delete の
 * アイコンボタンを表示する。
 * 見た目のスタイルは commandFieldStyles で CommandField と共有している。
 * コピー回数に応じたヒートバー（左端の inset shadow + 行背景ティント）を描画し、
 * ホバー時にコピー回数・初回/最終コピー日時を表示するツールチップを出す（issue #195）。
 */
export const HistoryItemRow = forwardRef<HTMLDivElement, HistoryItemRowProps>(
  (
    {
      text,
      numberHint,
      editMode = false,
      onAddToSheet,
      onDelete,
      onCopied,
      copyCount = 1,
      firstCopiedAt,
      lastCopiedAt,
      heatColor = 'none',
    },
    ref,
  ) => {
    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'
    const { copy, hasCopied, error: copyError } = useClipboard(text, onCopied)

    const [isFocused, setIsFocused] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    const isMultiLine = text.includes('\n')
    const heat = historyHeat(copyCount, isDark, heatColor)

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
        <Tooltip
          title={
            <HistoryItemTooltipContent
              copyCount={copyCount}
              firstCopiedAt={firstCopiedAt}
              lastCopiedAt={lastCopiedAt}
              heatBarColor={heat?.barColor}
            />
          }
          disableInteractive
          placement='top-start'
          slotProps={{
            tooltip: {
              sx: {
                backgroundColor: theme.palette.glass.overlay,
                border: `0.5px solid ${theme.palette.divider}`,
                borderRadius: '9px',
                boxShadow: '0 10px 30px -8px rgba(0,0,0,0.55)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                padding: '9px 11px',
                maxWidth: 'none',
              },
            },
          }}
        >
          <Box
            ref={ref}
            tabIndex={editMode ? -1 : 0}
            sx={{
              ...getCommandBoxSx(
                theme,
                {
                  hasError: !!copyError,
                  hasDone: hasCopied,
                  isFocused,
                  isHovered,
                },
                heat,
              ),
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
        </Tooltip>

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

type HistoryItemTooltipContentProps = {
  copyCount: number
  firstCopiedAt?: string
  lastCopiedAt?: string
  heatBarColor?: string
}

/** ホバーツールチップの中身（コピー回数・初回/最終コピー日時・ミニヒートバー） */
function HistoryItemTooltipContent({
  copyCount,
  firstCopiedAt,
  lastCopiedAt,
  heatBarColor,
}: HistoryItemTooltipContentProps) {
  const theme = useTheme()

  const rowSx = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '18px',
  } as const
  const labelSx = {
    fontSize: scaledPx(theme.custom.fontSize.hint),
    color: 'text.secondary',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  } as const
  const valueSx = {
    fontFamily: 'monospace',
    fontSize: scaledPx(theme.custom.fontSize.hint),
    color: 'text.primary',
    whiteSpace: 'nowrap',
  } as const

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <Box sx={rowSx}>
        <Typography sx={labelSx}>Copy count</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {heatBarColor && (
            <Box
              sx={{
                width: 18,
                height: 4,
                borderRadius: '2px',
                backgroundColor: heatBarColor,
              }}
            />
          )}
          <Typography
            sx={{
              ...valueSx,
              fontWeight: 700,
              fontSize: scaledPx(theme.custom.fontSize.dialogMessage),
            }}
          >
            {copyCount}
            <Typography
              component='span'
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.numberHint),
                fontWeight: 500,
                color: 'text.secondary',
                marginLeft: '2px',
              }}
            >
              {copyCount === 1 ? 'time' : 'times'}
            </Typography>
          </Typography>
        </Box>
      </Box>
      <Box sx={{ height: '0.5px', backgroundColor: theme.palette.divider }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Box sx={rowSx}>
          <Typography sx={labelSx}>First copied</Typography>
          <Typography sx={valueSx}>
            {firstCopiedAt ? formatCopyTimestamp(firstCopiedAt) : '—'}
          </Typography>
        </Box>
        <Box sx={rowSx}>
          <Typography sx={labelSx}>Last copied</Typography>
          <Typography sx={valueSx}>
            {lastCopiedAt ? formatCopyTimestamp(lastCopiedAt) : '—'}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
