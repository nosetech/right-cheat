'use client'

import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'

interface ThemedSwitchProps {
  checked: boolean
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
}

export function ThemedSwitch({
  checked,
  onChange,
  disabled = false,
}: ThemedSwitchProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const borderColor = isDark
    ? 'rgba(255,255,255,0.10)'
    : 'rgba(255,255,255,0.75)'

  const handleToggle = () => {
    if (disabled) return
    const syntheticEvent = {
      target: { checked: !checked },
    } as React.ChangeEvent<HTMLInputElement>
    onChange(syntheticEvent)
  }

  return (
    <Box
      component='div'
      role='switch'
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleToggle}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          handleToggle()
        }
      }}
      sx={{
        width: 36,
        height: 20,
        borderRadius: '10px',
        flexShrink: 0,
        backgroundColor: checked
          ? theme.palette.primary.main
          : theme.palette.switch.trackBackground,
        border: `0.5px solid ${borderColor}`,
        position: 'relative',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1,
        outline: 'none',
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: '2px',
        },
      }}
    >
      <Box
        sx={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: theme.palette.onAccent,
          position: 'absolute',
          top: '2px',
          left: '2px',
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 0.2s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        }}
      />
    </Box>
  )
}
