'use client'
import { Box, Stack, StackProps, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { forwardRef } from 'react'

export type ShortcutFieldProps = StackProps & {
  description: string
  command: string
}

export const ShortcutField = forwardRef<HTMLDivElement, ShortcutFieldProps>(
  (props, ref) => {
    const { description, command, ...remainProps } = props

    const theme = useTheme()

    return (
      <Stack
        ref={ref}
        direction='column'
        spacing={0.5}
        alignItems='center'
        padding={1}
        sx={{
          border: 2,
          borderColor: theme.palette.base.pale,
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.text.primary,
          borderRadius: 1,
          minHeight: '80px',
          justifyContent: 'center',
          '&:hover': {
            borderColor: theme.palette.alert.main,
          },
          '&:focus-visible': {
            outlineStyle: 'outset',
            outlineColor: theme.palette.alert.main,
            outlineWidth: 2,
          },
        }}
        {...remainProps}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '32px',
            width: '100%',
          }}
        >
          <Typography
            variant='body1'
            sx={{
              fontWeight: 600,
              textAlign: 'center',
              wordBreak: 'break-word',
            }}
          >
            {command}
          </Typography>
        </Box>
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{
            textAlign: 'center',
            wordBreak: 'break-word',
            fontSize: '0.7rem',
          }}
        >
          {description}
        </Typography>
      </Stack>
    )
  },
)

ShortcutField.displayName = 'ShortcutField'
