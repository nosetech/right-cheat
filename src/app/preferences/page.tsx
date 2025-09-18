'use client'

import { useEffect, useState } from 'react'

import { FileEditButton, FileOpenButton, ThemeToggle } from '@/components/atoms'
import { ShortcutEditField } from '@/components/molecules/ShortcutEditField'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import { useThemeStore } from '@/hooks/useThemeStore'
import { grey } from '@/theme/color'
import { CheatSheetAPI } from '@/types/api/CheatSheet'
import { GlobalShortcutAPI, ShortcutDef } from '@/types/api/GlobalShortcut'
import { WindowAPI } from '@/types/api/Window'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { Box, Divider, Stack, Tooltip, Typography } from '@mui/material'
import { invoke } from '@tauri-apps/api/core'
import { debug, error } from '@tauri-apps/plugin-log'
import { relaunch } from '@tauri-apps/plugin-process'
import { Command } from '@tauri-apps/plugin-shell'

export default function Page() {
  const [settedInputFilePath, setSettedInputFilePath] = useState<string>()

  const { getCheatSheetFilePath, setCheatSheetFilePath } = usePreferencesStore()
  const {
    themeMode,
    setThemeMode: setStoredThemeMode,
    isLoading,
  } = useThemeStore()

  const [toggleVisibleShortcut, setToggleVisibleShortcut] =
    useState<ShortcutDef>()

  useEffect(() => {
    ;(async () => {
      const inputpath = await getCheatSheetFilePath()
      setSettedInputFilePath(inputpath)
      await invoke<string>(
        GlobalShortcutAPI.GET_TOGGLE_VISIBLE_SHORTCUT_SETTINGS,
      )
        .then((response) => {
          debug(
            `invoke '${GlobalShortcutAPI.GET_TOGGLE_VISIBLE_SHORTCUT_SETTINGS}' response=${response}`,
          )
          const res_json = JSON.parse(response)
          if (res_json.status === 'success') {
            const shortcut: ShortcutDef = JSON.parse(response).message
            setToggleVisibleShortcut(shortcut)
          } else {
            error(
              `Failed to get toggle visible shortcut settings: ${res_json.message}`,
            )
          }
        })
        .catch((err) => {
          error(`Error getting toggle visible shortcut settings: ${err}`)
        })
    })()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fileOpenCallback = (filepath: string) => {
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

  const openFileByEditor = () => {
    if (settedInputFilePath) {
      ;(async () => {
        let result = await Command.create('exec-open', [
          '-t',
          settedInputFilePath,
        ]).execute()
        if (result.code != 0) {
          error(
            `Failed to open file: ${settedInputFilePath}, code: ${result.code}`,
          )
        }
      })()
    }
  }

  const shortcutEditCallback = (
    ctrlKey: boolean,
    optionKey: boolean,
    commandKey: boolean,
    hotKey: string,
  ) => {
    ;(async () => {
      await invoke<string>(
        GlobalShortcutAPI.SET_TOGGLE_VISIBLE_SHORTCUT_SETTINGS,
        {
          shortcut: {
            ctrl: ctrlKey,
            option: optionKey,
            command: commandKey,
            hotkey: hotKey,
          },
        },
      )
        .then((response) => {
          debug(
            `invoke '${GlobalShortcutAPI.SET_TOGGLE_VISIBLE_SHORTCUT_SETTINGS}' response=${response}`,
          )
          const res_json = JSON.parse(response)
          if (res_json.status !== 'success') {
            error(
              `Failed to set toggle visible shortcut settings: ${res_json.message}`,
            )
            return
          }
        })
        .catch((err) => error(`Error setting shortcut: ${err}`))

      // devモードでは正常にアプリの再起動が実行できいないため、ログ出力だけにする。
      if (process.env.NODE_ENV === 'production') {
        await relaunch()
      } else {
        debug('Relaunch is not execute in development mode.')
      }
    })()
  }

  const handleThemeChange = async (newThemeMode: string) => {
    const mode = newThemeMode as 'light' | 'dark' | 'system'
    await setStoredThemeMode(mode)

    // Notify all windows about theme change
    await invoke<string>(WindowAPI.NOTIFY_THEME_CHANGED)
      .then((response) => {
        debug(`invoke '${WindowAPI.NOTIFY_THEME_CHANGED}' response=${response}`)
      })
      .catch((err) => {
        error(`Error notifying theme change: ${err}`)
      })
  }

  return (
    <Stack padding={1} spacing={1}>
      <Typography variant='body1'>CheetSheet Json File</Typography>
      <Stack direction='row' padding={1} spacing={1}>
        <FileOpenButton callback={fileOpenCallback} size='small' />
        <Box
          padding={0.5}
          border={1}
          borderRadius={1}
          maxWidth='85%'
          width='fit-content'
        >
          <Typography
            noWrap={true}
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {settedInputFilePath}
          </Typography>
        </Box>
        <FileEditButton onClick={openFileByEditor} size='small' />
      </Stack>
      <Divider />
      <Stack direction='row' spacing={1}>
        <Typography variant='body1'>Global Shortcut</Typography>
        <Tooltip
          title='Restart the application to reflect the settings.'
          placement='right'
        >
          <ErrorOutlineIcon fontSize='small' sx={{ color: grey[300] }} />
        </Tooltip>
      </Stack>
      <Stack padding={1}>
        {toggleVisibleShortcut && (
          <ShortcutEditField
            shortcutName='Toggle Visible'
            shortcut={toggleVisibleShortcut}
            callback={shortcutEditCallback}
          />
        )}
      </Stack>
      <Divider />
      <Typography variant='body1'>Theme</Typography>
      <Stack padding={1}>
        <ThemeToggle
          themeMode={themeMode}
          onChange={handleThemeChange}
          disabled={isLoading}
        />
      </Stack>
    </Stack>
  )
}
