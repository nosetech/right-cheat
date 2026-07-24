'use client'

import {
  HEAT_COLOR_OPTIONS,
  HEAT_COLOR_PALETTES,
  HeatBarColorId,
} from '@/constants/heatPalette'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { CheckIcon } from './icons'

interface HeatColorPickerProps {
  value: HeatBarColorId
  onChange: (value: HeatBarColorId) => void
}

/**
 * Preferences → Clipboard History の「Heat bar color」設定用カラーピッカー。
 * 20px の円形スウォッチを4列グリッドで8個（7色 + None）並べる。
 * 選択色は白いリング + チェックマーク、None は斜線アイコンで表す。
 */
export function HeatColorPicker({ value, onChange }: HeatColorPickerProps) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 20px)',
        gap: '6px',
        justifyContent: 'end',
      }}
    >
      {HEAT_COLOR_OPTIONS.map((option) => {
        const selected = value === option.id
        const isNone = option.id === 'none'
        return (
          <Box
            key={option.id}
            component='button'
            type='button'
            title={option.label}
            aria-label={option.label}
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            sx={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              flexShrink: 0,
              padding: 0,
              cursor: 'pointer',
              position: 'relative',
              outline: 'none',
              backgroundColor: isNone
                ? theme.palette.surface.hover
                : HEAT_COLOR_PALETTES.find((p) => p.id === option.id)?.solid,
              // 彩度の高いスウォッチ背景に対して常に視認できるよう、選択リングは
              // ライト/ダークで切り替えずに白固定とする（v19 モックアップ準拠）。
              border: selected
                ? '2px solid #fff'
                : `0.5px solid ${theme.palette.divider}`,
            }}
          >
            {isNone && (
              <svg
                width={12}
                height={12}
                viewBox='0 0 24 24'
                fill='none'
                stroke={theme.palette.text.disabled}
                strokeWidth={2.2}
                strokeLinecap='round'
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%,-50%)',
                }}
              >
                <line x1='5' y1='19' x2='19' y2='5' />
              </svg>
            )}
            {selected && !isNone && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%,-50%)',
                  color: '#fff',
                  display: 'flex',
                }}
              >
                <CheckIcon size={10} strokeWidth={3.2} />
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
