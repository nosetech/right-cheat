'use client'
import { getDisplayCommand } from '@/utils/parseCommand'
import { Box, BoxProps, Typography, TypographyProps } from '@mui/material'

export type CommandDisplayProps = {
  command: string
  boxProps?: BoxProps
  typographyProps?: TypographyProps
}

export const CommandDisplay = ({
  command,
  boxProps,
  typographyProps,
}: CommandDisplayProps) => {
  const displayCommand = getDisplayCommand(command)

  return (
    <Box maxWidth='100%' width='fit-content' {...boxProps}>
      <Typography
        variant='body1'
        noWrap={false}
        sx={{
          whiteSpace: 'pre-line',
        }}
        {...typographyProps}
      >
        {displayCommand}
      </Typography>
    </Box>
  )
}
