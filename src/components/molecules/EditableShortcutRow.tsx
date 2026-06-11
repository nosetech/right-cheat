'use client'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useState } from 'react'

import { TruncatedText } from '@/components/atoms/TruncatedText'
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
  const [isHovered, setIsHovered] = useState(false)
  const accent = isDark ? '#64b4ff' : '#0071e3'

  return (
    <Box
      data-edit-row
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={onDragOver}
      sx={{
        display: 'flex',
        alignItems: 'center',
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
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        sx={{
          flexShrink: 0,
          cursor: 'grab',
          color: theme.palette.text.disabled,
          display: 'flex',
          alignItems: 'center',
          padding: '2px',
          '&:hover': { color: theme.palette.text.secondary },
          '&:active': { cursor: 'grabbing' },
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
          fontSize: '9.5px',
          color: theme.palette.text.disabled,
          minWidth: '16px',
          textAlign: 'right',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {index + 1}
      </Typography>

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
        <IconBtn title='Edit' onClick={onEdit}>
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
        </IconBtn>
        <IconBtn title='Delete' onClick={onDelete} danger>
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
        </IconBtn>
      </Box>
    </Box>
  )
}

function IconBtn({
  title,
  onClick,
  danger,
  children,
}: {
  title: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [hov, setHov] = useState(false)

  return (
    <Box
      component='button'
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      sx={{
        background: hov
          ? danger
            ? isDark
              ? 'rgba(255,107,107,0.18)'
              : 'rgba(211,47,47,0.10)'
            : isDark
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(0,0,0,0.07)'
          : 'transparent',
        border: 'none',
        borderRadius: '4px',
        padding: '3px',
        cursor: 'pointer',
        color: hov
          ? danger
            ? '#ff6b6b'
            : theme.palette.text.primary
          : theme.palette.text.secondary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </Box>
  )
}
