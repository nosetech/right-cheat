'use client'

import { type ThemeMode } from '@/hooks/useThemeStore'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'LIGHT' },
  { value: 'dark', label: 'DARK' },
  { value: 'system', label: 'SYSTEM' },
]

interface ThemeToggleProps {
  themeMode: ThemeMode
  onChange: (mode: ThemeMode) => void
  disabled?: boolean
}

export function ThemeToggle({
  themeMode,
  onChange,
  disabled = false,
}: ThemeToggleProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box sx={{ display: 'flex' }}>
      {MODES.map(({ value, label }, i) => {
        const selected = themeMode === value
        const borderColor = isDark
          ? 'rgba(255,255,255,0.10)'
          : 'rgba(255,255,255,0.72)'
        return (
          <button
            key={value}
            onClick={() => !disabled && onChange(value)}
            disabled={disabled}
            aria-label={`${value} theme`}
            style={{
              background: selected
                ? isDark
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(255,255,255,0.7)'
                : 'transparent',
              backdropFilter: 'blur(12px)',
              border: `0.5px solid ${borderColor}`,
              borderLeft: i === 0 ? `0.5px solid ${borderColor}` : 'none',
              padding: '5px 14px',
              cursor: disabled ? 'default' : 'pointer',
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: selected ? 700 : 400,
              color: selected
                ? theme.palette.primary.main
                : isDark
                  ? 'rgba(255,255,255,0.28)'
                  : 'rgba(0,0,0,0.28)',
              transition: 'all 0.14s',
              borderRadius:
                i === 0
                  ? '5px 0 0 5px'
                  : i === MODES.length - 1
                    ? '0 5px 5px 0'
                    : 0,
              boxShadow:
                selected && !isDark
                  ? 'inset 0 1px 0 rgba(255,255,255,0.85)'
                  : 'none',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {label}
          </button>
        )
      })}
    </Box>
  )
}
