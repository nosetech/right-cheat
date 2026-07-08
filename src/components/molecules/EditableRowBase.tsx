'use client'
import { scaledPx } from '@/utils/css'
import { Box, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useState } from 'react'

import { EditIconButton } from '@/components/atoms/EditIconButton'
import { DragHandleIcon, PencilIcon, TrashIcon } from '@/components/atoms/icons'
import { FONT_CODE } from '@/theme/fonts'
import { EditCommandData } from '@/types/edit/EditBlock'

type Props = {
  index: number
  item: EditCommandData
  isDragging?: boolean
  isDropTarget?: boolean
  alignItems?: 'center' | 'flex-start'
  onEdit: () => void
  onDelete: () => void
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  deleteLabel: string
  rowRef?: (el: HTMLDivElement | null) => void
  children: React.ReactNode
}

export function EditableRowBase({
  index,
  isDragging,
  isDropTarget,
  alignItems = 'center',
  onEdit,
  onDelete,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  deleteLabel,
  rowRef,
  children,
}: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [isHovered, setIsHovered] = useState(false)
  const [grabbing, setGrabbing] = useState(false)
  return (
    <Box
      ref={rowRef}
      data-edit-row
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        display: 'flex',
        alignItems,
        gap: '6px',
        padding: '5px 6px',
        borderRadius: '6px',
        background: isDropTarget
          ? alpha(theme.palette.accent.main, isDark ? 0.1 : 0.07)
          : isHovered
            ? theme.palette.surface.hover
            : 'transparent',
        border: `0.5px solid ${
          isDropTarget
            ? theme.palette.accent.main
            : isHovered
              ? theme.palette.divider
              : 'transparent'
        }`,
        opacity: isDragging ? 0.35 : 1,
        transition: 'all 0.12s',
        cursor: 'default',
        minWidth: 0,
      }}
    >
      {/* ドラッグハンドル */}
      <Box
        onPointerDown={(e) => {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          setGrabbing(true)
          onPointerDown(e)
        }}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          setGrabbing(false)
          onPointerUp()
        }}
        onPointerCancel={() => {
          setGrabbing(false)
          onPointerCancel()
        }}
        sx={{
          flexShrink: 0,
          cursor: grabbing ? 'grabbing' : 'grab',
          touchAction: 'none',
          color: theme.palette.text.disabled,
          display: 'flex',
          alignItems: 'center',
          padding: '2px',
          paddingTop: alignItems === 'flex-start' ? '6px' : '2px',
          '&:hover': { color: theme.palette.text.secondary },
        }}
      >
        <DragHandleIcon />
      </Box>

      {/* インデックス番号 */}
      <Typography
        sx={{
          fontFamily: FONT_CODE,
          fontSize: scaledPx(theme.custom.fontSize.numberHint),
          color: theme.palette.text.disabled,
          minWidth: '16px',
          textAlign: 'right',
          flexShrink: 0,
          userSelect: 'none',
          paddingTop: alignItems === 'flex-start' ? '6px' : 0,
        }}
      >
        {index + 1}
      </Typography>

      {/* コンテンツ（行ごとに異なる部分） */}
      {children}

      {/* 編集・削除ボタン */}
      <Box
        sx={{
          display: 'flex',
          gap: '2px',
          flexShrink: 0,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.12s',
        }}
      >
        <EditIconButton title='Edit' onClick={onEdit}>
          <PencilIcon />
        </EditIconButton>
        <EditIconButton title={deleteLabel} onClick={onDelete} danger>
          <TrashIcon />
        </EditIconButton>
      </Box>
    </Box>
  )
}
