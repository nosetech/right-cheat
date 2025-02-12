'use client'
import { TextFieldWithClipboard } from '@/components/molecules/TextFieldWithClipboard'
import { Stack, TextFieldProps, Typography } from '@mui/material'
import { grey } from '@mui/material/colors'

export type CommandFieldProps = TextFieldProps & {
  description: string
}

export const CommandField = (props: CommandFieldProps) => {
  const { description, ...remainProps } = props

  return (
    <Stack>
      <Typography color={grey[900]}>・{description}</Typography>
      <Stack paddingLeft={1}>
        <TextFieldWithClipboard {...remainProps} />
      </Stack>
    </Stack>
  )
}
