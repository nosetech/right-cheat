'use client'
import { scaledPx } from '@/utils/css'

import { useTheme } from '@mui/material/styles'

import { ChevronDownIcon, LockIcon } from '@/components/atoms/icons'
import { useBadgeDropdown } from '@/hooks/edit-cheatsheets/useBadgeDropdown'
import { SheetType } from '@/types/api/CheatSheet'

import { BadgeDropdown, BadgeDropdownOption } from './BadgeDropdown'
import { TYPE_META } from './meta'

export function TypeBadge({
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
  const { color, background: bg, border } = theme.palette.sheetType[type]

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
          fontSize: scaledPx(theme.custom.fontSize.numberHint),
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
          <LockIcon size={8.5} strokeWidth={2.4} style={{ opacity: 0.75 }} />
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
          <ChevronDownIcon
            size={8}
            strokeWidth={3}
            style={{ marginLeft: 1, opacity: 0.75 }}
          />
        )}
      </button>

      {open && pos && (
        <BadgeDropdown popRef={popRef} pos={pos} header='Type' minWidth={220}>
          {(Object.keys(TYPE_META) as SheetType[]).map((k) => {
            const m = TYPE_META[k]
            const { color: c, background: cBg } = theme.palette.sheetType[k]
            return (
              <BadgeDropdownOption
                key={k}
                selected={k === type}
                onSelect={() => {
                  onChange(k)
                  setOpen(false)
                }}
                leading={
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: c,
                      flexShrink: 0,
                      boxShadow: `0 0 0 2px ${cBg}`,
                    }}
                  />
                }
                label={m.label}
                description={m.description}
                labelStyle={{
                  fontSize: scaledPx(theme.custom.fontSize.dialogMessage),
                }}
              />
            )
          })}
        </BadgeDropdown>
      )}
    </>
  )
}
