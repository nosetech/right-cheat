'use client'
import { CommandField } from '@/components/molecules/CommandField'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import {
  CheatSheetData,
  CheatSheetTitleData,
  CommandData,
} from '@/types/api/CheatSheet'
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material'
import { Stack } from '@mui/system'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'

export type CheatSheetProps = {}

export const CheatSheet = (props: CheatSheetProps) => {
  const [jsonInputPath, setJsonInputPath] = useState<string>()

  const [cheatSheetTitles, setCheatSheetTitles] = useState<
    CheatSheetTitleData | undefined
  >()
  const [selectCheatSheet, setCheatSheet] = useState<string>('')

  const [cheatSheetData, setCheatSheetData] = useState<CheatSheetData>()

  const { getCheatSheetFilePath } = usePreferencesStore()

  listen<{}>('reload_cheat_sheat', (event) => {
    ;(async () => {
      console.log(event)
      const inputpath = await getCheatSheetFilePath()
      setJsonInputPath(inputpath)
    })()
  })

  useEffect(() => {
    ;(async () => {
      const inputpath = await getCheatSheetFilePath()
      setJsonInputPath(inputpath)
    })()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    jsonInputPath != undefined &&
      invoke<string>('get_cheat_titles', { inputPath: jsonInputPath }).then(
        (response) => {
          const titles: CheatSheetTitleData = JSON.parse(response)
          setCheatSheetTitles(titles)
          setCheatSheet(titles.title.length > 0 ? titles.title[0] : '')
        },
      )
  }, [jsonInputPath])

  useEffect(() => {
    jsonInputPath != undefined &&
      selectCheatSheet != '' &&
      invoke<string>('get_cheat_sheet', {
        inputPath: jsonInputPath,
        title: selectCheatSheet,
      }).then((response) => {
        const data: CheatSheetData = JSON.parse(response)
        setCheatSheetData(data)
      })
  }, [jsonInputPath, selectCheatSheet])

  const handleChange = (event: SelectChangeEvent) => {
    setCheatSheet(event.target.value as string)
  }

  return (
    <Stack padding={1}>
      {jsonInputPath == undefined ? (
        <Typography variant='body1' color='error'>
          入力ファイルのパスが指定されていません。[メニュー] -
          [Preference]で入力ファイルパスを設定してください。
        </Typography>
      ) : (
        <>
          <FormControl fullWidth>
            <InputLabel id='demo-simple-select-label'>CheatSheet</InputLabel>
            <Select
              labelId='demo-simple-select-label'
              id='demo-simple-select'
              value={selectCheatSheet}
              label='CheatSheet'
              onChange={handleChange}
            >
              {cheatSheetTitles?.title.map((item, index) => (
                <MenuItem key={index} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack padding={1} spacing={1} width='100%'>
            {cheatSheetData?.commandlist.map((item: CommandData, index) => (
              <CommandField
                key={index}
                description={item.description}
                command={item.command}
              />
            ))}
          </Stack>
        </>
      )}
    </Stack>
  )
}
