'use client'
import { useTruncatedTooltip } from '@/hooks/useTruncatedTooltip'
import { Tooltip, Typography, TypographyProps } from '@mui/material'

export type TruncatedTextProps = TypographyProps & {
  text: string
}

export const TruncatedText = ({
  text,
  variant = 'h3',
  ...props
}: TruncatedTextProps) => {
  const { ref, isTruncated, checkIfTruncated } = useTruncatedTooltip()

  return (
    <Tooltip title={isTruncated ? text : ''} arrow>
      <Typography
        ref={ref}
        variant={variant}
        noWrap={true}
        onMouseEnter={checkIfTruncated}
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        {...props}
      >
        {text}
      </Typography>
    </Tooltip>
  )
}
