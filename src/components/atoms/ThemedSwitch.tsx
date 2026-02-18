'use client'

import { Switch, SwitchProps } from '@mui/material'
import { useTheme } from '@mui/material/styles'

interface ThemedSwitchProps extends Omit<SwitchProps, 'sx'> {
  checked: boolean
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function ThemedSwitch({
  checked,
  onChange,
  ...props
}: ThemedSwitchProps) {
  const theme = useTheme()

  return (
    <Switch
      checked={checked}
      onChange={onChange}
      sx={{
        '& .MuiSwitch-switchBase.Mui-checked': {
          color: theme.palette.switch.checked,
          '&:hover': {
            backgroundColor: theme.palette.switch.checkedHover,
          },
        },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
          backgroundColor: theme.palette.switch.track,
        },
        '& .MuiSwitch-switchBase': {
          color: theme.palette.switch.unchecked,
          '&:hover': {
            backgroundColor: theme.palette.switch.uncheckedHover,
          },
        },
        '& .MuiSwitch-track': {
          backgroundColor: theme.palette.switch.trackBackground,
        },
      }}
      {...props}
    />
  )
}
