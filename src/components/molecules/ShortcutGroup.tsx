'use client'
import { Box, Grid, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { ShortcutField } from '@/components/molecules/ShortcutField'
import { CommandData } from '@/types/api/CheatSheet'

type ShortcutGroupProps = {
  group: string
  commandlist: CommandData[]
}

export const ShortcutGroup = ({ group, commandlist }: ShortcutGroupProps) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        position: 'relative',
        border: 1,
        borderColor: theme.palette.divider,
        borderRadius: 1,
        pt: 2,
        pb: 1,
        px: 1,
        mt: 1,
      }}
    >
      <Typography
        variant='caption'
        sx={{
          position: 'absolute',
          top: -10,
          left: 8,
          px: 0.5,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.secondary,
          lineHeight: 1,
        }}
      >
        {group}
      </Typography>
      <Grid container spacing={1}>
        {commandlist.map((item, index) => (
          <Grid key={index} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
            <ShortcutField
              m={0.5}
              description={item.description ?? ''}
              command={item.command}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
