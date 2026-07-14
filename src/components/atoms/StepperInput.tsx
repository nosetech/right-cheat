'use client'

import { scaledPx } from '@/utils/css'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useEffect, useState } from 'react'

interface StepperInputProps {
  value: number
  min: number
  max: number
  suffix: string
  onChange: (value: number) => void
  boxWidth?: number
  inputWidth?: number
}

/**
 * 「− / 数値入力 / ＋」のコンパクトな横並びコントロール。
 * 数値は直接入力可能（数字以外は除去、blur 時に範囲内へクランプ）。
 * ↑/↓ キーで増減、Enter で確定（blur）。
 * 現在値が最小値のとき「−」、最大値のとき「＋」が無効化される。
 */
export function StepperInput({
  value,
  min,
  max,
  suffix,
  onChange,
  boxWidth = 72,
  inputWidth = 34,
}: StepperInputProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // 入力中は空文字を許容するため、表示用の文字列を別に保持する
  const [draft, setDraft] = useState<string>(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const clamp = (v: number) => Math.max(min, Math.min(max, v))

  const commit = (v: number) => {
    const clamped = clamp(v)
    setDraft(String(clamped))
    if (clamped !== value) {
      onChange(clamped)
    }
  }

  const current = () => {
    const n = parseInt(draft, 10)
    return Number.isNaN(n) ? min : n
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, '')
    setDraft(digits)
  }

  const handleBlur = () => {
    commit(current())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      commit(current() + 1)
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      commit(current() - 1)
    }
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  const stepBtnSx = (disabled: boolean) => ({
    width: 26,
    height: 26,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: disabled ? 'text.disabled' : 'text.secondary',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    fontFamily: 'monospace',
    fontSize: scaledPx(theme.custom.fontSize.searchInput),
    fontWeight: 600,
    lineHeight: 1,
    p: 0,
    transition: 'background 0.12s',
    '&:hover': {
      background: disabled ? 'transparent' : theme.palette.surface.hover,
    },
  })

  const decrementDisabled = value <= min
  const incrementDisabled = value >= max

  return (
    <Box
      sx={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: theme.palette.glass.field,
        backdropFilter: 'blur(12px)',
        border: `0.5px solid ${theme.palette.divider}`,
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: isDark ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      <Box
        component='button'
        type='button'
        title='Decrease'
        disabled={decrementDisabled}
        onClick={() => commit(current() - 1)}
        sx={stepBtnSx(decrementDisabled)}
      >
        –
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          px: '8px',
          width: boxWidth,
          justifyContent: 'center',
          borderLeft: `0.5px solid ${theme.palette.divider}`,
          borderRight: `0.5px solid ${theme.palette.divider}`,
          alignSelf: 'stretch',
        }}
      >
        <Box
          component='input'
          type='text'
          inputMode='numeric'
          value={draft}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={(e: React.FocusEvent<HTMLInputElement>) =>
            e.currentTarget.select()
          }
          sx={{
            width: inputWidth,
            textAlign: 'right',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            p: 0,
            m: 0,
            fontFamily: 'monospace',
            fontSize: scaledPx(theme.custom.fontSize.label),
            fontWeight: 700,
            color: 'text.primary',
            caretColor: theme.palette.primary.main,
            MozAppearance: 'textfield',
          }}
        />
        <Typography
          component='span'
          sx={{
            fontFamily: 'monospace',
            fontSize: scaledPx(theme.custom.fontSize.commandMultiline),
            color: 'text.disabled',
            flexShrink: 0,
          }}
        >
          {suffix}
        </Typography>
      </Box>
      <Box
        component='button'
        type='button'
        title='Increase'
        disabled={incrementDisabled}
        onClick={() => commit(current() + 1)}
        sx={stepBtnSx(incrementDisabled)}
      >
        +
      </Box>
    </Box>
  )
}
