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
import { debug } from '@tauri-apps/plugin-log'
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

  useEffect(() => {
    ;(async () => {
      const inputpath = await getCheatSheetFilePath()
      setJsonInputPath(inputpath)

      listen<{}>('reload_cheat_sheat', () => {
        ;(async () => {
          const inputpath = await getCheatSheetFilePath()
          setJsonInputPath(inputpath)
        })()
      })
    })()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    jsonInputPath &&
      invoke<string>('get_cheat_titles', { inputPath: jsonInputPath }).then(
        (response) => {
          debug(`invoke 'get_cheat_titles' response=${response}`)
          const titles: CheatSheetTitleData = JSON.parse(response)
          setCheatSheetTitles(titles)
          setCheatSheet(titles.title.length > 0 ? titles.title[0] : '')
        },
      )
  }, [jsonInputPath])

  useEffect(() => {
    selectCheatSheet != '' &&
      invoke<string>('get_cheat_sheet', {
        inputPath: jsonInputPath,
        title: selectCheatSheet,
      }).then((response) => {
        debug(`invoke 'get_cheat_sheet' response=${response}`)
        const data: CheatSheetData = JSON.parse(response)
        setCheatSheetData(data)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectCheatSheet])

  const handleChange = (event: SelectChangeEvent) => {
    setCheatSheet(event.target.value as string)
  }

  return (
    <Stack padding={1}>
      {jsonInputPath == undefined ? (
        <Typography variant='body1' color='error'>
          入力ファイルのパスが指定されていません。
          <br />
          [メニュー] - [Preference]で入力ファイルパスを設定してください。
        </Typography>
      ) : selectCheatSheet == '' ? (
        <Typography variant='body1' color='error'>
          正しい内容の入力ファイルが指定されていないようです。
          <br /> [メニュー] -
          [Preference]で指定されている入力ファイルの内容を見直してください。
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
