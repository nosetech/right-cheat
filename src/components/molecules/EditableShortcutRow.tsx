'use client'
import { scaledPx } from '@/utils/css'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { TruncatedText } from '@/components/atoms/TruncatedText'
import { EditableRowBase } from '@/components/molecules/EditableRowBase'
import { FONT_CODE } from '@/theme/fonts'
import { EditCommandData } from '@/types/edit/EditBlock'

type Props = {
  index: number
  item: EditCommandData
  isDragging?: boolean
  isDropTarget?: boolean
  onEdit: () => void
  onDelete: () => void
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  rowRef?: (el: HTMLDivElement | null) => void
}

export function EditableShortcutRow({
  index,
  item,
  isDragging,
  isDropTarget,
  onEdit,
  onDelete,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  rowRef,
}: Props) {
  const theme = useTheme()

  return (
    <EditableRowBase
      index={index}
      item={item}
      isDragging={isDragging}
      isDropTarget={isDropTarget}
      onEdit={onEdit}
      onDelete={onDelete}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      deleteLabel='Delete'
      rowRef={rowRef}
    >
      {/* キーチップ — ShortcutField と同じスタイル */}
      <Box
        sx={{
          flexShrink: 0,
          background: theme.palette.ui.fieldRowBg,
          border: `0.5px solid ${theme.palette.ui.borderSubtle}`,
          borderRadius: 1,
          px: 1,
          py: '3px',
        }}
      >
        <Typography
          sx={{
            fontFamily: FONT_CODE,
            fontSize: scaledPx(theme.custom.fontSize.caption),
            color: theme.palette.text.primary,
            whiteSpace: 'nowrap',
            lineHeight: 1.55,
          }}
        >
          {item.command}
        </Typography>
      </Box>

      {/* 説明テキスト */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {item.description ? (
          <TruncatedText
            text={item.description}
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.captionSm),
              color: theme.palette.text.secondary,
            }}
          />
        ) : (
          <Typography
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.captionSm),
              color: theme.palette.text.disabled,
              fontStyle: 'italic',
            }}
          >
            (no description)
          </Typography>
        )}
      </Box>
    </EditableRowBase>
  )
}
