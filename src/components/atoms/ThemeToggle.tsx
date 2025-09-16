'use client'

import { type ThemeMode } from '@/hooks/useThemeStore'
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
} from '@mui/material'

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
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value as ThemeMode)
  }

  return (
    <Box>
      <FormControl component='fieldset' disabled={disabled}>
        <FormLabel component='legend'>テーマ</FormLabel>
        <RadioGroup
          aria-label='theme'
          name='theme'
          value={themeMode}
          onChange={handleChange}
          row
        >
          <FormControlLabel
            value='light'
            control={<Radio size='small' />}
            label='ライト'
          />
          <FormControlLabel
            value='dark'
            control={<Radio size='small' />}
            label='ダーク'
          />
          <FormControlLabel
            value='system'
            control={<Radio size='small' />}
            label='システム設定に従う'
          />
        </RadioGroup>
      </FormControl>
    </Box>
  )
}
