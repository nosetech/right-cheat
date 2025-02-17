'use client'
import { useClipboard } from '@/hooks/useClipboard'
import { Box, Stack, StackProps, Typography } from '@mui/material'
import { blue, grey, red } from '@mui/material/colors'

export type CommandFieldProps = StackProps & {
  description: string
  command: string
}

export const CommandField = (props: CommandFieldProps) => {
  const { description, command, tabIndex, ...remainProps } = props

  const { copy, hasCopied, error } = useClipboard(command)

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
        border: 'solid black 2px',
        '&:hover': {
          border: 'solid red 2px',
          backgroundColor: blue[300],
        },
        '&:focus-visible': {
          outline: 'outset red 3px',
          backgroundColor: blue[300],
        },
      }
    }
  }

  return (
    <Stack {...remainProps}>
      <Typography color={grey[900]}>・{description}</Typography>
      <Stack paddingLeft={1}>
        <Box
          padding={1}
          sx={colorScheme()}
          tabIndex={tabIndex ?? 0}
          onClick={copy}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              copy()
            }
          }}
        >
          <Typography color={grey[900]}>{command}</Typography>
        </Box>
      </Stack>
    </Stack>
  )
}
