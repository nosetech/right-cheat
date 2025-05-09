'use client'

import { useEffect, useState } from 'react'

import { FileOpenButton, OverflowEllipsis } from '@/components/atoms'
import { Box, Stack, Typography } from '@mui/material'
import { invoke } from '@tauri-apps/api/core'
import { debug } from '@tauri-apps/plugin-log'

import { usePreferencesStore } from '@/hooks/usePreferencesStore'

export default function Page() {
  const [filePath, setFilePath] = useState<string>()
  const [settedInputFilePath, setSettedInputFilePath] = useState<string>()

  const { getCheatSheetFilePath, setCheatSheetFilePath } = usePreferencesStore()

  useEffect(() => {
    ;(async () => {
      const inputpath = await getCheatSheetFilePath()
      setSettedInputFilePath(inputpath)
    })()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    ;(async () => {
      if (filePath) {
        setSettedInputFilePath(filePath)
        await setCheatSheetFilePath(filePath)
        invoke<string>('reload_cheat_sheat').then((response) => {
          debug(`invoke 'reload_cheat_sheat' response=${response}`)
        })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath])

  return (
    <Stack padding={1} spacing={1}>
      <Typography variant='body1'>CheetSheet Json File</Typography>
      <Stack direction='row' padding={1} spacing={1}>
        <FileOpenButton filePathSetter={setFilePath} size='small' />
        <Box padding={0.5} border={1} borderRadius={1} width='100%'>
          <OverflowEllipsis>
            <Typography noWrap={true}>{settedInputFilePath}</Typography>
          </OverflowEllipsis>
        </Box>
      </Stack>
    </Stack>
  )
}
