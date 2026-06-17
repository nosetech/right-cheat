'use client'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useState } from 'react'

import { EditIconButton } from '@/components/atoms/EditIconButton'

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
  const accent = isDark ? '#64b4ff' : '#0071e3'

  return (
    <Box
      ref={blockRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: 'relative',
        border: `0.5px solid ${isDropTarget ? accent : theme.palette.divider}`,
        borderRadius: '6px',
        pt: '22px',
        pb: 1,
        px: 1,
        opacity: isDragging ? 0.35 : 1,
        transition: 'all 0.12s',
        background: isDropTarget
          ? isDark
            ? 'rgba(100,180,255,0.05)'
            : 'rgba(0,113,227,0.03)'
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
          <svg width='8' height='12' viewBox='0 0 10 14' fill='currentColor'>
            <circle cx='3' cy='3' r='1.3' />
            <circle cx='7' cy='3' r='1.3' />
            <circle cx='3' cy='7' r='1.3' />
            <circle cx='7' cy='7' r='1.3' />
            <circle cx='3' cy='11' r='1.3' />
            <circle cx='7' cy='11' r='1.3' />
          </svg>
        </Box>

        <Typography
          variant='caption'
          sx={{
            color: theme.palette.text.secondary,
            fontSize: '11px',
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
            <svg
              width='10'
              height='10'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
              <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
            </svg>
          </EditIconButton>
          <EditIconButton
            title='Delete group'
            onClick={onDelete}
            danger
            size='xs'
          >
            <svg
              width='10'
              height='10'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <polyline points='3 6 5 6 21 6' />
              <path d='M19 6l-1 14H6L5 6' />
              <path d='M10 11v6' />
              <path d='M14 11v6' />
              <path d='M9 6V4h6v2' />
            </svg>
          </EditIconButton>
        </Box>
      </Box>

      {/* グループ本体（ドロップターゲット） */}
      <Box ref={groupBodyRef} sx={{ minHeight: isEmpty ? '40px' : undefined }}>
        {isEmpty ? (
          <Typography
            sx={{
              fontSize: '11px',
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
