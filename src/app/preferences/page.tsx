'use client'

import { useEffect, useState } from 'react'

import { ThemedSwitch, ThemeToggle } from '@/components/atoms'
import { ShortcutEditField } from '@/components/molecules/ShortcutEditField'
import { WindowTitleBar } from '@/components/molecules/WindowTitleBar'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import { useThemeStore } from '@/hooks/useThemeStore'
import { GlobalShortcutAPI, ShortcutDef } from '@/types/api/GlobalShortcut'
import { VisibleOnAllWorkspacesAPI } from '@/types/api/VisibleOnAllWorkspaces'
import { WindowAPI } from '@/types/api/Window'
import { Box, Divider, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { ask, message } from '@tauri-apps/plugin-dialog'
import { debug, error } from '@tauri-apps/plugin-log'
import { relaunch } from '@tauri-apps/plugin-process'

export default function Page() {
  const theme = useTheme()

  const [shortcutValidationError, setShortcutValidationError] =
    useState<boolean>(false)
  const [visibleOnAllWorkspaces, setVisibleOnAllWorkspaces] =
    useState<boolean>(true)

  const { getVisibleOnAllWorkspacesSettings } = usePreferencesStore()
  const {
    themeMode,
    setThemeMode: setStoredThemeMode,
    isLoading,
  } = useThemeStore()

  const [toggleVisibleShortcut, setToggleVisibleShortcut] =
    useState<ShortcutDef>()

  useEffect(() => {
    ;(async () => {
      const visibleOnAllWorkspacesValue =
        await getVisibleOnAllWorkspacesSettings()
      setVisibleOnAllWorkspaces(visibleOnAllWorkspacesValue)

      try {
        const response = await invoke<string>(
          GlobalShortcutAPI.GET_TOGGLE_VISIBLE_SHORTCUT_SETTINGS,
        )
        debug(
          `[preferences] invoke '${GlobalShortcutAPI.GET_TOGGLE_VISIBLE_SHORTCUT_SETTINGS}' response=${response}`,
        )
        const res_json = JSON.parse(response)
        if (res_json.status === 'success') {
          const shortcut: ShortcutDef = JSON.parse(response).message
          setToggleVisibleShortcut(shortcut)
        } else {
          error(
            `[preferences] Failed to get toggle visible shortcut settings: ${res_json.message}`,
          )
          await message('Failed to get global shortcut settings', {
            title: 'Preferences',
            kind: 'error',
          })
        }
      } catch (err) {
        error(
          `[preferences] Error getting toggle visible shortcut settings: ${err}`,
        )
        await message('Failed to get global shortcut settings', {
          title: 'Preferences',
          kind: 'error',
        })
      }
    })()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showRestartConfirmationDialog = async () => {
    if (process.env.NODE_ENV === 'production') {
      const shouldRestart = await ask(
        'A restart is required to apply the settings.\nDo you want to restart now?',
        {
          title: 'Restart Confirmation',
          kind: 'info',
          okLabel: 'Yes',
          cancelLabel: 'No',
        },
      )

      if (shouldRestart) {
        await relaunch()
      } else {
        debug('[preferences] User cancelled the restart.')
        await message(
          'Settings saved.\nThey will take effect on the next launch.',
          {
            title: 'Preferences',
            kind: 'info',
          },
        )
      }
    } else {
      debug('[preferences] Relaunch is not execute in development mode.')
    }
  }

  const shortcutEditCallback = (
    ctrlKey: boolean,
    optionKey: boolean,
    commandKey: boolean,
    hotKey: string,
  ) => {
    ;(async () => {
      let saved = false
      try {
        const response = await invoke<string>(
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
        debug(
          `[preferences] invoke '${GlobalShortcutAPI.SET_TOGGLE_VISIBLE_SHORTCUT_SETTINGS}' response=${response}`,
        )
        const res_json = JSON.parse(response)
        if (res_json.status === 'success') {
          saved = true
        } else {
          error(
            `[preferences] Failed to set toggle visible shortcut settings: ${res_json.message}`,
          )
          await message('Failed to save global shortcut settings', {
            title: 'Preferences',
            kind: 'error',
          })
        }
      } catch (err) {
        error(`[preferences] Error setting shortcut: ${err}`)
        await message('Failed to save global shortcut settings', {
          title: 'Preferences',
          kind: 'error',
        })
      }

      if (saved) {
        await showRestartConfirmationDialog()
      }
    })()
  }

  const handleThemeChange = async (newThemeMode: string) => {
    const mode = newThemeMode as 'light' | 'dark' | 'system'
    try {
      await setStoredThemeMode(mode)
    } catch {
      await message('Failed to save theme settings', {
        title: 'Preferences',
        kind: 'error',
      })
      return
    }

    try {
      const response = await invoke<string>(WindowAPI.NOTIFY_THEME_CHANGED)
      debug(
        `[preferences] invoke '${WindowAPI.NOTIFY_THEME_CHANGED}' response=${response}`,
      )
    } catch (err) {
      error(`[preferences] Error notifying theme change: ${err}`)
      await message('Failed to apply theme change', {
        title: 'Preferences',
        kind: 'error',
      })
    }
  }

  const handleVisibleOnAllWorkspacesChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newValue = event.target.checked
    setVisibleOnAllWorkspaces(newValue)
    ;(async () => {
      let saved = false
      try {
        await invoke(
          VisibleOnAllWorkspacesAPI.SET_VISIBLE_ON_ALL_WORKSPACES_SETTING,
          {
            settings: {
              enabled: newValue,
            },
          },
        )
        debug(
          `[preferences] invoke '${VisibleOnAllWorkspacesAPI.SET_VISIBLE_ON_ALL_WORKSPACES_SETTING}' succeeded`,
        )
        saved = true
      } catch (err) {
        error(`[preferences] Error setting visible on all workspaces: ${err}`)
        await message('Failed to save visible on all workspaces settings', {
          title: 'Preferences',
          kind: 'error',
        })
      }

      if (saved) {
        await showRestartConfirmationDialog()
      }
    })()
  }

  return (
    <>
      <Box
        data-tauri-drag-region
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: `${TITLEBAR_HEIGHT}px`,
          zIndex: 999,
        }}
      />
      <WindowTitleBar title='Preferences' />
      <Stack padding={1} spacing={1}>
        <Stack direction='row' spacing={1} alignItems='center'>
          <Typography variant='body1'>Global Shortcut</Typography>
          {shortcutValidationError && (
            <Typography variant='caption' color={theme.palette.alert.main}>
              Please check at least one of ^ ⌥ ⌘.
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
    </>
  )
}
