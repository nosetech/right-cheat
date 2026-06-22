'use client'
import { scaledPx } from '@/utils/css'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { TruncatedText } from '@/components/atoms/TruncatedText'
import { EditableRowBase } from '@/components/molecules/EditableRowBase'
import { CommandLayout } from '@/types/api/CheatSheet'
import { EditCommandData } from '@/types/edit/EditBlock'

type Props = {
  index: number
  item: EditCommandData
  layout: CommandLayout
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

export function EditableCommandRow({
  index,
  item,
  layout,
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
  const isDark = theme.palette.mode === 'dark'
  const isMultiLine = item.command.includes('\n')

  const commandBox = (
    <Box
      sx={{
        background: isDark
          ? 'rgba(255,255,255,0.055)'
          : 'rgba(255,255,255,0.48)',
        border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: 1,
        boxShadow: isDark ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.55)',
        padding: '5px 8px',
        flex: layout !== 'stacked' ? 1 : undefined,
        minWidth: 0,
      }}
    >
      <Typography
        component='pre'
        sx={{
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: isMultiLine ? scaledPx(10) : scaledPx(11.5),
          color: theme.palette.text.primary,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {item.command}
      </Typography>
    </Box>
  )

  const isStacked = layout === 'stacked'
  const showDescription = layout !== 'command_only' && !!item.description

  if (isStacked) {
    return (
      <EditableRowBase
        index={index}
        item={item}
        isDragging={isDragging}
        isDropTarget={isDropTarget}
        alignItems='flex-start'
        onEdit={onEdit}
        onDelete={onDelete}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        deleteLabel='Delete'
        rowRef={rowRef}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {item.description ? (
            <TruncatedText
              text={item.description}
              sx={{
                fontSize: scaledPx(11),
                color: theme.palette.text.secondary,
              }}
            />
          ) : (
            <Typography
              sx={{
                fontSize: scaledPx(11),
                color: theme.palette.text.disabled,
                fontStyle: 'italic',
              }}
            >
              (no description)
            </Typography>
          )}
          {commandBox}
        </Box>
      </EditableRowBase>
    )
  }

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
      {commandBox}
      {showDescription && (
        <TruncatedText
          text={item.description!}
          sx={{
            fontSize: scaledPx(11),
            color: theme.palette.text.secondary,
            flexShrink: 1,
          }}
        />
      )}
    </EditableRowBase>
  )
}
