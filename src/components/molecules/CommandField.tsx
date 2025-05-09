'use client'
import { OverflowEllipsis } from '@/components/atoms'
import { useClipboard } from '@/hooks/useClipboard'
import { Box, Stack, StackProps, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export type CommandFieldProps = StackProps & {
  description: string
  command: string
}

export const CommandField = (props: CommandFieldProps) => {
  const { description, command, tabIndex, ...remainProps } = props

  const theme = useTheme()

  const { copy, hasCopied, error } = useClipboard(command)

  const colorScheme = () => {
    const defaultScheme = {
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.primary.main,
      border: 2,
      borderColor: 'base.main',
      borderRadius: 1,
      '&:hover': {
        borderColor: 'alert.main',
      },
      '&:focus-visible': {
        outlineStyle: 'outset',
        outlineColor: 'alert.main',
        outlineWidth: 3,
      },
    }
    if (error) {
      return {
        ...defaultScheme,
        backgroundColor: theme.palette.alert.main,
      }
    } else if (hasCopied) {
      return {
        ...defaultScheme,
        backgroundColor: theme.palette.background.default,
      }
    } else {
      return defaultScheme
    }
  }

  return (
    <Stack {...remainProps}>
      <OverflowEllipsis>
        <Typography variant='h3' noWrap={true}>
          ・{description}
        </Typography>
      </OverflowEllipsis>
      <Stack paddingLeft={1}>
        <Box
          tabIndex={tabIndex ?? 0}
          padding={1}
          sx={colorScheme()}
          onClick={copy}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              copy()
            }
          }}
        >
          <OverflowEllipsis>
            <Typography variant='body1' noWrap={true}>
              {command}
            </Typography>
          </OverflowEllipsis>
        </Box>
      </Stack>
    </Stack>
  )
}
