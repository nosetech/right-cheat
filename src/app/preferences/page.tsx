'use client'

import { useEffect, useState } from 'react'

import { FileOpenButton, OverflowEllipsis } from '@/components/atoms'
import { Box, Stack, Typography } from '@mui/material'
import { invoke } from '@tauri-apps/api/core'

import { usePreferencesStore } from '@/hooks/usePreferencesStore'

export default function Page() {
  const [inputPath, setInputPath] = useState<string | null>('')

  const { getCheatSheetFilePath, setCheatSheetFilePath } = usePreferencesStore()

  useEffect(() => {
    ;(async () => {
      const inputpath = await getCheatSheetFilePath()
      setInputPath(inputpath)
    })()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    ;(async () => {
      if (inputPath) {
        await setCheatSheetFilePath(inputPath)
        invoke<string>('reload_cheat_sheat').then((response) => {
          console.log(response)
        })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputPath])

  return (
    <Stack padding={1} spacing={1}>
      <Typography variant='body1'>CheetSheet Json File</Typography>
      <Stack direction='row' padding={1} spacing={1}>
        <FileOpenButton filePathSetter={setInputPath} size='small' />
        <Box padding={0.5} border={1} borderRadius={1} width='100%'>
          <OverflowEllipsis>
            <Typography noWrap={true} width='100%'>
              {inputPath}
            </Typography>
          </OverflowEllipsis>
        </Box>
      </Stack>
    </Stack>
  )
}
