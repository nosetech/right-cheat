'use client'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { TruncatedText } from '@/components/atoms/TruncatedText'
import { EditableRowBase } from '@/components/molecules/EditableRowBase'
import { EditCommandData } from '@/types/edit/EditBlock'

type Props = {
  index: number
  item: EditCommandData
  isDragging?: boolean
  isDropTarget?: boolean
  onEdit: () => void
  onDelete: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
}

export function EditableShortcutRow({
  index,
  item,
  isDragging,
  isDropTarget,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
}: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <EditableRowBase
      index={index}
      item={item}
      isDragging={isDragging}
      isDropTarget={isDropTarget}
      onEdit={onEdit}
      onDelete={onDelete}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      deleteLabel='Delete'
    >
      {/* キーチップ */}
      <Box
        sx={{
          flexShrink: 0,
          background: isDark
            ? 'rgba(255,255,255,0.055)'
            : 'rgba(255,255,255,0.48)',
          border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: '4px',
          px: '6px',
          py: '2px',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: '10.5px',
            color: theme.palette.text.primary,
            whiteSpace: 'nowrap',
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
            sx={{ fontSize: '11px', color: theme.palette.text.secondary }}
          />
        ) : (
          <Typography
            sx={{
              fontSize: '11px',
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
