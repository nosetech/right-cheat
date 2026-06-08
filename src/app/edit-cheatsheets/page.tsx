'use client'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import ReactDOM from 'react-dom'

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { message } from '@tauri-apps/plugin-dialog'
import { debug, info, error as logError } from '@tauri-apps/plugin-log'

import { FooterButton } from '@/components/molecules/FooterButton'
import { WindowTitleBar } from '@/components/molecules/WindowTitleBar'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import {
  CheatSheetAPI,
  CheatSheetSummary,
  CheatSheetUpdate,
} from '@/types/api/CheatSheet'

// ─── Types ───────────────────────────────────────────────────────────────────

type SheetType = 'command' | 'application' | 'shortcut'
type LayoutType = 'inline' | 'stacked' | 'command_only'

type RowData = {
  localId: string
  dbId: number | null
  title: string
  sheetType: SheetType
  layout: LayoutType
  commandCount: number
}

type RowError = {
  empty: boolean
  tooLong: boolean
  duplicate: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_TITLE = 100
let _uid = 0
const nextLocalId = () => `loc${_uid++}`

const TYPE_META: Record<
  SheetType,
  {
    label: string
    description: string
    colorDark: string
    colorLight: string
    bgDark: string
    bgLight: string
    borderDark: string
    borderLight: string
  }
> = {
  command: {
    label: 'Command',
    description: 'Copyable shell commands',
    colorDark: '#64b4ff',
    colorLight: '#0071e3',
    bgDark: 'rgba(100,180,255,0.13)',
    bgLight: 'rgba(0,113,227,0.08)',
    borderDark: 'rgba(100,180,255,0.34)',
    borderLight: 'rgba(0,113,227,0.26)',
  },
  application: {
    label: 'Application',
    description: 'Subcommands of a single CLI app',
    colorDark: '#b794f4',
    colorLight: '#7c3aed',
    bgDark: 'rgba(183,148,244,0.13)',
    bgLight: 'rgba(124,58,237,0.08)',
    borderDark: 'rgba(183,148,244,0.34)',
    borderLight: 'rgba(124,58,237,0.26)',
  },
  shortcut: {
    label: 'Shortcut',
    description: 'Keyboard shortcuts',
    colorDark: '#f6c177',
    colorLight: '#b45309',
    bgDark: 'rgba(246,193,119,0.14)',
    bgLight: 'rgba(180,83,9,0.08)',
    borderDark: 'rgba(246,193,119,0.34)',
    borderLight: 'rgba(180,83,9,0.28)',
  },
}

const LAYOUT_META: Record<
  LayoutType,
  { label: string; description: string; icon: React.ReactNode }
> = {
  inline: {
    label: 'inline',
    description: 'Description and command on one line',
    icon: (
      <svg
        width='14'
        height='14'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
      >
        <line x1='3' y1='9' x2='10' y2='9' />
        <line x1='12' y1='9' x2='21' y2='9' />
        <line x1='3' y1='15' x2='10' y2='15' />
        <line x1='12' y1='15' x2='21' y2='15' />
      </svg>
    ),
  },
  stacked: {
    label: 'stacked',
    description: 'Description above, command below',
    icon: (
      <svg
        width='14'
        height='14'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
      >
        <line x1='3' y1='6' x2='14' y2='6' />
        <line x1='3' y1='11' x2='21' y2='11' />
        <line x1='3' y1='15' x2='14' y2='15' />
        <line x1='3' y1='20' x2='21' y2='20' />
      </svg>
    ),
  },
  command_only: {
    label: 'command_only',
    description: 'Show command only, hide description',
    icon: (
      <svg
        width='14'
        height='14'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
      >
        <polyline points='4 17 10 11 4 5' />
        <line x1='12' y1='19' x2='20' y2='19' />
      </svg>
    ),
  },
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateRows(rows: RowData[]): RowError[] {
  const norm = rows.map((r) => r.title.trim().toLowerCase())
  const counts: Record<string, number> = {}
  norm.forEach((n) => {
    if (n) counts[n] = (counts[n] ?? 0) + 1
  })
  return rows.map((r, i) => {
    const t = r.title.trim()
    return {
      empty: t.length === 0,
      tooLong: r.title.length > MAX_TITLE,
      duplicate: t.length > 0 && (counts[norm[i]] ?? 0) > 1,
    }
  })
}

// ─── TypeBadge ───────────────────────────────────────────────────────────────

function TypeBadge({
  type,
  commandCount,
  onChange,
}: {
  type: SheetType
  commandCount: number
  onChange: (t: SheetType) => void
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const locked = commandCount > 0
  const meta = TYPE_META[type]
  const color = isDark ? meta.colorDark : meta.colorLight
  const bg = isDark ? meta.bgDark : meta.bgLight
  const border = isDark ? meta.borderDark : meta.borderLight
  const accent = isDark ? '#64b4ff' : '#0071e3'

  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [hov, setHov] = useState(false)

  const openMenu = () => {
    if (locked || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !popRef.current?.contains(e.target as Node)
      )
        setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        disabled={locked}
        title={
          locked
            ? `Type cannot be changed — ${commandCount} command${commandCount === 1 ? '' : 's'} registered`
            : 'Change type'
        }
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          width: 110,
          justifyContent: 'flex-start',
          background: bg,
          border: `0.5px solid ${!locked && (hov || open) ? color : border}`,
          borderRadius: 999,
          padding: '2px 8px 2px 7px',
          fontFamily: theme.typography.fontFamily,
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color,
          cursor: locked ? 'default' : 'pointer',
          opacity: locked ? 0.85 : 1,
          flexShrink: 0,
          height: 22,
          transition: 'border-color 0.14s, background 0.14s, opacity 0.14s',
          boxShadow: open
            ? `0 0 0 2px ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`
            : 'none',
        }}
      >
        {locked ? (
          <svg
            width='8.5'
            height='8.5'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.4'
            style={{ opacity: 0.75 }}
          >
            <rect x='4' y='11' width='16' height='10' rx='1.5' />
            <path d='M8 11V7a4 4 0 0 1 8 0v4' />
          </svg>
        ) : (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 0 2px ${bg}`,
            }}
          />
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {meta.label}
        </span>
        {!locked && (
          <svg
            width='8'
            height='8'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='3'
            style={{ marginLeft: 1, opacity: 0.75 }}
          >
            <polyline points='6 9 12 15 18 9' />
          </svg>
        )}
      </button>

      {open &&
        pos &&
        ReactDOM.createPortal(
          <div
            ref={popRef}
            style={{
              position: 'fixed',
              top: pos.top,
              right: pos.right,
              background: isDark
                ? 'rgba(20,30,48,0.97)'
                : 'rgba(248,250,254,0.97)',
              border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)'}`,
              borderRadius: 10,
              padding: 5,
              minWidth: 220,
              boxShadow: isDark
                ? '0 24px 64px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.06)'
                : '0 24px 64px rgba(0,0,50,0.22), 0 0 0 0.5px rgba(255,255,255,0.7)',
              backdropFilter: 'blur(20px)',
              zIndex: 1000,
              fontFamily: theme.typography.fontFamily,
            }}
          >
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '6px 8px 4px',
              }}
            >
              Type
            </div>
            {(Object.keys(TYPE_META) as SheetType[]).map((k) => {
              const m = TYPE_META[k]
              const c = isDark ? m.colorDark : m.colorLight
              const selected = k === type
              return (
                <button
                  key={k}
                  onClick={() => {
                    onChange(k)
                    setOpen(false)
                  }}
                  onMouseEnter={(e) => {
                    if (!selected)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)'
                  }}
                  onMouseLeave={(e) => {
                    if (!selected)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'transparent'
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    background: selected
                      ? isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.04)'
                      : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    padding: '7px 8px',
                    cursor: 'pointer',
                    color: isDark
                      ? 'rgba(255,255,255,0.92)'
                      : 'rgba(0,0,0,0.85)',
                    textAlign: 'left',
                    transition: 'background 0.10s',
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: c,
                      flexShrink: 0,
                      boxShadow: `0 0 0 2px ${isDark ? m.bgDark : m.bgLight}`,
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: isDark
                          ? 'rgba(255,255,255,0.92)'
                          : 'rgba(0,0,0,0.85)',
                      }}
                    >
                      {m.label}
                    </div>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: isDark
                          ? 'rgba(255,255,255,0.45)'
                          : 'rgba(0,0,0,0.45)',
                        marginTop: 1,
                      }}
                    >
                      {m.description}
                    </div>
                  </span>
                  {selected && (
                    <svg
                      width='13'
                      height='13'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke={accent}
                      strokeWidth='2.6'
                      style={{ flexShrink: 0 }}
                    >
                      <polyline points='20 6 9 17 4 12' />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}

// ─── LayoutBadge ─────────────────────────────────────────────────────────────

function LayoutBadge({
  value,
  sheetType,
  onChange,
}: {
  value: LayoutType
  sheetType: SheetType
  onChange: (l: LayoutType) => void
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const locked = sheetType === 'shortcut'
  const effectiveValue = locked ? 'inline' : value
  const meta = LAYOUT_META[effectiveValue]
  const accent = isDark ? '#64b4ff' : '#0071e3'

  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [hov, setHov] = useState(false)

  const openMenu = () => {
    if (locked || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !popRef.current?.contains(e.target as Node)
      )
        setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        disabled={locked}
        title={
          locked
            ? 'Shortcut type is fixed to inline layout'
            : `Default layout: ${meta.label}`
        }
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          width: 130,
          justifyContent: 'flex-start',
          background: isDark
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(255,255,255,0.65)',
          border: `0.5px solid ${
            !locked && (hov || open)
              ? isDark
                ? 'rgba(255,255,255,0.30)'
                : 'rgba(0,0,0,0.22)'
              : isDark
                ? 'rgba(255,255,255,0.14)'
                : 'rgba(0,0,0,0.12)'
          }`,
          borderRadius: 6,
          padding: '2px 6px',
          fontFamily: theme.typography.fontFamily,
          fontSize: 11,
          fontWeight: 500,
          color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)',
          cursor: locked ? 'default' : 'pointer',
          opacity: locked ? 0.7 : 1,
          flexShrink: 0,
          height: 22,
          transition: 'border-color 0.14s, background 0.14s, opacity 0.14s',
          boxShadow: !isDark
            ? 'inset 0 0.5px 0 rgba(255,255,255,0.85)'
            : 'none',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
            opacity: 0.85,
          }}
        >
          {meta.icon}
        </span>
        <span
          style={{
            fontFamily: '"JetBrains Mono","Fira Code","SF Mono",monospace',
            fontSize: 10.5,
            color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)',
            letterSpacing: '0.01em',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {meta.label}
        </span>
        {locked ? (
          <svg
            width='9'
            height='9'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.4'
            style={{
              marginLeft: 1,
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
              opacity: 0.75,
            }}
          >
            <rect x='4' y='11' width='16' height='10' rx='1.5' />
            <path d='M8 11V7a4 4 0 0 1 8 0v4' />
          </svg>
        ) : (
          <svg
            width='8'
            height='8'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='3'
            style={{
              marginLeft: 1,
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
            }}
          >
            <polyline points='6 9 12 15 18 9' />
          </svg>
        )}
      </button>

      {open &&
        pos &&
        ReactDOM.createPortal(
          <div
            ref={popRef}
            style={{
              position: 'fixed',
              top: pos.top,
              right: pos.right,
              background: isDark
                ? 'rgba(20,30,48,0.97)'
                : 'rgba(248,250,254,0.97)',
              border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)'}`,
              borderRadius: 10,
              padding: 5,
              minWidth: 240,
              boxShadow: isDark
                ? '0 24px 64px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.06)'
                : '0 24px 64px rgba(0,0,50,0.22), 0 0 0 0.5px rgba(255,255,255,0.7)',
              backdropFilter: 'blur(20px)',
              zIndex: 1000,
              fontFamily: theme.typography.fontFamily,
            }}
          >
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '6px 8px 4px',
              }}
            >
              Default layout
            </div>
            {(Object.keys(LAYOUT_META) as LayoutType[]).map((k) => {
              const m = LAYOUT_META[k]
              const selected = k === value
              return (
                <button
                  key={k}
                  onClick={() => {
                    onChange(k)
                    setOpen(false)
                  }}
                  onMouseEnter={(e) => {
                    if (!selected)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)'
                  }}
                  onMouseLeave={(e) => {
                    if (!selected)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'transparent'
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    background: selected
                      ? isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.04)'
                      : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    padding: '7px 8px',
                    cursor: 'pointer',
                    color: isDark
                      ? 'rgba(255,255,255,0.92)'
                      : 'rgba(0,0,0,0.85)',
                    textAlign: 'left',
                    transition: 'background 0.10s',
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 5,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.05)',
                      color: isDark
                        ? 'rgba(255,255,255,0.55)'
                        : 'rgba(0,0,0,0.55)',
                    }}
                  >
                    {m.icon}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily:
                          '"JetBrains Mono","Fira Code","SF Mono",monospace',
                        fontSize: 12,
                        fontWeight: 500,
                        color: isDark
                          ? 'rgba(255,255,255,0.92)'
                          : 'rgba(0,0,0,0.85)',
                      }}
                    >
                      {m.label}
                    </div>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: isDark
                          ? 'rgba(255,255,255,0.45)'
                          : 'rgba(0,0,0,0.45)',
                        marginTop: 1,
                      }}
                    >
                      {m.description}
                    </div>
                  </span>
                  {selected && (
                    <svg
                      width='13'
                      height='13'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke={accent}
                      strokeWidth='2.6'
                      style={{ flexShrink: 0 }}
                    >
                      <polyline points='20 6 9 17 4 12' />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}

// ─── EditRow ──────────────────────────────────────────────────────────────────

function EditRow({
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
  onLayoutChange: (l: LayoutType) => void
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
  const accent = isDark ? '#64b4ff' : '#0071e3'
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
            boxShadow: `0 0 0 2px ${isDark ? 'rgba(100,180,255,0.20)' : 'rgba(0,113,227,0.18)'}`,
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
          <svg width='10' height='14' viewBox='0 0 10 14' fill='currentColor'>
            <circle cx='2' cy='2' r='1.2' />
            <circle cx='2' cy='7' r='1.2' />
            <circle cx='2' cy='12' r='1.2' />
            <circle cx='8' cy='2' r='1.2' />
            <circle cx='8' cy='7' r='1.2' />
            <circle cx='8' cy='12' r='1.2' />
          </svg>
        </div>

        {/* Index */}
        <div
          style={{
            width: 18,
            flexShrink: 0,
            fontFamily: '"JetBrains Mono","Fira Code","SF Mono",monospace',
            fontSize: 10,
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
                fontSize: 13,
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
                  fontFamily:
                    '"JetBrains Mono","Fira Code","SF Mono",monospace',
                  fontSize: 10,
                  color: error.tooLong
                    ? '#ff6b6b'
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
                fontSize: 10.5,
                color: '#ff6b6b',
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
            ;(e.currentTarget as HTMLButtonElement).style.color = '#ff6b6b'
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
          <svg
            width='13'
            height='13'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <polyline points='3 6 5 6 21 6' />
            <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
            <path d='M10 11v6' />
            <path d='M14 11v6' />
            <path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EditCheatsheetsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accent = isDark ? '#64b4ff' : '#0071e3'
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'

  const { getConfirmActions } = usePreferencesStore()
  const [confirmActions, setConfirmActionsState] = useState<boolean>(true)

  const [rows, setRows] = useState<RowData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    id: string
    position: 'before' | 'after'
  } | null>(null)
  const [dirty, setDirty] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)
  const rowRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())
  // Pointer Events の onPointerUp 内で最新の dropTarget を読めるよう ref で保持
  const dropTargetRef = useRef<{
    id: string
    position: 'before' | 'after'
  } | null>(null)

  const errors = validateRows(rows)
  const errorCt = errors.filter(
    (e) => e.empty || e.tooLong || e.duplicate,
  ).length
  const canSave = dirty && errorCt === 0 && !saving

  useEffect(() => {
    ;(async () => {
      const confirmActionsValue = await getConfirmActions()
      setConfirmActionsState(confirmActionsValue)

      try {
        const summaries = await invoke<CheatSheetSummary[]>(
          CheatSheetAPI.LIST_CHEAT_SHEET_SUMMARIES,
        )
        debug(`[edit-cheatsheets] loaded ${summaries.length} summaries`)
        setRows(
          summaries.map((s) => ({
            localId: nextLocalId(),
            dbId: s.id,
            title: s.title,
            sheetType: (s.sheet_type as SheetType) ?? 'command',
            layout: (s.layout as LayoutType) ?? 'inline',
            commandCount: s.command_count,
          })),
        )
      } catch (e) {
        logError(`[edit-cheatsheets] load error: ${e}`)
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateTitle = useCallback((localId: string, value: string) => {
    setRows((rs) =>
      rs.map((r) => (r.localId === localId ? { ...r, title: value } : r)),
    )
    setDirty(true)
  }, [])

  const updateType = useCallback((localId: string, value: SheetType) => {
    setRows((rs) =>
      rs.map((r) => {
        if (r.localId !== localId) return r
        const layout = value === 'shortcut' ? 'inline' : r.layout
        return { ...r, sheetType: value, layout }
      }),
    )
    setDirty(true)
  }, [])

  const updateLayout = useCallback((localId: string, value: LayoutType) => {
    setRows((rs) =>
      rs.map((r) => (r.localId === localId ? { ...r, layout: value } : r)),
    )
    setDirty(true)
  }, [])

  const removeRow = useCallback((localId: string) => {
    setRows((rs) => rs.filter((r) => r.localId !== localId))
    setDirty(true)
  }, [])

  const addRow = useCallback(() => {
    const localId = nextLocalId()
    setRows((rs) => [
      ...rs,
      {
        localId,
        dbId: null,
        title: '',
        sheetType: 'command',
        layout: 'inline',
        commandCount: 0,
      },
    ])
    setEditingId(localId)
    setDirty(true)
    setTimeout(
      () => listEndRef.current?.scrollIntoView({ block: 'nearest' }),
      0,
    )
  }, [])

  // DnD handlers
  // Pointer Events ベースの DnD（HTML5 DnD の代替 — WKWebView 互換）
  const onHandlePointerDown = useCallback(
    (localId: string) => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      dropTargetRef.current = null
      setDragId(localId)
      setDropTarget(null)
    },
    [],
  )

  // ポインターキャプチャにより、常にドラッグ中の行ハンドルでこのハンドラが発火する
  const onHandlePointerMove = useCallback(
    (localId: string) => (e: React.PointerEvent) => {
      if (!dragId) return
      let found: { id: string; position: 'before' | 'after' } | null = null
      for (const [rowId, el] of rowRefsMap.current.entries()) {
        if (rowId === localId) continue
        const rect = el.getBoundingClientRect()
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          found = {
            id: rowId,
            position:
              e.clientY > rect.top + rect.height / 2 ? 'after' : 'before',
          }
          break
        }
      }
      dropTargetRef.current = found
      setDropTarget(found)
    },
    [dragId],
  )

  const onHandlePointerUp = useCallback(
    (localId: string) => () => {
      const target = dropTargetRef.current
      dropTargetRef.current = null
      if (target) {
        setRows((prevRows) => {
          const from = prevRows.findIndex((r) => r.localId === localId)
          let to = prevRows.findIndex((r) => r.localId === target.id)
          if (from === -1 || to === -1) return prevRows
          const next = prevRows.slice()
          const [moved] = next.splice(from, 1)
          if (from < to) to -= 1
          if (target.position === 'after') to += 1
          next.splice(to, 0, moved)
          return next
        })
        setDirty(true)
      }
      setDragId(null)
      setDropTarget(null)
    },
    [],
  )

  const onHandlePointerCancel = useCallback(() => {
    dropTargetRef.current = null
    setDragId(null)
    setDropTarget(null)
  }, [])

  const moveRow = useCallback((localId: string, direction: 'up' | 'down') => {
    setRows((rs) => {
      const idx = rs.findIndex((r) => r.localId === localId)
      if (idx === -1) return rs
      const next = rs.slice()
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= next.length) return rs
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
    setDirty(true)
  }, [])

  const doSave = useCallback(async () => {
    setConfirmSaveOpen(false)
    setSaving(true)
    try {
      const updates: CheatSheetUpdate[] = rows.map((r, i) => ({
        id: r.dbId,
        title: r.title.trim(),
        sort_order: i,
        sheet_type: r.sheetType,
        layout: r.sheetType === 'shortcut' ? 'inline' : r.layout,
      }))
      await invoke(CheatSheetAPI.UPDATE_CHEAT_SHEETS, { updates })
      info(`[edit-cheatsheets] saved ${updates.length} cheatsheets`)
      await getCurrentWindow().close()
    } catch (e) {
      logError(`[edit-cheatsheets] save error: ${e}`)
      await message(`Failed to save: ${e}`, {
        title: 'Edit Cheatsheets',
        kind: 'error',
      })
    } finally {
      setSaving(false)
    }
  }, [rows])

  const onSave = useCallback(() => {
    if (!canSave) return
    if (confirmActions) {
      setConfirmSaveOpen(true)
    } else {
      doSave()
    }
  }, [canSave, confirmActions, doSave])

  const onCancel = useCallback(() => {
    if (confirmActions && dirty) {
      setConfirmCancelOpen(true)
    } else {
      getCurrentWindow().close()
    }
  }, [confirmActions, dirty])

  const doCancel = useCallback(async () => {
    setConfirmCancelOpen(false)
    await getCurrentWindow().close()
  }, [])

  // Cmd+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (canSave) onSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [canSave, onSave])

  return (
    <>
      <Box
        data-tauri-drag-region
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: `${TITLEBAR_HEIGHT}px`,
          zIndex: 999,
        }}
      />
      <WindowTitleBar title='Edit Cheatsheets' />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: `calc(100vh - ${TITLEBAR_HEIGHT}px)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Row list */}
        <Box
          style={{ userSelect: dragId ? 'none' : undefined }}
          sx={{
            flex: 1,
            minHeight: 0,
            padding: '14px 14px 6px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: isDark
              ? 'rgba(255,255,255,0.12) transparent'
              : 'rgba(0,0,0,0.12) transparent',
          }}
        >
          {loading ? (
            <Box
              sx={{
                padding: '16px',
                fontSize: '12px',
                color: theme.palette.text.secondary,
              }}
            >
              Loading...
            </Box>
          ) : rows.length === 0 ? (
            <Box
              sx={{
                padding: '16px',
                fontSize: '12px',
                color: theme.palette.text.secondary,
              }}
            >
              No cheat sheets. Add one below.
            </Box>
          ) : (
            rows.map((r, i) => (
              <EditRow
                key={r.localId}
                row={r}
                index={i}
                error={errors[i]}
                isEditing={editingId === r.localId}
                isDragging={dragId === r.localId}
                dropTarget={
                  dropTarget && dropTarget.id === r.localId
                    ? dropTarget.position
                    : null
                }
                onStartEdit={() => setEditingId(r.localId)}
                onEndEdit={() => setEditingId(null)}
                onChange={(v) => updateTitle(r.localId, v)}
                onTypeChange={(v) => updateType(r.localId, v)}
                onLayoutChange={(v) => updateLayout(r.localId, v)}
                onRemove={() => removeRow(r.localId)}
                onPointerDown={onHandlePointerDown(r.localId)}
                onPointerMove={onHandlePointerMove(r.localId)}
                onPointerUp={onHandlePointerUp(r.localId)}
                onPointerCancel={onHandlePointerCancel}
                onRowRef={(el) => {
                  if (el) rowRefsMap.current.set(r.localId, el)
                  else rowRefsMap.current.delete(r.localId)
                }}
                onMoveUp={() => moveRow(r.localId, 'up')}
                onMoveDown={() => moveRow(r.localId, 'down')}
              />
            ))
          )}
          <div ref={listEndRef} />
        </Box>

        {/* Pinned controls */}
        <Box
          sx={{
            flexShrink: 0,
            borderTop: `0.5px solid ${divider}`,
            background: isDark
              ? 'rgba(255,255,255,0.018)'
              : 'rgba(255,255,255,0.30)',
          }}
        >
          {/* Add row button */}
          <Box sx={{ padding: '10px 14px 8px' }}>
            <Box
              component='button'
              onClick={addRow}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  isDark ? 'rgba(100,180,255,0.06)' : 'rgba(0,113,227,0.05)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                  accent
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                  isDark ? 'rgba(100,180,255,0.32)' : 'rgba(0,113,227,0.30)'
              }}
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'transparent',
                border: `1px dashed ${isDark ? 'rgba(100,180,255,0.32)' : 'rgba(0,113,227,0.30)'}`,
                borderRadius: '8px',
                padding: '8px 10px',
                cursor: 'pointer',
                fontFamily: theme.typography.fontFamily,
                fontSize: '12px',
                fontWeight: 500,
                color: accent,
                transition: 'all 0.14s',
              }}
            >
              <svg
                width='12'
                height='12'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.4'
              >
                <line x1='12' y1='5' x2='12' y2='19' />
                <line x1='5' y1='12' x2='19' y2='12' />
              </svg>
              Add cheatsheet
            </Box>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              borderTop: `0.5px solid ${divider}`,
              padding: '10px 16px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            {/* Status text */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '18px',
              }}
            >
              {errorCt > 0 ? (
                <>
                  <svg
                    width='12'
                    height='12'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='#ff6b6b'
                    strokeWidth='2.2'
                    style={{ flexShrink: 0 }}
                  >
                    <circle cx='12' cy='12' r='10' />
                    <line x1='12' y1='8' x2='12' y2='12' />
                    <line x1='12' y1='16' x2='12.01' y2='16' />
                  </svg>
                  <Box
                    component='span'
                    sx={{
                      fontFamily: theme.typography.fontFamily,
                      fontSize: '11px',
                      color: '#ff6b6b',
                      fontWeight: 500,
                    }}
                  >
                    {errorCt} {errorCt === 1 ? 'error' : 'errors'}
                  </Box>
                </>
              ) : dirty ? (
                <Box
                  component='span'
                  sx={{
                    fontFamily: theme.typography.fontFamily,
                    fontSize: '11px',
                    color: theme.palette.text.secondary,
                    fontStyle: 'italic',
                  }}
                >
                  Unsaved changes
                </Box>
              ) : (
                <Box
                  component='span'
                  sx={{
                    fontFamily: theme.typography.fontFamily,
                    fontSize: '11px',
                    color: isDark
                      ? 'rgba(255,255,255,0.22)'
                      : 'rgba(0,0,0,0.28)',
                  }}
                >
                  No changes
                </Box>
              )}
            </Box>

            {/* Buttons */}
            <Box sx={{ display: 'flex', gap: '8px' }}>
              <FooterButton onClick={onCancel}>Cancel</FooterButton>
              <FooterButton onClick={onSave} primary disabled={!canSave}>
                {saving ? 'Saving…' : 'Save'}
              </FooterButton>
            </Box>
          </Box>
        </Box>
      </Box>

      <Dialog
        open={confirmSaveOpen}
        onClose={() => setConfirmSaveOpen(false)}
        maxWidth='xs'
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)'}`,
              boxShadow: isDark
                ? '0 24px 64px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(255,255,255,0.10)'
                : '0 24px 64px rgba(0,0,50,0.30), 0 0 0 0.5px rgba(255,255,255,0.7)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            padding: '14px 18px 12px',
            fontSize: 14,
            fontWeight: 600,
            borderBottom: `0.5px solid ${divider}`,
          }}
        >
          Save Changes
        </DialogTitle>
        <DialogContent sx={{ padding: '16px 18px !important' }}>
          <Typography sx={{ fontSize: 13 }}>Save changes and close?</Typography>
        </DialogContent>
        <DialogActions
          sx={{
            padding: '12px 16px 14px',
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.018)'
              : 'rgba(255,255,255,0.30)',
            borderTop: `0.5px solid ${divider}`,
          }}
        >
          <Button
            onClick={() => setConfirmSaveOpen(false)}
            sx={{
              borderRadius: '7px',
              padding: '5px 16px',
              fontSize: 12,
              fontWeight: 600,
              minWidth: 78,
              textTransform: 'none',
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(255,255,255,0.75)',
              border: `0.5px solid ${divider}`,
              color: 'text.primary',
              '&:hover': {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.10)'
                  : 'rgba(255,255,255,0.95)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={doSave}
            sx={{
              borderRadius: '7px',
              padding: '5px 16px',
              fontSize: 12,
              fontWeight: 600,
              minWidth: 78,
              textTransform: 'none',
              backgroundColor: isDark ? '#64b4ff' : '#0071e3',
              border: '0.5px solid transparent',
              color: '#fff',
              boxShadow: !isDark
                ? 'inset 0 1px 0 rgba(255,255,255,0.5)'
                : 'none',
              '&:hover': {
                backgroundColor: isDark ? '#7cc0ff' : '#1a82eb',
              },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        maxWidth='xs'
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)'}`,
              boxShadow: isDark
                ? '0 24px 64px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(255,255,255,0.10)'
                : '0 24px 64px rgba(0,0,50,0.30), 0 0 0 0.5px rgba(255,255,255,0.7)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            padding: '14px 18px 12px',
            fontSize: 14,
            fontWeight: 600,
            borderBottom: `0.5px solid ${divider}`,
          }}
        >
          Discard Changes
        </DialogTitle>
        <DialogContent sx={{ padding: '16px 18px !important' }}>
          <Typography sx={{ fontSize: 13 }}>
            You have unsaved changes. Close anyway?
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            padding: '12px 16px 14px',
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.018)'
              : 'rgba(255,255,255,0.30)',
            borderTop: `0.5px solid ${divider}`,
          }}
        >
          <Button
            onClick={() => setConfirmCancelOpen(false)}
            sx={{
              borderRadius: '7px',
              padding: '5px 16px',
              fontSize: 12,
              fontWeight: 600,
              minWidth: 78,
              textTransform: 'none',
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(255,255,255,0.75)',
              border: `0.5px solid ${divider}`,
              color: 'text.primary',
              '&:hover': {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.10)'
                  : 'rgba(255,255,255,0.95)',
              },
            }}
          >
            Keep editing
          </Button>
          <Button
            onClick={doCancel}
            sx={{
              borderRadius: '7px',
              padding: '5px 16px',
              fontSize: 12,
              fontWeight: 600,
              minWidth: 78,
              textTransform: 'none',
              backgroundColor: isDark
                ? 'rgba(255,100,100,0.20)'
                : 'rgba(200,50,50,0.08)',
              border: `0.5px solid ${isDark ? 'rgba(255,100,100,0.35)' : 'rgba(200,50,50,0.25)'}`,
              color: isDark ? '#ff9090' : '#b83232',
              '&:hover': {
                backgroundColor: isDark
                  ? 'rgba(255,100,100,0.28)'
                  : 'rgba(200,50,50,0.13)',
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
