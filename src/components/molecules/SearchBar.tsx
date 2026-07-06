'use client'
import { scaledPx } from '@/utils/css'
import { KeyboardEvent, RefObject } from 'react'

import { Box } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

import { FONT_UI } from '@/theme/fonts'

type Props = {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  onCompositionStart?: () => void
  onCompositionEnd?: () => void
  inputRef?: RefObject<HTMLInputElement | null>
}

// 検索入力欄（RightCheat Mockup v16 / Search 画面に準拠）。
// 左に虫眼鏡アイコン、入力があるとき右端にクリアボタンを表示する。
export const SearchBar = ({
  value,
  onChange,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  inputRef,
}: Props) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accentSolid = theme.palette.accent.main

  return (
    <Box sx={{ padding: '14px 16px 10px' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: theme.palette.glass.field,
          border: `0.5px solid ${alpha(theme.palette.accent.main, isDark ? 0.3 : 0.25)}`,
          borderRadius: '10px',
          padding: '8px 12px',
          boxShadow: isDark
            ? `inset 0 1px 0 rgba(0,0,0,0.30), 0 0 0 3px ${alpha(theme.palette.accent.main, 0.06)}`
            : `inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 3px ${alpha(theme.palette.accent.main, 0.05)}`,
        }}
      >
        <svg
          width='16'
          height='16'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2.2'
          style={{ color: accentSolid, flexShrink: 0 }}
        >
          <circle cx='11' cy='11' r='8' />
          <line x1='21' y1='21' x2='16.65' y2='16.65' />
        </svg>
        <Box
          component='input'
          ref={inputRef}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
          onKeyDown={onKeyDown}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          placeholder='Search commands and descriptions…'
          autoFocus
          sx={{
            flex: 1,
            minWidth: 0,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontFamily: FONT_UI,
            fontSize: scaledPx(theme.custom.fontSize.searchInput),
            fontWeight: 500,
            color: theme.palette.text.primary,
            caretColor: accentSolid,
            '&::placeholder': {
              color: theme.palette.text.secondary,
              opacity: 0.7,
            },
          }}
        />
        {value && (
          <Box
            component='button'
            type='button'
            onClick={() => {
              onChange('')
              inputRef?.current?.focus()
            }}
            title='Clear'
            aria-label='Clear search'
            sx={{
              background: theme.palette.surface.hover,
              border: 'none',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              color: theme.palette.text.secondary,
            }}
          >
            <svg
              width='9'
              height='9'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='3'
            >
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </Box>
        )}
      </Box>
    </Box>
  )
}
