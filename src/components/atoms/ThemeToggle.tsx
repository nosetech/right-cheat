'use client'

import { type ThemeMode } from '@/hooks/useThemeStore'
import {
  Box,
  FormControl,
  FormLabel,
  ToggleButton,
  ToggleButtonGroup,
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
  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newThemeMode: string | null,
  ) => {
    if (newThemeMode !== null) {
      onChange(newThemeMode as ThemeMode)
    }
  }

  return (
    <Box>
      <FormControl component='fieldset' disabled={disabled}>
        <FormLabel component='legend'>Theme</FormLabel>
        <ToggleButtonGroup
          value={themeMode}
          exclusive
          onChange={handleChange}
          aria-label='theme selection'
          size='small'
          sx={{ mt: 1 }}
        >
          <ToggleButton value='light' aria-label='light theme'>
            Light
          </ToggleButton>
          <ToggleButton value='dark' aria-label='dark theme'>
            Dark
          </ToggleButton>
          <ToggleButton value='system' aria-label='system theme'>
            System
          </ToggleButton>
        </ToggleButtonGroup>
      </FormControl>
    </Box>
  )
}
