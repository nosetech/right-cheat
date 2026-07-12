'use client'
import { scaledPx } from '@/utils/css'
import { RefObject } from 'react'
import ReactDOM from 'react-dom'

import { useTheme } from '@mui/material/styles'

import { CheckIcon } from '@/components/atoms/icons'

// TypeBadge / LayoutBadge のドロップダウンで共有する Portal シェル。
// パネルの外枠・ヘッダー見出しを描画し、オプション行は children で受け取る。
export function BadgeDropdown({
  popRef,
  pos,
  header,
  minWidth,
  children,
}: {
  popRef: RefObject<HTMLDivElement | null>
  pos: { top: number; right: number }
  header: string
  minWidth: number
  children: React.ReactNode
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return ReactDOM.createPortal(
    <div
      ref={popRef}
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        background: theme.palette.glass.overlay,
        border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)'}`,
        borderRadius: 10,
        padding: 5,
        minWidth,
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
          fontSize: scaledPx(theme.custom.fontSize.numberHint),
          fontWeight: 600,
          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: '6px 8px 4px',
        }}
      >
        {header}
      </div>
      {children}
    </div>,
    document.body,
  )
}

// ドロップダウン内の1オプション行。先頭要素（leading）と label のフォントのみ
// バッジ種別ごとに差し替える。
export function BadgeDropdownOption({
  selected,
  onSelect,
  leading,
  label,
  description,
  labelStyle,
}: {
  selected: boolean
  onSelect: () => void
  leading: React.ReactNode
  label: string
  description: string
  labelStyle?: React.CSSProperties
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accent = theme.palette.accent.main

  return (
    <button
      onClick={onSelect}
      onMouseEnter={(e) => {
        if (!selected)
          (e.currentTarget as HTMLButtonElement).style.background = isDark
            ? 'rgba(255,255,255,0.035)'
            : 'rgba(0,0,0,0.025)'
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
        color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)',
        textAlign: 'left',
        transition: 'background 0.10s',
      }}
    >
      {leading}
      <span style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 500,
            color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)',
            ...labelStyle,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: scaledPx(theme.custom.fontSize.hint),
            color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
            marginTop: 1,
          }}
        >
          {description}
        </div>
      </span>
      {selected && (
        <CheckIcon
          size={13}
          strokeWidth={2.6}
          color={accent}
          style={{ flexShrink: 0 }}
        />
      )}
    </button>
  )
}
