'use client'

import FileOpenOutlinedIcon from '@mui/icons-material/FileOpenOutlined'
import { IconButton, IconButtonProps } from '@mui/material'
import { blue } from '@mui/material/colors'
import { open } from '@tauri-apps/plugin-dialog'

export type FileOpenButtonProps = IconButtonProps & {
  callback: (filepath: string) => void
}

export const FileOpenButton = (props: FileOpenButtonProps) => {
  const { callback, ...remainProps } = props

  const openDialog = async () => {
    const file = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          extensions: ['json'],
          name: '*',
        },
      ],
    })
    if (file != null) {
      callback(file)
    }
  }

  const colorScheme = {
    color: '#000000',
    backgroundColor: blue[300],
    '&:hover': {
      backgroundColor: blue[300],
      opacity: 0.8,
    },
  }

  return (
    <IconButton {...remainProps} onClick={openDialog} sx={colorScheme}>
      <FileOpenOutlinedIcon fontSize='inherit' />
    </IconButton>
  )
}
