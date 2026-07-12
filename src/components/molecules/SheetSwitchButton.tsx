'use client'
import { scaledPx } from '@/utils/css'
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
import { debug } from '@tauri-apps/plugin-log'

import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  ListIcon,
  SearchIcon,
} from '@/components/atoms/icons'

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

    // ドロップダウンを閉じた後に WKWebView の first responder を復元する。
    // input がアンマウントされると WKWebView がキーボードの first responder を失うため、
    // setFocus() でウィンドウをキーウィンドウに戻し、トリガーボタンを focus() する。
    const restoreFocusAfterClose = useCallback(() => {
      setTimeout(async () => {
        debug('[SheetSwitchButton] restore first responder to trigger button')
        await getCurrentWindow().setFocus()
        const btn = containerRef.current?.querySelector<HTMLElement>('button')
        btn?.focus()
      }, 0)
    }, [])

    useEffect(() => {
      if (!open) return
      const handler = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setOpen(false)
          // 外側クリックでは自然なフォーカス遷移が起きるが、余白クリック等で
          // クリック先がフォーカス可能要素でない場合は WKWebView が first responder
          // を失ったままになるため、ここでも復元を行う。
          restoreFocusAfterClose()
        }
      }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [open, restoreFocusAfterClose])

    const commit = (sheet: string) => {
      debug(`[SheetSwitchButton] sheet selected: "${sheet}"`)
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

    const dropdownBg = theme.palette.glass.overlay
    const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'
    const inputBg = isDark
      ? theme.palette.glass.field
      : theme.palette.surface.hover

    return (
      <Box ref={containerRef} sx={{ position: 'relative' }}>
        <Box
          component='button'
          onClick={() => setOpen((o) => !o)}
          title='Switch cheat sheet'
          aria-haspopup='listbox'
          aria-expanded={open}
          sx={{
            background: open ? theme.palette.surface.hover : 'none',
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
          <ListIcon size={13} />
          <ChevronDownIcon
            size={8}
            strokeWidth={2.5}
            style={{
              opacity: 0.5,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.18s',
            }}
          />
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
                <SearchIcon
                  size={11}
                  strokeWidth={2.2}
                  style={{
                    color: theme.palette.text.disabled,
                    flexShrink: 0,
                  }}
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='Filter...'
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: scaledPx(theme.custom.fontSize.body),
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
                    <CloseIcon size={10} strokeWidth={2.5} />
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
                    fontSize: scaledPx(theme.custom.fontSize.body),
                    color: theme.palette.text.disabled,
                    textAlign: 'center',
                  }}
                >
                  Not found
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
    const theme = useTheme()
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
          fontSize: scaledPx(theme.custom.fontSize.label),
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: selected ? accentColor : textPrimary,
          background: active ? theme.palette.surface.hover : 'none',
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
          <CheckIcon size={11} strokeWidth={2.8} />
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
