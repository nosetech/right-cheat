'use client'

import FileOpenOutlinedIcon from '@mui/icons-material/FileOpenOutlined'
import { IconButton, IconButtonProps } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { open } from '@tauri-apps/plugin-dialog'

export type FileOpenButtonProps = IconButtonProps & {
  callback: (filepath: string) => void
}

export const FileOpenButton = (props: FileOpenButtonProps) => {
  const { callback, ...remainProps } = props

  const theme = useTheme()

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
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.primary.main,
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
      opacity: 0.8,
    },
  }

  return (
    <IconButton {...remainProps} onClick={openDialog} sx={colorScheme}>
      <FileOpenOutlinedIcon fontSize='inherit' />
    </IconButton>
  )
}
