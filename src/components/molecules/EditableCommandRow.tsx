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

export function EditableCommandRow({
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

  const cmdPreview = item.command.includes('\n')
    ? item.command.split('\n')[0] + ' …'
    : item.command

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
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {item.description ? (
          <TruncatedText
            text={item.description}
            sx={{ fontSize: '11px', color: theme.palette.text.primary }}
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
        <TruncatedText
          text={cmdPreview}
          sx={{
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: '10.5px',
            color: theme.palette.text.secondary,
          }}
        />
      </Box>
    </EditableRowBase>
  )
}
