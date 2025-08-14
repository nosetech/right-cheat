'use client'

import SettingsIcon from '@mui/icons-material/Settings'
import { IconButton, IconButtonProps } from '@mui/material'

export type SettingsButtonProps = IconButtonProps

export const SettingsButton = (props: SettingsButtonProps) => {
  return (
    <IconButton {...props}>
      <SettingsIcon fontSize='inherit' />
    </IconButton>
  )
}
