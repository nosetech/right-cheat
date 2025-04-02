'use client'
import { CommandField } from '@/components/molecules/CommandField'
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
} from '@mui/material'
import { Stack } from '@mui/system'
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'

export type CheatSheetProps = {}

export const CheatSheet = (props: CheatSheetProps) => {
  const [cheatSheetTitles, setCheatSheetTitles] = useState<
    CheatSheetTitleData | undefined
  >()
  const [selectCheatSheet, setCheatSheet] = useState<string>('')

  const [cheatSheetData, setCheatSheetData] = useState<CheatSheetData>()

  useEffect(() => {
    invoke<string>('get_cheat_titles').then((response) => {
      const titles: CheatSheetTitleData = JSON.parse(response)
      setCheatSheetTitles(titles)
      setCheatSheet(titles.title.length > 0 ? titles.title[0] : '')
    })
  }, [])

  useEffect(() => {
    selectCheatSheet != '' &&
      invoke<string>('get_cheat_sheet', { title: selectCheatSheet }).then(
        (response) => {
          const data: CheatSheetData = JSON.parse(response)
          setCheatSheetData(data)
        },
      )
  }, [selectCheatSheet])

  const handleChange = (event: SelectChangeEvent) => {
    setCheatSheet(event.target.value as string)
  }

  return (
    <Stack padding={1}>
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
      <Stack padding={1} spacing={1} width='400px'>
        {cheatSheetData?.commandlist.map((item: CommandData, index) => (
          <CommandField
            key={index}
            description={item.description}
            command={item.command}
          />
        ))}
      </Stack>
    </Stack>
  )
}
