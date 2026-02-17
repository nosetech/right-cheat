'use client'
import { useEffect, useRef, useState } from 'react'

import { Autocomplete, Grid, TextField, Typography } from '@mui/material'
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
  const [errorMessage, setErrorMessage] = useState<string>()

  const [reloading, setReloading] = useState<boolean>(false)
  const [autocompleteOpen, setAutocompleteOpen] = useState<boolean>(false)

  const theme = useTheme()
  const { getCheatSheetFilePath } = usePreferencesStore()

  // Refs for keyboard shortcuts
  const commandFieldRefs = useRef<Array<HTMLDivElement | null>>([])
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ;(async () => {
      await listen<{}>(Event.RELOAD_CHEAT_SHEET, () => {
        ;(async () => {
          const inputpath = await getCheatSheetFilePath()
          if (inputpath) {
            setReloading(true)
            setCheatSheet('')
            setErrorMessage(undefined)
            await invoke<string>(CheatSheetAPI.GET_CHEAT_TITLES, {
              inputPath: inputpath,
            }).then((response) => {
              debug(
                `invoke '${CheatSheetAPI.GET_CHEAT_TITLES}' response=${response}`,
              )
              const parsedResponse = JSON.parse(response)
              // エラーレスポンスの場合
              if (parsedResponse.success === false && parsedResponse.error) {
                setErrorMessage(parsedResponse.error)
                setCheatSheetTitles(undefined)
              } else {
                // 成功レスポンスの場合
                const titles: CheatSheetTitleData = parsedResponse
                setCheatSheetTitles(titles)
                setCheatSheet(titles.title.length > 0 ? titles.title[0] : '')
                setErrorMessage(undefined)
              }
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

      // 初期化時に CheatSheet タイトルを読み込む
      const inputpath = await getCheatSheetFilePath()
      if (inputpath) {
        setJsonInputPath(inputpath)
        await invoke<string>(CheatSheetAPI.GET_CHEAT_TITLES, {
          inputPath: inputpath,
        }).then((response) => {
          debug(
            `invoke '${CheatSheetAPI.GET_CHEAT_TITLES}' response=${response}`,
          )
          const parsedResponse = JSON.parse(response)
          // エラーレスポンスの場合
          if (parsedResponse.success === false && parsedResponse.error) {
            setErrorMessage(parsedResponse.error)
            setCheatSheetTitles(undefined)
          } else {
            // 成功レスポンスの場合
            const titles: CheatSheetTitleData = parsedResponse
            setCheatSheetTitles(titles)
            setCheatSheet(titles.title.length > 0 ? titles.title[0] : '')
            setErrorMessage(undefined)
          }
        })
      }
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
        const parsedResponse = JSON.parse(response)
        // エラーレスポンスの場合
        if (parsedResponse.success === false && parsedResponse.error) {
          setErrorMessage(parsedResponse.error)
          setCheatSheetData(undefined)
        } else {
          // 成功レスポンスの場合
          const data: CheatSheetData = parsedResponse
          setCheatSheetData(data)
          setErrorMessage(undefined)
        }
      })
    } else {
      setCheatSheetData(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectCheatSheet])

  const handleChange = (_event: unknown, value: string | null) => {
    setCheatSheet(value ?? '')
  }

  const handleTextFieldKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    // Escapeキーが押された場合、選択をクリア
    if (event.key === 'Escape') {
      event.preventDefault()
      debug('Escapeキー: チートシート選択をクリアしました')
      setCheatSheet('')
      setAutocompleteOpen(false)
      return
    }

    // リストが開いている状態でエンターキーが押された場合、最初の項目を選択
    if (event.key === 'Enter' && autocompleteOpen) {
      // Material-UIのAutocompleteはリストボックスをポップアップで描画するため、
      // document全体から探索する
      const listboxElement = document.querySelector('[role="listbox"]')

      // リストボックスが存在する場合、最初の項目を選択
      if (listboxElement) {
        // 表示されている最初のリスト項目を取得してクリック
        const firstOption = listboxElement.querySelector('li') as HTMLLIElement
        if (firstOption) {
          event.preventDefault()
          debug('Enterキー: 最初の候補を選択しました')
          // リスト項目をクリックして選択
          firstOption.click()
          setAutocompleteOpen(false)
        }
      }
    }
  }

  const handleListboxKeyDown = (
    event: React.KeyboardEvent<HTMLUListElement>,
  ) => {
    // Escapeキーが押された場合、入力テキストまたは選択をクリア（リストボックス内でのキー押下時）
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()

      // Autocomplete コンテナを探索
      const autocompleteContainer = event.currentTarget.closest(
        '.MuiAutocomplete-root',
      ) as HTMLElement

      if (autocompleteContainer) {
        const input = autocompleteContainer.querySelector(
          'input[type="text"]',
        ) as HTMLInputElement

        // 入力テキストがある場合は、まずテキストをクリア
        if (input && input.value) {
          debug('Escapeキー: 入力テキストをクリアしました（リストボックス内）')
          const clearButton = autocompleteContainer.querySelector(
            '[aria-label="Clear"]',
          ) as HTMLButtonElement
          if (clearButton) {
            clearButton.click()
          }
          return
        }
      }

      // 選択値がある場合は、選択をクリア
      if (selectCheatSheet) {
        debug(
          'Escapeキー: チートシート選択をクリアしました（リストボックス内）',
        )
        setCheatSheet('')
        setAutocompleteOpen(false)
      }
      return
    }

    // リストが開いている状態でエンターキーが押された場合、最初の項目を選択
    if (event.key === 'Enter' && autocompleteOpen) {
      // Material-UIのAutocompleteはリストボックスをポップアップで描画するため、
      // document全体から探索する
      const listboxElement = document.querySelector('[role="listbox"]')

      // リストボックスが存在し、その中にフォーカスがない場合、最初の項目を選択
      if (listboxElement) {
        const activeElement = document.activeElement
        const isInListbox = listboxElement.contains(activeElement as Node)

        if (!isInListbox) {
          // 表示されている最初のリスト項目を取得してクリック
          const firstOption = listboxElement.querySelector(
            'li',
          ) as HTMLLIElement
          if (firstOption) {
            event.preventDefault()
            // リスト項目をクリックして選択
            firstOption.click()
            setAutocompleteOpen(false)
          }
        }
      }
    }
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
      // Open the Autocomplete dropdown by focusing the input
      if (selectRef.current) {
        // Find the input element within Autocomplete
        const input = selectRef.current.querySelector(
          'input[type="text"]',
        ) as HTMLInputElement

        if (input) {
          input.focus()
          // ドロップダウンを開くために ArrowDown イベントをディスパッチ
          const arrowDownEvent = new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            bubbles: true,
            cancelable: true,
          })
          input.dispatchEvent(arrowDownEvent)
          debug('0 key: Focused Autocomplete input and opened dropdown')
        } else {
          debug('0 key: Could not find input element in Autocomplete')
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
      ) : errorMessage ? (
        <Typography
          variant='body1'
          color='error'
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {errorMessage}
          <br />
          <br />
          [メニュー] -
          [Preference]で指定されている入力ファイルの内容を見直してください。
        </Typography>
      ) : reloading == false && cheatSheetTitles == undefined ? (
        <Typography variant='body1' color='error'>
          正しい内容の入力ファイルが指定されていないようです。
          <br /> [メニュー] -
          [Preference]で指定されている入力ファイルの内容を見直してください。
        </Typography>
      ) : (
        <>
          <Autocomplete
            ref={selectRef}
            options={cheatSheetTitles?.title || []}
            value={selectCheatSheet}
            onChange={handleChange}
            open={autocompleteOpen}
            onOpen={() => setAutocompleteOpen(true)}
            onClose={() => setAutocompleteOpen(false)}
            slotProps={{
              listbox: {
                onKeyDown: handleListboxKeyDown,
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label='CheatSheet'
                size='small'
                onKeyDown={handleTextFieldKeyDown}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.base.main,
                    },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    opacity: 1,
                  },
                  '& .MuiInputLabel-root': {
                    '&.Mui-focused': {
                      color: theme.palette.base.main,
                    },
                  },
                }}
              />
            )}
            freeSolo={false}
            noOptionsText='チートシートが見つかりません'
            loadingText='読み込み中...'
            size='small'
          />
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
