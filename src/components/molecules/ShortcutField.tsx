'use client'
import { Box, Stack, StackProps, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { TruncatedText } from '@/components/atoms/TruncatedText'

export type ShortcutFieldProps = StackProps & {
  description: string
  command: string
}

export const ShortcutField = (props: ShortcutFieldProps) => {
  const { description, command, ...remainProps } = props
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Stack direction='row' spacing={1} alignItems='center' {...remainProps}>
      <Box
        sx={{
          flexShrink: 0,
          background: isDark
            ? 'rgba(255,255,255,0.055)'
            : 'rgba(255,255,255,0.48)',
          border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 1,
          px: 1,
          py: '3px',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: 'calc(11.5px * var(--font-scale))',
            color: theme.palette.text.primary,
            whiteSpace: 'nowrap',
            lineHeight: 1.55,
          }}
        >
          {command}
        </Typography>
      </Box>
      <TruncatedText
        text={description}
        sx={{
          fontSize: 'calc(11px * var(--font-scale))',
          color: theme.palette.text.secondary,
        }}
      />
    </Stack>
  )
}
