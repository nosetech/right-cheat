'use client'

import FileOpenOutlinedIcon from '@mui/icons-material/FileOpenOutlined'
import { IconButton, IconButtonProps } from '@mui/material'
import { blue } from '@mui/material/colors'
import { open } from '@tauri-apps/plugin-dialog'
import { Dispatch, SetStateAction } from 'react'

export type FileOpenButtonProps = IconButtonProps & {
  filePathSetter: Dispatch<SetStateAction<string | null>>
}

export const FileOpenButton = (props: FileOpenButtonProps) => {
  const { filePathSetter, ...remainProps } = props

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
    filePathSetter(file)
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
