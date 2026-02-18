'use client'

import { useEffect, useState } from 'react'

import {
  FileEditButton,
  FileOpenButton,
  ThemedSwitch,
  ThemeToggle,
} from '@/components/atoms'
import { ShortcutEditField } from '@/components/molecules/ShortcutEditField'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import { useThemeStore } from '@/hooks/useThemeStore'
import { CheatSheetAPI } from '@/types/api/CheatSheet'
import { GlobalShortcutAPI, ShortcutDef } from '@/types/api/GlobalShortcut'
import { VisibleOnAllWorkspacesAPI } from '@/types/api/VisibleOnAllWorkspaces'
import { WindowAPI } from '@/types/api/Window'
import { Box, Divider, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { ask, message } from '@tauri-apps/plugin-dialog'
import { debug, error } from '@tauri-apps/plugin-log'
import { relaunch } from '@tauri-apps/plugin-process'
import { Command } from '@tauri-apps/plugin-shell'

export default function Page() {
  const theme = useTheme()

  const [settedInputFilePath, setSettedInputFilePath] = useState<string>()
  const [shortcutValidationError, setShortcutValidationError] =
    useState<boolean>(false)
  const [visibleOnAllWorkspaces, setVisibleOnAllWorkspaces] =
    useState<boolean>(true)

  const {
    getCheatSheetFilePath,
    setCheatSheetFilePath,
    getVisibleOnAllWorkspacesSettings,
    setVisibleOnAllWorkspacesSettings,
  } = usePreferencesStore()
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

      const visibleOnAllWorkspacesValue =
        await getVisibleOnAllWorkspacesSettings()
      setVisibleOnAllWorkspaces(visibleOnAllWorkspacesValue)

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

      // devモードでは正常にアプリの再起動が実行できないため、ログ出力だけにする。
      if (process.env.NODE_ENV === 'production') {
        // 再起動確認ダイアログを表示
        const shouldRestart = await ask(
          '設定を反映するには、アプリケーションの再起動が必要です。\n今すぐ再起動しますか?',
          {
            title: 'RightCheat - 再起動の確認',
            kind: 'info',
            okLabel: 'はい',
            cancelLabel: 'いいえ',
          },
        )

        if (shouldRestart) {
          await relaunch()
        } else {
          debug('User cancelled the restart.')
          // キャンセル時にユーザーに設定が保存されたことを通知
          await message(
            '設定は保存されました。\n次回アプリケーション起動時に反映されます。',
            {
              title: 'RightCheat',
              kind: 'info',
            },
          )
        }
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

  const handleVisibleOnAllWorkspacesChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newValue = event.target.checked
    setVisibleOnAllWorkspaces(newValue)
    ;(async () => {
      await invoke(
        VisibleOnAllWorkspacesAPI.SET_VISIBLE_ON_ALL_WORKSPACES_SETTING,
        {
          settings: {
            enabled: newValue,
          },
        },
      )
        .then(() => {
          debug(
            `invoke '${VisibleOnAllWorkspacesAPI.SET_VISIBLE_ON_ALL_WORKSPACES_SETTING}' succeeded`,
          )
        })
        .catch((err) => {
          error(`Error setting visible on all workspaces: ${err}`)
          return
        })

      // devモードでは正常にアプリの再起動が実行できないため、ログ出力だけにする。
      if (process.env.NODE_ENV === 'production') {
        // 再起動確認ダイアログを表示
        const shouldRestart = await ask(
          '設定を反映するには、アプリケーションの再起動が必要です。\n今すぐ再起動しますか?',
          {
            title: 'RightCheat - 再起動の確認',
            kind: 'info',
            okLabel: 'はい',
            cancelLabel: 'いいえ',
          },
        )

        if (shouldRestart) {
          await relaunch()
        } else {
          debug('User cancelled the restart.')
          // キャンセル時にユーザーに設定が保存されたことを通知
          await message(
            '設定は保存されました。\n次回アプリケーション起動時に反映されます。',
            {
              title: 'RightCheat',
              kind: 'info',
            },
          )
        }
      } else {
        debug('Relaunch is not execute in development mode.')
      }
    })()
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
      <Stack direction='row' spacing={1} alignItems='center'>
        <Typography variant='body1'>Global Shortcut</Typography>
        {shortcutValidationError && (
          <Typography variant='caption' color={theme.palette.alert.main}>
            ^ ⌥ ⌘ のいずれか1つはチェックしてください。
          </Typography>
        )}
      </Stack>
      <Stack padding={1}>
        {toggleVisibleShortcut && (
          <ShortcutEditField
            shortcutName='Toggle Visible'
            shortcut={toggleVisibleShortcut}
            callback={shortcutEditCallback}
            onValidationChange={setShortcutValidationError}
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
      <Divider />
      <Typography variant='body1'>Other Settings</Typography>
      <Stack direction='row' px={1} spacing={1} alignItems='center'>
        <Typography variant='body1'>Visible on all workspaces</Typography>
        <ThemedSwitch
          checked={visibleOnAllWorkspaces}
          onChange={handleVisibleOnAllWorkspacesChange}
        />
      </Stack>
    </Stack>
  )
}
