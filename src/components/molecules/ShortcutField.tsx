'use client'
import { TruncatedText } from '@/components/atoms/TruncatedText'
import { CommandDisplay } from '@/components/molecules/CommandDisplay'
import { Stack, StackProps } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export type ShortcutFieldProps = StackProps & {
  description: string
  command: string
}

export const ShortcutField = (props: ShortcutFieldProps) => {
  const { description, command, ...remainProps } = props

  const theme = useTheme()

  return (
    <Stack direction='row' spacing={1} alignItems='baseline' {...remainProps}>
      <CommandDisplay
        command={command}
        boxProps={{
          maxWidth: '100%',
          width: 'fit-content',
          px: 1,
          py: 0.5,
          sx: {
            border: 2,
            borderColor: theme.palette.base.pale,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.text.primary,
          },
        }}
      />
      <TruncatedText text={description} color='text.secondary' />
    </Stack>
  )
}
