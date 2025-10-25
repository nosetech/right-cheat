'use client'
import { useTruncatedTooltip } from '@/hooks/useTruncatedTooltip'
import { Box, Stack, StackProps, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export type ShortcutFieldProps = StackProps & {
  description: string
  command: string
}

export const ShortcutField = (props: ShortcutFieldProps) => {
  const { description, command, ...remainProps } = props

  const theme = useTheme()
  const {
    ref: descriptionRef,
    isTruncated,
    checkIfTruncated,
  } = useTruncatedTooltip()

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
      <Tooltip title={isTruncated ? description : ''} arrow>
        <Typography
          ref={descriptionRef}
          variant='h3'
          noWrap={true}
          color='text.secondary'
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={checkIfTruncated}
        >
          {description}
        </Typography>
      </Tooltip>
    </Stack>
  )
}
