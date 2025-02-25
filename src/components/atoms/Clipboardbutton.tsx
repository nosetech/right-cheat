'use client'
import { useClipboard } from '@/hooks/useClipboard'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { IconButton, IconButtonProps } from '@mui/material'
import { blue, grey, red } from '@mui/material/colors'

export type ClipboardButtonProps = IconButtonProps & {
  value: string
}

export const ClipboardButton = (props: ClipboardButtonProps) => {
  const { value, ...remainProps } = props

  const { copy, hasCopied, error } = useClipboard(value)

  const colorScheme = () => {
    if (error) {
      return {
        color: red[500],
        backgroundColor: grey[100],
      }
    } else if (hasCopied) {
      return {
        color: blue[300],
        backgroundColor: grey[100],
      }
    } else {
      return {
        color: '#ffffff',
        backgroundColor: blue[300],
        '&:hover': {
          backgroundColor: blue[300],
          opacity: 0.8,
        },
      }
    }
  }

  return (
    <IconButton {...remainProps} onClick={copy} sx={colorScheme()}>
      <ContentCopyIcon fontSize='inherit' />
    </IconButton>
  )
}
