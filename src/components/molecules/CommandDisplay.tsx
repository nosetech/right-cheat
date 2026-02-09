'use client'
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

  return (
    <Box maxWidth='100%' width='fit-content' {...boxProps}>
      <Typography
        variant='body1'
        noWrap={true}
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'pre',
        }}
        {...typographyProps}
      >
        {command}
      </Typography>
    </Box>
  )
}
