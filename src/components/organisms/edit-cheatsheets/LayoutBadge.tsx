'use client'
import { scaledPx } from '@/utils/css'

import { useTheme } from '@mui/material/styles'

import { ChevronDownIcon, LayoutIcon, LockIcon } from '@/components/atoms/icons'
import { useBadgeDropdown } from '@/hooks/edit-cheatsheets/useBadgeDropdown'
import { FONT_CODE } from '@/theme/fonts'
import { CommandLayout, SheetType } from '@/types/api/CheatSheet'

import { BadgeDropdown, BadgeDropdownOption } from './BadgeDropdown'
import { LAYOUT_META } from './meta'

export function LayoutBadge({
  value,
  sheetType,
  onChange,
}: {
  value: CommandLayout
  sheetType: SheetType
  onChange: (l: CommandLayout) => void
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const locked = sheetType === 'shortcut'
  const effectiveValue = locked ? 'inline' : value
  const meta = LAYOUT_META[effectiveValue]

  const { open, setOpen, pos, hov, setHov, btnRef, popRef, openMenu } =
    useBadgeDropdown()

  return (
    <>
      <button
        ref={btnRef}
        onClick={locked ? undefined : openMenu}
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
          fontSize: scaledPx(theme.custom.fontSize.captionSm),
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
          <LayoutIcon layout={effectiveValue} />
        </span>
        <span
          style={{
            fontFamily: FONT_CODE,
            fontSize: scaledPx(theme.custom.fontSize.hint),
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
          <LockIcon
            size={9}
            strokeWidth={2.4}
            style={{
              marginLeft: 1,
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
              opacity: 0.75,
            }}
          />
        ) : (
          <ChevronDownIcon
            size={8}
            strokeWidth={3}
            style={{
              marginLeft: 1,
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
            }}
          />
        )}
      </button>

      {open && pos && (
        <BadgeDropdown
          popRef={popRef}
          pos={pos}
          header='Default layout'
          minWidth={240}
        >
          {(Object.keys(LAYOUT_META) as CommandLayout[]).map((k) => {
            const m = LAYOUT_META[k]
            return (
              <BadgeDropdownOption
                key={k}
                selected={k === value}
                onSelect={() => {
                  onChange(k)
                  setOpen(false)
                }}
                leading={
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
                    <LayoutIcon layout={k} />
                  </span>
                }
                label={m.label}
                description={m.description}
                labelStyle={{
                  fontFamily: FONT_CODE,
                  fontSize: scaledPx(theme.custom.fontSize.body),
                }}
              />
            )
          })}
        </BadgeDropdown>
      )}
    </>
  )
}
