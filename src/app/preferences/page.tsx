'use client'

import { useEffect, useState } from 'react'

import { ThemedSwitch, ThemeToggle } from '@/components/atoms'
import { ShortcutEditField } from '@/components/molecules/ShortcutEditField'
import { WindowTitleBar } from '@/components/molecules/WindowTitleBar'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import { useThemeStore } from '@/hooks/useThemeStore'
import { GlobalShortcutAPI, ShortcutDef } from '@/types/api/GlobalShortcut'
import { LogSettings, LogSettingsAPI } from '@/types/api/LogSettings'
import { VisibleOnAllWorkspacesAPI } from '@/types/api/VisibleOnAllWorkspaces'
import { WindowAPI } from '@/types/api/Window'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import {
  Box,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { ask, message, open } from '@tauri-apps/plugin-dialog'
import { debug, error } from '@tauri-apps/plugin-log'
import { relaunch } from '@tauri-apps/plugin-process'

const DEFAULT_MAX_FILE_SIZE_BYTES = 1_048_576
const DEFAULT_ROTATION_COUNT = 3

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

  const [logSettings, setLogSettings] = useState<LogSettings>({
    output_dir: null,
    max_file_size: DEFAULT_MAX_FILE_SIZE_BYTES,
    rotation_count: DEFAULT_ROTATION_COUNT,
  })
  const [effectiveLogDir, setEffectiveLogDir] = useState<string>('')
  const [logMaxFileSizeMBInput, setLogMaxFileSizeMBInput] = useState<string>(
    String(DEFAULT_MAX_FILE_SIZE_BYTES / (1024 * 1024)),
  )
  const [logRotationCountInput, setLogRotationCountInput] = useState<string>(
    String(DEFAULT_ROTATION_COUNT),
  )

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

      try {
        const settings = await invoke<LogSettings>(
          LogSettingsAPI.GET_LOG_SETTINGS,
        )
        debug(
          `[preferences] invoke '${LogSettingsAPI.GET_LOG_SETTINGS}' response=${JSON.stringify(settings)}`,
        )
        setLogSettings(settings)
        setLogMaxFileSizeMBInput(
          String(Math.round(settings.max_file_size / (1024 * 1024))),
        )
        setLogRotationCountInput(String(settings.rotation_count))
      } catch (err) {
        error(`[preferences] Error getting log settings: ${err}`)
        await message('Failed to get log settings', {
          title: 'Preferences',
          kind: 'error',
        })
      }

      try {
        const logDir = await invoke<string>(LogSettingsAPI.GET_LOG_DIR)
        debug(
          `[preferences] invoke '${LogSettingsAPI.GET_LOG_DIR}' response=${logDir}`,
        )
        setEffectiveLogDir(logDir)
      } catch (err) {
        error(`[preferences] Error getting log dir: ${err}`)
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

  const saveLogSettings = async (newSettings: LogSettings) => {
    let saved = false
    try {
      await invoke(LogSettingsAPI.SET_LOG_SETTINGS, { settings: newSettings })
      debug(
        `[preferences] invoke '${LogSettingsAPI.SET_LOG_SETTINGS}' succeeded`,
      )
      setLogSettings(newSettings)
      const logDir = await invoke<string>(LogSettingsAPI.GET_LOG_DIR)
      setEffectiveLogDir(logDir)
      saved = true
    } catch (err) {
      error(`[preferences] Error setting log settings: ${err}`)
      await message('Failed to save log settings', {
        title: 'Preferences',
        kind: 'error',
      })
    }
    if (saved) {
      await showRestartConfirmationDialog()
    }
  }

  const handleLogDirPick = async () => {
    const dir = await open({ directory: true, multiple: false })
    if (typeof dir === 'string') {
      const newSettings: LogSettings = {
        ...logSettings,
        output_dir: dir,
      }
      await saveLogSettings(newSettings)
    }
  }

  const handleLogMaxFileSizeBlur = async () => {
    const mb = parseInt(logMaxFileSizeMBInput, 10)
    if (isNaN(mb) || mb < 1 || mb > 100) {
      setLogMaxFileSizeMBInput(
        String(Math.round(logSettings.max_file_size / (1024 * 1024))),
      )
      return
    }
    const newSettings: LogSettings = {
      ...logSettings,
      max_file_size: mb * 1024 * 1024,
    }
    await saveLogSettings(newSettings)
  }

  const handleLogRotationCountBlur = async () => {
    const count = parseInt(logRotationCountInput, 10)
    if (isNaN(count) || count < 1 || count > 20) {
      setLogRotationCountInput(String(logSettings.rotation_count))
      return
    }
    const newSettings: LogSettings = {
      ...logSettings,
      rotation_count: count,
    }
    await saveLogSettings(newSettings)
  }

  const handleOpenLatestLog = async () => {
    try {
      await invoke(LogSettingsAPI.OPEN_LATEST_LOG_FILE)
      debug(
        `[preferences] invoke '${LogSettingsAPI.OPEN_LATEST_LOG_FILE}' succeeded`,
      )
    } catch (err) {
      error(`[preferences] Error opening latest log file: ${err}`)
      await message('Failed to open log file', {
        title: 'Preferences',
        kind: 'error',
      })
    }
  }

  const isDark = theme.palette.mode === 'dark'

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
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            p: '12px 14px',
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.025)'
              : 'rgba(255,255,255,0.35)',
            border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)'}`,
            borderRadius: '10px',
            boxShadow: isDark ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        >
          {/* Visible on all workspaces */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RowDot />
              <Typography variant='body2'>Visible on all workspaces</Typography>
            </Box>
            <ThemedSwitch
              checked={visibleOnAllWorkspaces}
              onChange={handleVisibleOnAllWorkspacesChange}
            />
          </Box>

          <Divider sx={{ height: '0.5px' }} />

          {/* Log section */}
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                mb: '8px',
              }}
            >
              <RowDot />
              <Typography variant='body2'>Log</Typography>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 140px 110px',
                gap: '10px',
                pl: 2,
              }}
            >
              {/* Output Directory */}
              <Box>
                <Typography
                  variant='caption'
                  sx={{ display: 'block', mb: '6px', fontWeight: 500 }}
                >
                  Output Directory
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Tooltip title='Choose directory'>
                    <IconButton
                      size='small'
                      onClick={handleLogDirPick}
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '7px',
                        flexShrink: 0,
                        border: `0.5px solid ${theme.palette.divider}`,
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.055)'
                          : theme.palette.background.paper,
                        '&:hover': {
                          borderColor: theme.palette.primary.main,
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.08)'
                            : theme.palette.background.paper,
                        },
                      }}
                    >
                      <FolderOutlinedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Box
                    title={effectiveLogDir}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.055)'
                        : 'rgba(255,255,255,0.7)',
                      border: `0.5px solid ${theme.palette.divider}`,
                      borderRadius: '7px',
                      px: '9px',
                      py: '5px',
                    }}
                  >
                    <Typography
                      variant='caption'
                      sx={{
                        fontFamily: 'monospace',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        direction: 'rtl',
                        textAlign: 'left',
                      }}
                    >
                      {effectiveLogDir}
                    </Typography>
                  </Box>
                  <Tooltip title='Open latest log file'>
                    <IconButton
                      size='small'
                      onClick={handleOpenLatestLog}
                      sx={{
                        flexShrink: 0,
                        color: theme.palette.text.secondary,
                        '&:hover': { color: theme.palette.text.primary },
                      }}
                    >
                      <ArticleOutlinedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Max File Size */}
              <Box>
                <Typography
                  variant='caption'
                  sx={{ display: 'block', mb: '6px', fontWeight: 500 }}
                >
                  Max File Size
                </Typography>
                <TextField
                  size='small'
                  type='number'
                  value={logMaxFileSizeMBInput}
                  onChange={(e) => setLogMaxFileSizeMBInput(e.target.value)}
                  onBlur={handleLogMaxFileSizeBlur}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <Typography variant='caption' color='text.secondary'>
                            MB
                          </Typography>
                        </InputAdornment>
                      ),
                    },
                    htmlInput: { min: 1, max: 100 },
                  }}
                  sx={{
                    width: '100%',
                    '& .MuiInputBase-root': {
                      fontFamily: 'monospace',
                      fontSize: '12px',
                    },
                  }}
                />
              </Box>

              {/* Rotation Count */}
              <Box>
                <Typography
                  variant='caption'
                  sx={{ display: 'block', mb: '6px', fontWeight: 500 }}
                >
                  Rotation Count
                </Typography>
                <TextField
                  size='small'
                  type='number'
                  value={logRotationCountInput}
                  onChange={(e) => setLogRotationCountInput(e.target.value)}
                  onBlur={handleLogRotationCountBlur}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <Typography variant='caption' color='text.secondary'>
                            files
                          </Typography>
                        </InputAdornment>
                      ),
                    },
                    htmlInput: { min: 1, max: 20 },
                  }}
                  sx={{
                    width: '100%',
                    '& .MuiInputBase-root': {
                      fontFamily: 'monospace',
                      fontSize: '12px',
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Stack>
    </>
  )
}

function RowDot() {
  const theme = useTheme()
  return (
    <Box
      sx={{
        width: 4,
        height: 4,
        borderRadius: '50%',
        backgroundColor: theme.palette.primary.main,
        opacity: 0.7,
        flexShrink: 0,
      }}
    />
  )
}
