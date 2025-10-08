'use client'
import { useClipboard } from '@/hooks/useClipboard'
import { Box, Stack, StackProps, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { forwardRef } from 'react'

export type CommandFieldProps = StackProps & {
  description: string
  command: string
  numberHint?: string
}

export const CommandField = forwardRef<HTMLDivElement, CommandFieldProps>(
  (props, ref) => {
    const { description, command, numberHint, tabIndex, ...remainProps } = props

    const theme = useTheme()

    const { copy, hasCopied, error } = useClipboard(command)

    const colorScheme = () => {
      const defaultScheme = {
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.primary.main,
        border: 2,
        borderColor: 'base.pale',
        '&:hover': {
          borderColor: 'alert.main',
        },
        '&:focus-visible': {
          outlineStyle: 'outset',
          outlineColor: 'alert.main',
          outlineWidth: 2,
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
      <Stack direction='row' spacing={1} alignItems='baseline' {...remainProps}>
        <Box
          sx={{
            width: '20px',
            minWidth: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {numberHint && (
            <Typography
              variant='caption'
              color='text.disabled'
              sx={{
                textAlign: 'center',
              }}
            >
              {numberHint}
            </Typography>
          )}
        </Box>
        <Box
          ref={ref}
          maxWidth='100%'
          width='fit-content'
          tabIndex={tabIndex ?? 0}
          padding={0.5}
          sx={colorScheme()}
          onClick={copy}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              copy()
            }
          }}
        >
          <Typography
            variant='body1'
            noWrap={true}
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {command}
          </Typography>
        </Box>
        <Typography
          variant='h3'
          noWrap={true}
          color='text.secondary'
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {description}
        </Typography>
      </Stack>
    )
  },
)

CommandField.displayName = 'CommandField'
