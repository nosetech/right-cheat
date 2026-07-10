'use client'
import { RefObject } from 'react'

import { Box, Grid } from '@mui/material'

import { CommandField } from '@/components/molecules/CommandField'
import { CommandFieldGroup } from '@/components/molecules/CommandFieldGroup'
import { ShortcutField } from '@/components/molecules/ShortcutField'
import { ShortcutGroup } from '@/components/molecules/ShortcutGroup'
import {
  COMMAND_GRID_COL_GAP,
  COMMAND_GRID_ROW_GAP,
  INLINE_GRID_TEMPLATE_COLUMNS,
} from '@/constants/layout'
import {
  CheatSheetData,
  CommandListItem,
  isCommandGroupData,
} from '@/types/api/CheatSheet'

type Props = {
  cheatSheetData?: CheatSheetData
  flatStartIndices: number[]
  commandFieldRefs: RefObject<Array<HTMLDivElement | null>>
}

/**
 * 通常モード（非編集）のコマンド一覧。
 * shortcut タイプはグリッド、command/application タイプは inline グリッドで描画する。
 */
export function NormalCommandList({
  cheatSheetData,
  flatStartIndices,
  commandFieldRefs,
}: Props) {
  if (!cheatSheetData) return null

  if (cheatSheetData.type === 'shortcut') {
    return (
      <Grid container spacing={1} p={1} width='100%'>
        {cheatSheetData.commandlist.map((item: CommandListItem, index) => {
          if (isCommandGroupData(item)) {
            return (
              <Grid key={index} size={{ xs: 12 }}>
                <ShortcutGroup
                  group={item.group}
                  commandlist={item.commandlist}
                />
              </Grid>
            )
          }
          return (
            <Grid key={index} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <ShortcutField
                m={0.5}
                description={item.description ?? ''}
                command={item.command}
              />
            </Grid>
          )
        })}
      </Grid>
    )
  }

  const mode = cheatSheetData.type === 'application' ? 'execute' : 'copy'

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: INLINE_GRID_TEMPLATE_COLUMNS,
        columnGap: COMMAND_GRID_COL_GAP,
        rowGap: COMMAND_GRID_ROW_GAP,
        py: 1,
        width: '100%',
      }}
    >
      {cheatSheetData.commandlist.map((item: CommandListItem, index) => {
        const flatIndex = flatStartIndices[index]
        if (isCommandGroupData(item)) {
          return (
            <Box key={index} pt={1} sx={{ gridColumn: '1 / -1' }}>
              <CommandFieldGroup
                group={item.group}
                commandlist={item.commandlist}
                startIndex={flatIndex}
                mode={mode}
                cheatSheetLayout={cheatSheetData.layout}
                commandFieldRefs={commandFieldRefs}
              />
            </Box>
          )
        }
        return (
          <CommandField
            key={index}
            ref={(el) => {
              commandFieldRefs.current[flatIndex] = el
            }}
            description={item.description}
            command={item.command}
            numberHint={(flatIndex + 1).toString()}
            mode={mode}
            layout={item.layout ?? cheatSheetData.layout ?? 'inline'}
          />
        )
      })}
    </Box>
  )
}
