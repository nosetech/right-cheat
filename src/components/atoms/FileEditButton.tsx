'use client'

import EditNoteIcon from '@mui/icons-material/EditNote'
import { IconButton, IconButtonProps } from '@mui/material'

export type FileEditButtonProps = IconButtonProps

export const FileEditButton = (props: FileEditButtonProps) => {
  return (
    <IconButton {...props}>
      <EditNoteIcon fontSize='inherit' />
    </IconButton>
  )
}
