'use client'
import React from 'react'

import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { CommandField } from '@/components/molecules/CommandField'
import {
  COMMAND_GRID_COL_GAP,
  COMMAND_GRID_ROW_GAP,
  INLINE_GRID_TEMPLATE_COLUMNS,
} from '@/constants/layout'
import { CommandData, CommandLayout } from '@/types/api/CheatSheet'

type CommandFieldGroupProps = {
  group: string
  commandlist: CommandData[]
  startIndex: number
  mode: 'copy' | 'execute'
  cheatSheetLayout?: CommandLayout
  commandFieldRefs: React.MutableRefObject<Array<HTMLDivElement | null>>
  editMode?: boolean
}

export const CommandFieldGroup = ({
  group,
  commandlist,
  startIndex,
  mode,
  cheatSheetLayout,
  commandFieldRefs,
  editMode = false,
}: CommandFieldGroupProps) => {
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
          top: -6,
          left: 8,
          px: 0.5,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.secondary,
          lineHeight: 1,
        }}
      >
        {group}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: INLINE_GRID_TEMPLATE_COLUMNS,
          columnGap: COMMAND_GRID_COL_GAP,
          rowGap: COMMAND_GRID_ROW_GAP,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {commandlist.map((item, i) => {
          const flatIndex = startIndex + i
          return (
            <CommandField
              key={i}
              ref={(el) => {
                commandFieldRefs.current[flatIndex] = el
              }}
              description={item.description}
              command={item.command}
              numberHint={
                flatIndex < 9 ? (flatIndex + 1).toString() : undefined
              }
              mode={mode}
              layout={item.layout ?? cheatSheetLayout ?? 'inline'}
              editMode={editMode}
            />
          )
        })}
      </Box>
    </Box>
  )
}
