'use client'
import { scaledPx } from '@/utils/css'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useState } from 'react'

import { EditIconButton } from '@/components/atoms/EditIconButton'
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
  const accent = isDark ? '#64b4ff' : '#0071e3'

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
          ? isDark
            ? 'rgba(100,180,255,0.10)'
            : 'rgba(0,113,227,0.07)'
          : isHovered
            ? isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.03)'
            : 'transparent',
        border: `0.5px solid ${
          isDropTarget
            ? accent
            : isHovered
              ? isDark
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.08)'
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
        <svg width='10' height='14' viewBox='0 0 10 14' fill='currentColor'>
          <circle cx='3' cy='3' r='1.3' />
          <circle cx='7' cy='3' r='1.3' />
          <circle cx='3' cy='7' r='1.3' />
          <circle cx='7' cy='7' r='1.3' />
          <circle cx='3' cy='11' r='1.3' />
          <circle cx='7' cy='11' r='1.3' />
        </svg>
      </Box>

      {/* インデックス番号 */}
      <Typography
        sx={{
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: scaledPx(9.5),
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
          <svg
            width='12'
            height='12'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
            <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
          </svg>
        </EditIconButton>
        <EditIconButton title={deleteLabel} onClick={onDelete} danger>
          <svg
            width='12'
            height='12'
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
  )
}
