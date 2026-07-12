'use client'
import { scaledPx } from '@/utils/css'
import { Box, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useState } from 'react'

import { EditIconButton } from '@/components/atoms/EditIconButton'
import { DragHandleIcon, PencilIcon, TrashIcon } from '@/components/atoms/icons'

type Props = {
  groupName: string
  children: React.ReactNode
  isEmpty: boolean
  isDragging?: boolean
  isDropTarget?: boolean
  onRename: () => void
  onDelete: () => void
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  blockRef?: (el: HTMLDivElement | null) => void
  groupBodyRef?: (el: HTMLDivElement | null) => void
}

export function EditableGroupBox({
  groupName,
  children,
  isEmpty,
  isDragging,
  isDropTarget,
  onRename,
  onDelete,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  blockRef,
  groupBodyRef,
}: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [isHovered, setIsHovered] = useState(false)
  const [grabbing, setGrabbing] = useState(false)
  return (
    <Box
      ref={blockRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: 'relative',
        border: `0.5px solid ${isDropTarget ? theme.palette.accent.main : theme.palette.divider}`,
        borderRadius: '6px',
        pt: '22px',
        pb: 1,
        px: 1,
        opacity: isDragging ? 0.35 : 1,
        transition: 'all 0.12s',
        background: isDropTarget
          ? alpha(theme.palette.accent.main, isDark ? 0.05 : 0.03)
          : 'transparent',
      }}
    >
      {/* レジェンド（上部ボーダー上） */}
      <Box
        sx={{
          position: 'absolute',
          top: '-1px',
          left: 6,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: theme.palette.background.paper,
          px: '4px',
          height: '20px',
        }}
      >
        {/* グループドラッグハンドル */}
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
            cursor: grabbing ? 'grabbing' : 'grab',
            touchAction: 'none',
            color: theme.palette.text.disabled,
            display: 'flex',
            alignItems: 'center',
            '&:hover': { color: theme.palette.text.secondary },
          }}
        >
          <DragHandleIcon width={8} height={12} />
        </Box>

        <Typography
          variant='caption'
          sx={{
            color: theme.palette.text.secondary,
            fontSize: scaledPx(theme.custom.fontSize.captionSm),
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {groupName}
        </Typography>

        {/* リネーム・削除ボタン */}
        <Box
          sx={{
            display: 'flex',
            gap: '1px',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.12s',
          }}
        >
          <EditIconButton title='Rename' onClick={onRename} size='xs'>
            <PencilIcon size={10} />
          </EditIconButton>
          <EditIconButton
            title='Delete group'
            onClick={onDelete}
            danger
            size='xs'
          >
            <TrashIcon size={10} />
          </EditIconButton>
        </Box>
      </Box>

      {/* グループ本体（ドロップターゲット） */}
      <Box ref={groupBodyRef} sx={{ minHeight: isEmpty ? '40px' : undefined }}>
        {isEmpty ? (
          <Typography
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.captionSm),
              color: theme.palette.text.disabled,
              fontStyle: 'italic',
              textAlign: 'center',
              py: '8px',
            }}
          >
            This group is empty — drop an item here or add one
          </Typography>
        ) : (
          children
        )}
      </Box>
    </Box>
  )
}
