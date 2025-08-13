'use client'

import EditIcon from '@mui/icons-material/Edit'
import { IconButton, IconButtonProps } from '@mui/material'

export type EditButtonProps = IconButtonProps

export const EditButton = (props: EditButtonProps) => {
  return (
    <IconButton {...props}>
      <EditIcon fontSize='inherit' />
    </IconButton>
  )
}
