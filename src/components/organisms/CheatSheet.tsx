'use client'
import { useEffect, useRef, useState } from 'react'

import {
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Stack } from '@mui/system'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { debug } from '@tauri-apps/plugin-log'

import { Event } from '@/common'
import { CommandField } from '@/components/molecules/CommandField'
import { ShortcutField } from '@/components/molecules/ShortcutField'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import {
  CheatSheetAPI,
  CheatSheetData,
  CheatSheetTitleData,
  CommandData,
} from '@/types/api/CheatSheet'

export const CheatSheet = () => {
  const [jsonInputPath, setJsonInputPath] = useState<string>()

  const [cheatSheetTitles, setCheatSheetTitles] = useState<
    CheatSheetTitleData | undefined
  >()
  const [selectCheatSheet, setCheatSheet] = useState<string>('')

  const [cheatSheetData, setCheatSheetData] = useState<CheatSheetData>()

  const [reloading, setReloading] = useState<boolean>(false)

  const theme = useTheme()
  const { getCheatSheetFilePath } = usePreferencesStore()

  // Refs for keyboard shortcuts
  const commandFieldRefs = useRef<Array<HTMLDivElement | null>>([])
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ; (async () => {
      await listen<{}>(Event.RELOAD_CHEAT_SHEET, () => {
        ; (async () => {
          const inputpath = await getCheatSheetFilePath()
          if (inputpath) {
            setReloading(true)
            setCheatSheet('')
            await invoke<string>(CheatSheetAPI.GET_CHEAT_TITLES, {
              inputPath: inputpath,
            }).then((response) => {
              debug(
                `invoke '${CheatSheetAPI.GET_CHEAT_TITLES}' response=${response}`,
              )
              const titles: CheatSheetTitleData = JSON.parse(response)
              setCheatSheetTitles(titles)
              setCheatSheet(titles.title.length > 0 ? titles.title[0] : '')
            })
            setJsonInputPath(inputpath)
            setReloading(false)
          }
        })()
      })

      await invoke<string>(CheatSheetAPI.RELOAD_CHEAT_SHEET).then(
        (response) => {
          debug(
            `invoke '${CheatSheetAPI.RELOAD_CHEAT_SHEET}' response=${response}`,
          )
        },
      )
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectCheatSheet != '') {
      invoke<string>(CheatSheetAPI.GET_CHEAT_SHEET, {
        inputPath: jsonInputPath,
        title: selectCheatSheet,
      }).then((response) => {
        debug(`invoke '${CheatSheetAPI.GET_CHEAT_SHEET}' response=${response}`)
        const data: CheatSheetData = JSON.parse(response)
        setCheatSheetData(data)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectCheatSheet])

  const handleChange = (event: SelectChangeEvent) => {
    setCheatSheet(event.target.value as string)
  }

  // Keyboard shortcuts handler
  // Only enable number key shortcuts for command type (not for shortcut type)
  const isCommandType = cheatSheetData?.type !== 'shortcut'

  useKeyboardShortcuts({
    onNumberKey: (index) => {
      // Trigger click on the corresponding command field (1-9)
      // Only for command type sheets
      if (
        isCommandType &&
        cheatSheetData?.commandlist &&
        index < cheatSheetData.commandlist.length
      ) {
        const targetElement = commandFieldRefs.current[index]
        if (targetElement) {
          // Trigger the Enter key event to copy the command
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true,
          })
          targetElement.dispatchEvent(enterEvent)
        }
      }
    },
    onZeroKey: () => {
      // Open the select dropdown by focusing and pressing Enter
      if (selectRef.current) {
        // Find the focusable element (the display div with role="combobox")
        const selectButton = selectRef.current.querySelector(
          'div[role="combobox"]',
        ) as HTMLElement

        if (selectButton) {
          // Focus the element
          selectButton.focus()

          // Dispatch Enter key event
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          })
          selectButton.dispatchEvent(enterEvent)
          debug('0 key: Focused and dispatched Enter event to select button')
        } else {
          debug('0 key: Could not find div[role="combobox"]')
        }
      } else {
        debug('0 key: selectRef.current is null')
      }
    },
  })

  return (
    <Stack padding={1}>
      {jsonInputPath == undefined ? (
        <Typography variant='body1' color='error'>
          入力ファイルのパスが指定されていません。
          <br />
          [メニュー] - [Preference]で入力ファイルパスを設定してください。
        </Typography>
      ) : reloading == false && selectCheatSheet == '' ? (
        <Typography variant='body1' color='error'>
          正しい内容の入力ファイルが指定されていないようです。
          <br /> [メニュー] -
          [Preference]で指定されている入力ファイルの内容を見直してください。
        </Typography>
      ) : (
        <>
          <FormControl fullWidth ref={selectRef}>
            <InputLabel
              sx={{
                '&.Mui-focused': {
                  color: theme.palette.base.main,
                },
              }}
            >
              CheatSheet
            </InputLabel>
            <Select
              value={selectCheatSheet}
              label='CheatSheet'
              onChange={handleChange}
              size='small'
              sx={{
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.base.main,
                },
              }}
            >
              {cheatSheetTitles?.title.map((item, index) => (
                <MenuItem key={index} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {cheatSheetData?.type === 'shortcut' ? (
            <Grid container spacing={1} p={1} width='100%'>
              {cheatSheetData?.commandlist.map((item: CommandData, index) => (
                <Grid key={index} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                  <ShortcutField
                    m={0.5}
                    description={item.description}
                    command={item.command}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Stack paddingY={1} spacing={1} width='100%'>
              {cheatSheetData?.commandlist.map((item: CommandData, index) => (
                <CommandField
                  key={index}
                  ref={(el) => {
                    commandFieldRefs.current[index] = el
                  }}
                  description={item.description}
                  command={item.command}
                  numberHint={index < 9 ? (index + 1).toString() : undefined}
                />
              ))}
            </Stack>
          )}
        </>
      )}
    </Stack>
  )
}
