'use client'
import { scaledPx } from '@/utils/css'
import { useLayoutEffect, useRef, useState } from 'react'

import { alpha, useTheme } from '@mui/material/styles'

import { DragHandleIcon, TrashIcon } from '@/components/atoms/icons'
import { MAX_TITLE } from '@/hooks/edit-cheatsheets/constants'
import { RowData, RowError } from '@/hooks/edit-cheatsheets/types'
import { FONT_CODE } from '@/theme/fonts'
import { CommandLayout, SheetType } from '@/types/api/CheatSheet'

import { LayoutBadge } from './LayoutBadge'
import { TypeBadge } from './TypeBadge'

export function EditRow({
  row,
  index,
  error,
  isEditing,
  isDragging,
  dropTarget,
  onStartEdit,
  onEndEdit,
  onChange,
  onTypeChange,
  onLayoutChange,
  onRemove,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onRowRef,
  onMoveUp,
  onMoveDown,
}: {
  row: RowData
  index: number
  error: RowError
  isEditing: boolean
  isDragging: boolean
  dropTarget: 'before' | 'after' | null
  onStartEdit: () => void
  onEndEdit: () => void
  onChange: (v: string) => void
  onTypeChange: (t: SheetType) => void
  onLayoutChange: (l: CommandLayout) => void
  onRemove: () => void
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  onRowRef: (el: HTMLDivElement | null) => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accent = theme.palette.accent.main
  const panelBorder = isDark
    ? 'rgba(255,255,255,0.10)'
    : 'rgba(255,255,255,0.75)'

  const [hov, setHov] = useState(false)
  const [grabbing, setGrabbing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasError = error.empty || error.duplicate || error.tooLong

  useLayoutEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  return (
    <div
      ref={onRowRef}
      style={{
        position: 'relative',
        paddingTop: dropTarget === 'before' ? 2 : 0,
        paddingBottom: dropTarget === 'after' ? 2 : 0,
      }}
    >
      {dropTarget && (
        <div
          style={{
            position: 'absolute',
            left: 4,
            right: 4,
            [dropTarget === 'before' ? 'top' : 'bottom']: -1,
            height: 2,
            background: accent,
            borderRadius: 2,
            boxShadow: `0 0 0 2px ${alpha(theme.palette.accent.main, isDark ? 0.2 : 0.18)}`,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}

      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 6px 5px 4px',
          marginBottom: 2,
          borderRadius: 8,
          background: hasError
            ? isDark
              ? 'rgba(255,107,107,0.06)'
              : 'rgba(255,80,80,0.05)'
            : hov || isEditing
              ? isDark
                ? 'rgba(255,255,255,0.035)'
                : 'rgba(255,255,255,0.5)'
              : 'transparent',
          border: `0.5px solid ${
            hasError
              ? 'rgba(255,107,107,0.32)'
              : isEditing
                ? accent
                : hov
                  ? panelBorder
                  : 'transparent'
          }`,
          opacity: isDragging ? 0.35 : 1,
          transition: 'background 0.12s, border-color 0.12s, opacity 0.12s',
        }}
      >
        {/* Drag handle — pointer events for WKWebView compatibility; keyboard: ArrowUp/ArrowDown */}
        <div
          role='button'
          tabIndex={0}
          aria-label={`Drag to reorder: ${row.title}`}
          onPointerDown={(e) => {
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
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              onMoveUp()
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              onMoveDown()
            }
          }}
          title='Drag to reorder (Arrow keys to move)'
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 28,
            flexShrink: 0,
            cursor: grabbing ? 'grabbing' : 'grab',
            color: hov
              ? isDark
                ? 'rgba(255,255,255,0.45)'
                : 'rgba(0,0,0,0.45)'
              : isDark
                ? 'rgba(255,255,255,0.22)'
                : 'rgba(0,0,0,0.22)',
            transition: 'color 0.12s',
            userSelect: 'none',
            touchAction: 'none',
            outline: 'none',
          }}
        >
          <DragHandleIcon />
        </div>

        {/* Index */}
        <div
          style={{
            width: 18,
            flexShrink: 0,
            fontFamily: FONT_CODE,
            fontSize: scaledPx(10),
            color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.28)',
            textAlign: 'right',
            userSelect: 'none',
          }}
        >
          {index + 1}
        </div>

        {/* Title field */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              ref={inputRef}
              value={row.title}
              maxLength={MAX_TITLE + 20}
              onFocus={onStartEdit}
              onBlur={onEndEdit}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape')
                  e.currentTarget.blur()
              }}
              placeholder='New cheatsheet name…'
              style={{
                flex: 1,
                minWidth: 0,
                background: isEditing
                  ? isDark
                    ? 'rgba(0,0,0,0.25)'
                    : 'rgba(255,255,255,0.9)'
                  : 'transparent',
                border: `0.5px solid ${
                  isEditing
                    ? hasError
                      ? 'rgba(255,107,107,0.55)'
                      : accent
                    : 'transparent'
                }`,
                borderRadius: 6,
                padding: '4px 8px',
                fontFamily: theme.typography.fontFamily,
                fontSize: scaledPx(theme.custom.fontSize.label),
                fontWeight: 500,
                color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)',
                caretColor: accent,
                outline: 'none',
                boxShadow:
                  isEditing && !isDark
                    ? 'inset 0 1px 2px rgba(0,0,0,0.04)'
                    : 'none',
                transition: 'background 0.12s, border-color 0.12s',
              }}
            />
            {(isEditing || error.tooLong) && (
              <span
                style={{
                  fontFamily: FONT_CODE,
                  fontSize: scaledPx(10),
                  color: error.tooLong
                    ? theme.palette.danger.text
                    : isDark
                      ? 'rgba(255,255,255,0.22)'
                      : 'rgba(0,0,0,0.28)',
                  flexShrink: 0,
                  fontWeight: error.tooLong ? 600 : 400,
                }}
              >
                {row.title.length}/{MAX_TITLE}
              </span>
            )}
          </div>

          {hasError && (
            <div
              style={{
                fontFamily: theme.typography.fontFamily,
                fontSize: scaledPx(theme.custom.fontSize.hint),
                color: theme.palette.danger.text,
                paddingLeft: 9,
                lineHeight: 1.4,
              }}
            >
              {error.empty
                ? 'Title is required'
                : error.duplicate
                  ? 'This title is already in use'
                  : `Title must be ${MAX_TITLE} characters or fewer`}
            </div>
          )}
        </div>

        {/* TypeBadge */}
        <TypeBadge
          type={row.sheetType}
          commandCount={row.commandCount}
          onChange={onTypeChange}
        />

        {/* LayoutBadge */}
        <LayoutBadge
          value={row.layout}
          sheetType={row.sheetType}
          onChange={onLayoutChange}
        />

        {/* Delete button — hidden until row is hovered/focused; removed from tab order when invisible */}
        <button
          onClick={onRemove}
          title='Delete'
          tabIndex={hov || isEditing ? 0 : -1}
          aria-label={`Delete ${row.title}`}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color =
              theme.palette.danger.text
            ;(e.currentTarget as HTMLButtonElement).style.background = isDark
              ? 'rgba(255,107,107,0.10)'
              : 'rgba(255,80,80,0.08)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = isDark
              ? 'rgba(255,255,255,0.22)'
              : 'rgba(0,0,0,0.28)'
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'transparent'
          }}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.28)',
            opacity: hov || isEditing ? 1 : 0,
            borderRadius: 5,
            transition: 'opacity 0.14s, color 0.14s, background 0.14s',
            flexShrink: 0,
          }}
        >
          <TrashIcon size={13} />
        </button>
      </div>
    </div>
  )
}
