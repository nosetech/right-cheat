'use client'
import { Box, Stack, StackProps, Typography } from '@mui/material'
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
      <Box
        maxWidth='100%'
        width='fit-content'
        px={1}
        py={0.5}
        sx={{
          border: 2,
          borderColor: theme.palette.base.pale,
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.text.primary,
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
}
