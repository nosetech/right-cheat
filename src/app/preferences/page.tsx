'use client'

import { useEffect, useState } from 'react'

import { Box, Stack, Typography } from '@mui/material'
import { invoke } from '@tauri-apps/api/core'
import { debug } from '@tauri-apps/plugin-log'

import { FileOpenButton, OverflowEllipsis } from '@/components/atoms'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import { CheatSheetAPI } from '@/types/api/CheatSheet'

export default function Page() {
  const [settedInputFilePath, setSettedInputFilePath] = useState<string>()

  const { getCheatSheetFilePath, setCheatSheetFilePath } = usePreferencesStore()

  useEffect(() => {
    ;(async () => {
      const inputpath = await getCheatSheetFilePath()
      setSettedInputFilePath(inputpath)
    })()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const callback = (filepath: string) => {
    ;(async () => {
      debug(`callback ${filepath}`)
      setSettedInputFilePath(filepath)
      await setCheatSheetFilePath(filepath)
      await invoke<string>(CheatSheetAPI.RELOAD_CHEAT_SHEET).then(
        (response) => {
          debug(
            `invoke '${CheatSheetAPI.RELOAD_CHEAT_SHEET}' response=${response}`,
          )
        },
      )
    })()
  }

  return (
    <Stack padding={1} spacing={1}>
      <Typography variant='body1'>CheetSheet Json File</Typography>
      <Stack direction='row' padding={1} spacing={1}>
        <FileOpenButton callback={callback} size='small' />
        <Box padding={0.5} border={1} borderRadius={1} width='100%'>
          <OverflowEllipsis>
            <Typography noWrap={true}>{settedInputFilePath}</Typography>
          </OverflowEllipsis>
        </Box>
      </Stack>
    </Stack>
  )
}
