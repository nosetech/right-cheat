import {
  ClipboardButton,
  ClipboardButtonProps,
} from '@/components/atoms/ClipboardButton'
import { Box, Stack, TextField, TextFieldProps } from '@mui/material'

export type TextFieldWithClipboardProps = TextFieldProps & {
  clipboardProps: ClipboardButtonProps
}

export const TextFieldWithClipboard = (props: TextFieldWithClipboardProps) => {
  const { clipboardProps, ...textFieldProps } = props

  return (
    <Stack direction='row' alignItems='center'>
      <TextField {...textFieldProps} />
      <Box>
        <ClipboardButton {...clipboardProps} />
      </Box>
    </Stack>
  )
}
