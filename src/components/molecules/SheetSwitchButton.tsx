'use client'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { getCurrentWindow } from '@tauri-apps/api/window'

export type SheetSwitchButtonHandle = {
  open: () => void
}

type Props = {
  titles: string[]
  selected: string
  onSelect: (title: string) => void
}

export const SheetSwitchButton = forwardRef<SheetSwitchButtonHandle, Props>(
  ({ titles, selected, onSelect }, ref) => {
    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [activeIdx, setActiveIdx] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const activeItemRef = useRef<HTMLDivElement>(null)

    const scrollActiveIntoView = useCallback(() => {
      activeItemRef.current?.scrollIntoView({ block: 'nearest' })
    }, [])

    useImperativeHandle(ref, () => ({ open: () => setOpen(true) }))

    const filtered = useMemo(
      () => titles.filter((t) => t.toLowerCase().includes(query.toLowerCase())),
      [titles, query],
    )

    useEffect(() => {
      setActiveIdx(0)
    }, [query])

    useEffect(() => {
      scrollActiveIntoView()
    }, [activeIdx, scrollActiveIntoView])

    useEffect(() => {
      if (!open) return
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }, [open])

    useEffect(() => {
      if (!open) return
      const handler = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setOpen(false)
        }
      }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [open])

    // ドロップダウンを閉じた後に WKWebView の first responder を復元する。
    // input がアンマウントされると WKWebView がキーボードの first responder を失うため、
    // setFocus() でウィンドウをキーウィンドウに戻し、トリガーボタンを focus() する。
    const restoreFocusAfterClose = useCallback(() => {
      setTimeout(async () => {
        await getCurrentWindow().setFocus()
        const btn = containerRef.current?.querySelector<HTMLElement>('button')
        btn?.focus()
      }, 0)
    }, [])

    const commit = (sheet: string) => {
      onSelect(sheet)
      setOpen(false)
      setQuery('')
      restoreFocusAfterClose()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[activeIdx]) commit(filtered[activeIdx])
      } else if (e.key === 'Escape') {
        setOpen(false)
        restoreFocusAfterClose()
      }
    }

    const dropdownBg = isDark ? 'rgba(12,28,48,0.97)' : 'rgba(240,245,255,0.97)'
    const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'
    const inputBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'

    return (
      <Box ref={containerRef} sx={{ position: 'relative' }}>
        <Box
          component='button'
          onClick={() => setOpen((o) => !o)}
          title='チートシートを切替'
          sx={{
            background: open
              ? isDark
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(0,0,0,0.08)'
              : 'none',
            border: `0.5px solid ${open ? theme.palette.accent.main : 'transparent'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            p: '3px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: open
              ? theme.palette.accent.main
              : theme.palette.text.disabled,
            transition: 'all 0.15s',
            '&:hover': { color: theme.palette.text.primary },
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
            <line x1='8' y1='6' x2='21' y2='6' />
            <line x1='8' y1='12' x2='21' y2='12' />
            <line x1='8' y1='18' x2='21' y2='18' />
            <line x1='3' y1='6' x2='3.01' y2='6' />
            <line x1='3' y1='12' x2='3.01' y2='12' />
            <line x1='3' y1='18' x2='3.01' y2='18' />
          </svg>
          <svg
            width='8'
            height='8'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
            style={{
              opacity: 0.5,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.18s',
            }}
          >
            <polyline points='6 9 12 15 18 9' />
          </svg>
        </Box>

        {open && (
          <Box
            sx={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: '220px',
              background: dropdownBg,
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: `0.5px solid ${borderColor}`,
              borderRadius: '10px',
              zIndex: 1200,
              boxShadow: isDark
                ? '0 16px 48px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.07)'
                : '0 8px 32px rgba(0,0,50,0.12), 0 0 0 0.5px rgba(255,255,255,0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                padding: '8px 10px 6px',
                borderBottom: `0.5px solid ${borderColor}`,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: inputBg,
                  border: `0.5px solid ${borderColor}`,
                  borderRadius: '6px',
                  padding: '4px 8px',
                }}
              >
                <svg
                  width='11'
                  height='11'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.2'
                  style={{
                    color: theme.palette.text.disabled,
                    flexShrink: 0,
                  }}
                >
                  <circle cx='11' cy='11' r='8' />
                  <line x1='21' y1='21' x2='16.65' y2='16.65' />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='絞り込む...'
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    color: theme.palette.text.primary,
                  }}
                />
                {query && (
                  <Box
                    component='button'
                    onClick={() => {
                      setQuery('')
                      inputRef.current?.focus()
                    }}
                    sx={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: theme.palette.text.disabled,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <svg
                      width='10'
                      height='10'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2.5'
                    >
                      <line x1='18' y1='6' x2='6' y2='18' />
                      <line x1='6' y1='6' x2='18' y2='18' />
                    </svg>
                  </Box>
                )}
              </Box>
            </Box>

            <Box
              role='listbox'
              sx={{
                maxHeight: '200px',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
              }}
            >
              {filtered.length === 0 ? (
                <Typography
                  sx={{
                    padding: '10px 16px',
                    fontSize: '12px',
                    color: theme.palette.text.disabled,
                    textAlign: 'center',
                  }}
                >
                  見つかりません
                </Typography>
              ) : (
                filtered.map((title, i) => (
                  <SheetDropdownItem
                    key={title}
                    ref={i === activeIdx ? activeItemRef : undefined}
                    label={title}
                    selected={title === selected}
                    active={i === activeIdx}
                    query={query}
                    isDark={isDark}
                    textPrimary={theme.palette.text.primary}
                    accentColor={theme.palette.accent.main}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => commit(title)}
                  />
                ))
              )}
            </Box>
          </Box>
        )}
      </Box>
    )
  },
)

SheetSwitchButton.displayName = 'SheetSwitchButton'

type DropdownItemProps = {
  label: string
  selected: boolean
  active: boolean
  query: string
  isDark: boolean
  textPrimary: string
  accentColor: string
  onMouseEnter: () => void
  onClick: () => void
}

const SheetDropdownItem = forwardRef<HTMLDivElement, DropdownItemProps>(
  function SheetDropdownItem(
    {
      label,
      selected,
      active,
      query,
      isDark,
      textPrimary,
      accentColor,
      onMouseEnter,
      onClick,
    },
    ref,
  ) {
    return (
      <Box
        ref={ref}
        role='option'
        aria-selected={selected}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        sx={{
          padding: '7px 12px',
          cursor: 'pointer',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: selected ? accentColor : textPrimary,
          background: active
            ? isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.05)'
            : 'none',
          transition: 'background 0.08s',
        }}
      >
        <Box
          sx={{
            width: '12px',
            flexShrink: 0,
            color: accentColor,
            opacity: selected ? 1 : 0,
          }}
        >
          <svg
            width='11'
            height='11'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.8'
          >
            <polyline points='20 6 9 17 4 12' />
          </svg>
        </Box>
        <HighlightMatch text={label} query={query} isDark={isDark} />
      </Box>
    )
  },
)

function HighlightMatch({
  text,
  query,
  isDark,
}: {
  text: string
  query: string
  isDark: boolean
}) {
  if (!query) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark
        style={{
          background: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.12)',
          color: 'inherit',
          borderRadius: '2px',
          padding: '0 1px',
        }}
      >
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}
