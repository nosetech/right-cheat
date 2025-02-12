'use client'
import { useClipboard } from '@/hooks/useClipboard'
import { TextField, TextFieldProps } from '@mui/material'
import { blue, grey, red } from '@mui/material/colors'

export type TextFieldWithClipboardProps = TextFieldProps

export const TextFieldWithClipboard = (props: TextFieldWithClipboardProps) => {
  const { value, ...remainProps } = props

  const { copy, hasCopied, error } = useClipboard(value as string)

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
    <TextField
      value={value}
      {...remainProps}
      onClick={copy}
      onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          copy()
        }
      }}
      sx={colorScheme()}
    />
  )
}
