'use client'
import { scaledPx } from '@/utils/css'
import { Box, Stack, StackProps, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { TruncatedText } from '@/components/atoms/TruncatedText'
import { FONT_CODE } from '@/theme/fonts'

export type ShortcutFieldProps = StackProps & {
  description: string
  command: string
}

export const ShortcutField = (props: ShortcutFieldProps) => {
  const { description, command, ...remainProps } = props
  const theme = useTheme()

  return (
    <Stack direction='row' spacing={1} alignItems='center' {...remainProps}>
      <Box
        sx={{
          flexShrink: 0,
          background: theme.palette.ui.fieldRowBg,
          border: `0.5px solid ${theme.palette.ui.borderSubtle}`,
          borderRadius: 1,
          px: 1,
          py: '3px',
        }}
      >
        <Typography
          sx={{
            fontFamily: FONT_CODE,
            fontSize: scaledPx(theme.custom.fontSize.caption),
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
          fontSize: scaledPx(theme.custom.fontSize.captionSm),
          color: theme.palette.text.secondary,
        }}
      />
    </Stack>
  )
}
