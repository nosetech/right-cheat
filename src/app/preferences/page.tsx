'use client'

import { useEffect, useState } from 'react'

import { ThemedSwitch, ThemeToggle } from '@/components/atoms'
import { WindowTitleBar } from '@/components/molecules/WindowTitleBar'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import { useThemeStore } from '@/hooks/useThemeStore'
import { DbSettings, DbSettingsAPI } from '@/types/api/DbSettings'
import { GlobalShortcutAPI, ShortcutDef } from '@/types/api/GlobalShortcut'
import { LogSettings, LogSettingsAPI } from '@/types/api/LogSettings'
import { VisibleOnAllWorkspacesAPI } from '@/types/api/VisibleOnAllWorkspaces'
import { WindowAPI } from '@/types/api/Window'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { ask, message, open as openOsDialog } from '@tauri-apps/plugin-dialog'
import { debug, error } from '@tauri-apps/plugin-log'
import { relaunch } from '@tauri-apps/plugin-process'

// Fallback values matching backend defaults (log_settings.rs).
// Overwritten immediately by GET_LOG_SETTINGS on mount.
const DEFAULT_MAX_FILE_SIZE_BYTES = 1_048_576
const DEFAULT_ROTATION_COUNT = 3

export default function Page() {
  const theme = useTheme()

  const [shortcutDialogOpen, setShortcutDialogOpen] = useState<boolean>(false)
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
  const [logDialogOpen, setLogDialogOpen] = useState<boolean>(false)

  const [dbSettings, setDbSettings] = useState<DbSettings>({
    output_path: null,
  })
  const [effectiveDbPath, setEffectiveDbPath] = useState<string>('')

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
          const shortcut: ShortcutDef = res_json.message
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
        const [settings, logDir] = await Promise.all([
          invoke<LogSettings>(LogSettingsAPI.GET_LOG_SETTINGS),
          invoke<string>(LogSettingsAPI.GET_LOG_DIR),
        ])
        debug(
          `[preferences] invoke '${LogSettingsAPI.GET_LOG_SETTINGS}' response=${JSON.stringify(settings)}`,
        )
        debug(
          `[preferences] invoke '${LogSettingsAPI.GET_LOG_DIR}' response=${logDir}`,
        )
        setLogSettings(settings)
        setEffectiveLogDir(logDir)
      } catch (err) {
        error(`[preferences] Error getting log settings: ${err}`)
        await message('Failed to get log settings', {
          title: 'Preferences',
          kind: 'error',
        })
      }

      try {
        const [dbSettingsResult, dbPath] = await Promise.all([
          invoke<DbSettings>(DbSettingsAPI.GET_DB_SETTINGS),
          invoke<string>(DbSettingsAPI.GET_DB_PATH),
        ])
        debug(
          `[preferences] invoke '${DbSettingsAPI.GET_DB_SETTINGS}' response=${JSON.stringify(dbSettingsResult)}`,
        )
        debug(
          `[preferences] invoke '${DbSettingsAPI.GET_DB_PATH}' response=${dbPath}`,
        )
        setDbSettings(dbSettingsResult)
        setEffectiveDbPath(dbPath)
      } catch (err) {
        error(`[preferences] Error getting DB settings: ${err}`)
        await message('Failed to get DB settings', {
          title: 'Preferences',
          kind: 'error',
        })
      }
    })()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showRestartConfirmationDialog = async () => {
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
      if (process.env.NODE_ENV === 'production') {
        await relaunch()
      } else {
        debug('[preferences] Relaunch skipped in development mode.')
      }
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
  }

  const handleShortcutSave = async (shortcut: ShortcutDef) => {
    setShortcutDialogOpen(false)
    let saved = false
    try {
      const response = await invoke<string>(
        GlobalShortcutAPI.SET_TOGGLE_VISIBLE_SHORTCUT_SETTINGS,
        { shortcut },
      )
      debug(
        `[preferences] invoke '${GlobalShortcutAPI.SET_TOGGLE_VISIBLE_SHORTCUT_SETTINGS}' response=${response}`,
      )
      const res_json = JSON.parse(response)
      if (res_json.status === 'success') {
        setToggleVisibleShortcut(shortcut)
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

  const handleLogSettingsSave = (
    newSettings: LogSettings,
    newEffectiveDir: string,
  ) => {
    setLogDialogOpen(false)
    ;(async () => {
      let saved = false
      try {
        await invoke(LogSettingsAPI.SET_LOG_SETTINGS, { settings: newSettings })
        debug(
          `[preferences] invoke '${LogSettingsAPI.SET_LOG_SETTINGS}' succeeded`,
        )
        setLogSettings(newSettings)
        setEffectiveLogDir(newEffectiveDir)
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
    })()
  }

  const handleDbFilePick = async () => {
    const picked = await invoke<string | null>(DbSettingsAPI.PICK_DB_FILE_PATH)
    if (picked === null) return

    const newSettings: DbSettings = { output_path: picked }
    let saved = false
    try {
      await invoke(DbSettingsAPI.SET_DB_SETTINGS, { settings: newSettings })
      debug(`[preferences] invoke '${DbSettingsAPI.SET_DB_SETTINGS}' succeeded`)
      setDbSettings(newSettings)
      setEffectiveDbPath(picked)
      saved = true
    } catch (err) {
      error(`[preferences] Error setting DB settings: ${err}`)
      await message(`Failed to save DB settings.\n${err}`, {
        title: 'Preferences',
        kind: 'error',
      })
    }
    if (saved) {
      const shouldRestart = await ask(
        'The existing DB file will not be moved automatically.\nPlease copy it to the new location manually before restarting.\n\nDo you want to restart now?',
        {
          title: 'Restart Confirmation',
          kind: 'info',
          okLabel: 'Yes',
          cancelLabel: 'No',
        },
      )
      if (shouldRestart) {
        if (process.env.NODE_ENV === 'production') {
          await relaunch()
        } else {
          debug('[preferences] Relaunch skipped in development mode.')
        }
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
    }
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
      <Box
        sx={{ p: '4px 20px 16px', display: 'flex', flexDirection: 'column' }}
      >
        {/* Global Shortcut */}
        <Box sx={{ py: '20px' }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.01em',
              mb: '10px',
              color: 'text.primary',
            }}
          >
            Global Shortcut
          </Typography>
          <Box sx={{ pl: '14px', py: '8px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Typography
                sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}
              >
                Toggle Visible
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                :
              </Typography>
              {toggleVisibleShortcut && (
                <Box
                  sx={{
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(12px)',
                    border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                    borderRadius: '6px',
                    padding: '4px 11px',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: 'text.primary',
                    boxShadow: !isDark
                      ? 'inset 0 1px 0 rgba(255,255,255,0.8)'
                      : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {(
                    [
                      toggleVisibleShortcut.ctrl && '^',
                      toggleVisibleShortcut.option && '⌥',
                      toggleVisibleShortcut.command && '⌘',
                      toggleVisibleShortcut.hotkey,
                    ] as (string | false)[]
                  )
                    .filter(Boolean)
                    .map((c, i) => (
                      <span key={i}>{c}</span>
                    ))}
                </Box>
              )}
              <Tooltip title='Edit global shortcut…'>
                <span>
                  <IconButton
                    size='small'
                    disabled={!toggleVisibleShortcut}
                    onClick={() => setShortcutDialogOpen(true)}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '7px',
                      border: `0.5px solid ${isDark ? 'rgba(100,180,255,0.18)' : 'rgba(0,113,227,0.14)'}`,
                      backgroundColor: isDark
                        ? 'rgba(100,180,255,0.10)'
                        : 'rgba(0,113,227,0.07)',
                      color: isDark
                        ? 'rgba(255,255,255,0.25)'
                        : 'rgba(0,0,0,0.28)',
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main,
                      },
                    }}
                  >
                    <SettingsOutlinedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mx: '-20px', borderBottomWidth: '0.5px' }} />

        {/* Theme */}
        <Box sx={{ py: '20px' }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.01em',
              mb: '10px',
              color: 'text.primary',
            }}
          >
            Theme
          </Typography>
          <Box sx={{ pl: '14px', py: '8px' }}>
            <ThemeToggle
              themeMode={themeMode}
              onChange={handleThemeChange}
              disabled={isLoading}
            />
          </Box>
        </Box>

        <Divider sx={{ mx: '-20px', borderBottomWidth: '0.5px' }} />

        {/* Other Settings */}
        <Box sx={{ py: '20px' }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.01em',
              mb: '10px',
              color: 'text.primary',
            }}
          >
            Other Settings
          </Typography>
          <Box sx={{ pl: '14px', py: '8px' }}>
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
                boxShadow: isDark
                  ? 'none'
                  : 'inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              {/* Visible on all workspaces */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: '8px',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RowDot />
                  <Typography sx={{ fontSize: 13, color: 'text.primary' }}>
                    Visible on all workspaces
                  </Typography>
                </Box>
                <ThemedSwitch
                  checked={visibleOnAllWorkspaces}
                  onChange={handleVisibleOnAllWorkspacesChange}
                />
              </Box>

              <Divider sx={{ borderBottomWidth: '0.5px' }} />

              {/* CheatSheet DB section */}
              <Box sx={{ py: '8px' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    mb: '8px',
                  }}
                >
                  <RowDot />
                  <Typography sx={{ fontSize: 13, color: 'text.primary' }}>
                    CheatSheet DB
                  </Typography>
                  <Chip
                    label='Restart Required'
                    size='small'
                    sx={{
                      height: 'auto',
                      py: '2px',
                      fontSize: '9.5px',
                      fontFamily: 'monospace',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      borderRadius: '4px',
                      backgroundColor: isDark
                        ? 'rgba(255,180,80,0.10)'
                        : 'rgba(180,120,0,0.07)',
                      border: `0.5px solid ${isDark ? 'rgba(255,180,80,0.28)' : 'rgba(180,120,0,0.22)'}`,
                      color: isDark ? '#f5c46b' : '#8a6300',
                      '& .MuiChip-label': { px: '6px' },
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    pl: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Tooltip title='Choose DB file'>
                    <IconButton
                      size='small'
                      onClick={handleDbFilePick}
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '7px',
                        flexShrink: 0,
                        border: `0.5px solid ${isDark ? 'rgba(100,180,255,0.18)' : 'rgba(0,113,227,0.14)'}`,
                        backgroundColor: isDark
                          ? 'rgba(100,180,255,0.10)'
                          : 'rgba(0,113,227,0.07)',
                        color: isDark
                          ? 'rgba(255,255,255,0.25)'
                          : 'rgba(0,0,0,0.28)',
                        '&:hover': {
                          borderColor: theme.palette.primary.main,
                          color: theme.palette.primary.main,
                        },
                      }}
                    >
                      <InsertDriveFileOutlinedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Box
                    title={effectiveDbPath}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.055)'
                        : 'rgba(255,255,255,0.55)',
                      border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)'}`,
                      borderRadius: '7px',
                      px: '10px',
                      py: '5px',
                      boxShadow: isDark
                        ? 'none'
                        : 'inset 0 1px 0 rgba(255,255,255,0.8)',
                    }}
                  >
                    <Typography
                      component='span'
                      dir='ltr'
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        // direction:rtl makes long paths truncate from the left,
                        // showing the filename at the right end. U+200E (LTR mark)
                        // prevents the leading '/' of absolute paths from being
                        // reclassified as RTL by the Unicode Bidi Algorithm, which
                        // would otherwise make it appear as a visual trailing slash.
                        direction: 'rtl',
                        color: 'text.primary',
                      }}
                    >
                      {'‎' + effectiveDbPath}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ borderBottomWidth: '0.5px' }} />

              {/* Log section */}
              <Box sx={{ py: '8px' }}>
                {/* Header row */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    mb: '6px',
                  }}
                >
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <RowDot />
                    <Typography sx={{ fontSize: 13, color: 'text.primary' }}>
                      Log
                    </Typography>
                    <Chip
                      label='Restart Required'
                      size='small'
                      sx={{
                        height: 'auto',
                        py: '2px',
                        fontSize: '9.5px',
                        fontFamily: 'monospace',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        borderRadius: '4px',
                        backgroundColor: isDark
                          ? 'rgba(255,180,80,0.10)'
                          : 'rgba(180,120,0,0.07)',
                        border: `0.5px solid ${isDark ? 'rgba(255,180,80,0.28)' : 'rgba(180,120,0,0.22)'}`,
                        color: isDark ? '#f5c46b' : '#8a6300',
                        '& .MuiChip-label': { px: '6px' },
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: '4px' }}>
                    <Tooltip title='Open latest log file'>
                      <IconButton
                        size='small'
                        onClick={handleOpenLatestLog}
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '7px',
                          border: `0.5px solid ${isDark ? 'rgba(100,180,255,0.18)' : 'rgba(0,113,227,0.14)'}`,
                          backgroundColor: isDark
                            ? 'rgba(100,180,255,0.10)'
                            : 'rgba(0,113,227,0.07)',
                          color: isDark
                            ? 'rgba(255,255,255,0.25)'
                            : 'rgba(0,0,0,0.28)',
                          '&:hover': {
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                          },
                        }}
                      >
                        <ArticleOutlinedIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Edit log settings'>
                      <IconButton
                        size='small'
                        onClick={() => setLogDialogOpen(true)}
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '7px',
                          border: `0.5px solid ${isDark ? 'rgba(100,180,255,0.18)' : 'rgba(0,113,227,0.14)'}`,
                          backgroundColor: isDark
                            ? 'rgba(100,180,255,0.10)'
                            : 'rgba(0,113,227,0.07)',
                          color: isDark
                            ? 'rgba(255,255,255,0.25)'
                            : 'rgba(0,0,0,0.28)',
                          '&:hover': {
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                          },
                        }}
                      >
                        <EditOutlinedIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Summary rows */}
                <Box
                  sx={{
                    pl: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <LogSummaryRow
                    label='Output Directory'
                    value={effectiveLogDir}
                  />
                  <LogSummaryRow
                    label='Max File Size'
                    // Rounding is safe because validation enforces integer-MB values.
                    value={`${Math.round(logSettings.max_file_size / (1024 * 1024))} MB`}
                  />
                  <LogSummaryRow
                    label='Rotation Count'
                    value={`${logSettings.rotation_count} files`}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <LogSettingsDialog
        open={logDialogOpen}
        settings={logSettings}
        effectiveDir={effectiveLogDir}
        onSave={handleLogSettingsSave}
        onCancel={() => setLogDialogOpen(false)}
      />
      {toggleVisibleShortcut && (
        <ShortcutSettingsDialog
          open={shortcutDialogOpen}
          shortcut={toggleVisibleShortcut}
          onSave={handleShortcutSave}
          onCancel={() => setShortcutDialogOpen(false)}
        />
      )}
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────

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

function dialogPaperSx(isDark: boolean) {
  return {
    borderRadius: '14px',
    border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)'}`,
    boxShadow: isDark
      ? '0 24px 64px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(255,255,255,0.10)'
      : '0 24px 64px rgba(0,0,50,0.30), 0 0 0 0.5px rgba(255,255,255,0.7)',
  }
}

function LogSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}
    >
      <Typography
        sx={{
          fontSize: 11,
          flexShrink: 0,
          width: 110,
          fontWeight: 500,
          color: 'text.secondary',
        }}
      >
        {label}
      </Typography>
      <Typography
        title={value}
        sx={{
          fontSize: 11,
          fontFamily: 'monospace',
          color: 'text.primary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
          flex: 1,
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

type NumberInputFieldProps = {
  label: string
  suffix: string
  value: string
  onChange: (value: string) => void
  error?: boolean
  hint?: string
}

function NumberInputField({
  label,
  suffix,
  value,
  onChange,
  error,
  hint,
}: NumberInputFieldProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [focused, setFocused] = useState(false)

  const borderColor = focused
    ? theme.palette.primary.main
    : error
      ? theme.palette.error.main
      : isDark
        ? 'rgba(255,255,255,0.10)'
        : 'rgba(255,255,255,0.75)'

  return (
    <Box>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 500,
          mb: '6px',
          color: 'text.secondary',
          display: 'block',
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: isDark
            ? 'rgba(255,255,255,0.055)'
            : 'rgba(255,255,255,0.55)',
          border: `0.5px solid ${borderColor}`,
          borderRadius: '7px',
          padding: '4px 8px',
          boxShadow: isDark ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
      >
        <Box
          component='input'
          type='number'
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          sx={{
            flex: 1,
            minWidth: 0,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontFamily: 'monospace',
            fontSize: 12,
            color: 'text.primary',
            caretColor: theme.palette.primary.main,
            padding: '2px 0',
            MozAppearance: 'textfield',
            '&::-webkit-inner-spin-button': { display: 'none' },
            '&::-webkit-outer-spin-button': { display: 'none' },
          }}
        />
        <Typography
          component='span'
          sx={{
            fontFamily: 'monospace',
            fontSize: 10,
            color: 'text.disabled',
            ml: '6px',
            flexShrink: 0,
            letterSpacing: '0.04em',
          }}
        >
          {suffix}
        </Typography>
      </Box>
      {hint && (
        <Typography
          sx={{
            fontSize: 10.5,
            color: 'error.main',
            mt: '4px',
            lineHeight: 1.4,
          }}
        >
          {hint}
        </Typography>
      )}
    </Box>
  )
}

// ─── Keycap ───────────────────────────────────────────────────

type KeycapProps = {
  children: React.ReactNode
  big?: boolean
  active?: boolean
}

function Keycap({ children, big = false, active = true }: KeycapProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  return (
    <Box
      sx={{
        flexShrink: 0,
        minWidth: big ? 38 : 26,
        padding: big ? '7px 11px' : '3px 8px',
        borderRadius: '6px',
        backgroundColor: active
          ? isDark
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.92)'
          : isDark
            ? 'rgba(255,255,255,0.02)'
            : 'rgba(255,255,255,0.4)',
        border: `0.5px solid ${
          active
            ? isDark
              ? 'rgba(255,255,255,0.18)'
              : 'rgba(0,0,0,0.14)'
            : isDark
              ? 'rgba(255,255,255,0.07)'
              : 'rgba(0,0,0,0.06)'
        }`,
        boxShadow: active
          ? isDark
            ? '0 1px 0 rgba(0,0,0,0.4), inset 0 0.5px 0 rgba(255,255,255,0.08)'
            : '0 1px 0 rgba(0,0,30,0.08), inset 0 0.5px 0 rgba(255,255,255,0.9)'
          : 'none',
        fontFamily: 'monospace',
        fontSize: big ? 15 : 12,
        fontWeight: 600,
        color: active ? 'text.primary' : 'text.secondary',
        textAlign: 'center',
        lineHeight: 1.3,
        userSelect: 'none',
        transition: 'all 0.14s',
      }}
    >
      {children}
    </Box>
  )
}

// ─── ShortcutCheckbox ─────────────────────────────────────────

type ShortcutCheckboxProps = {
  checked: boolean
  onToggle: () => void
  symbol: string
  label: string
}

function ShortcutCheckbox({
  checked,
  onToggle,
  symbol,
  label,
}: ShortcutCheckboxProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [hovered, setHovered] = useState(false)

  return (
    <Box
      role='checkbox'
      aria-checked={checked}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onToggle()
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        p: '7px 10px',
        borderRadius: '8px',
        outline: 'none',
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: '2px',
        },
        backgroundColor: checked
          ? isDark
            ? 'rgba(100,180,255,0.10)'
            : 'rgba(0,113,227,0.06)'
          : hovered
            ? isDark
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.55)'
            : 'transparent',
        border: `0.5px solid ${
          checked
            ? isDark
              ? 'rgba(100,180,255,0.30)'
              : 'rgba(0,113,227,0.22)'
            : hovered
              ? theme.palette.divider
              : 'transparent'
        }`,
        transition: 'all 0.14s',
        userSelect: 'none',
      }}
    >
      <Box
        sx={{
          width: 18,
          height: 18,
          borderRadius: '5px',
          flexShrink: 0,
          backgroundColor: checked
            ? theme.palette.primary.main
            : isDark
              ? 'rgba(0,0,0,0.25)'
              : 'rgba(255,255,255,0.9)',
          border: `0.5px solid ${checked ? theme.palette.primary.main : theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow:
            !isDark && !checked ? 'inset 0 1px 2px rgba(0,0,0,0.05)' : 'none',
          transition: 'all 0.14s',
        }}
      >
        {checked && (
          <svg
            width='11'
            height='11'
            viewBox='0 0 24 24'
            fill='none'
            stroke='#fff'
            strokeWidth='3'
          >
            <polyline points='20 6 9 17 4 12' />
          </svg>
        )}
      </Box>
      <Keycap active={checked}>{symbol}</Keycap>
      <Typography
        sx={{
          fontSize: 13,
          color: checked ? 'text.primary' : 'text.secondary',
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}

// ─── HotkeyInput ──────────────────────────────────────────────

type HotkeyInputProps = {
  value: string
  onChange: (v: string) => void
  invalid: boolean
}

function HotkeyInput({ value, onChange, invalid }: HotkeyInputProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [focused, setFocused] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '') {
      onChange('')
      return
    }
    const ch = raw.slice(-1)
    if (/^[a-zA-Z0-9]$/.test(ch)) onChange(ch)
  }

  return (
    <Box
      component='input'
      value={value}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder='–'
      maxLength={1}
      spellCheck={false}
      autoComplete='off'
      sx={{
        width: 64,
        textAlign: 'center',
        backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.9)',
        border: `0.5px solid ${invalid ? theme.palette.error.main : focused ? theme.palette.primary.main : theme.palette.divider}`,
        borderRadius: '7px',
        padding: '7px 8px',
        fontFamily: 'monospace',
        fontSize: 16,
        fontWeight: 600,
        color: 'text.primary',
        caretColor: theme.palette.primary.main,
        outline: 'none',
        boxShadow: focused
          ? `0 0 0 3px ${isDark ? 'rgba(100,180,255,0.13)' : 'rgba(0,113,227,0.10)'}`
          : !isDark
            ? 'inset 0 1px 2px rgba(0,0,0,0.04)'
            : 'none',
        transition: 'border-color 0.14s, box-shadow 0.14s',
      }}
    />
  )
}

// ─── ShortcutSettingsDialog ───────────────────────────────────

type ShortcutSettingsDialogProps = {
  open: boolean
  shortcut: ShortcutDef
  onSave: (shortcut: ShortcutDef) => void
  onCancel: () => void
}

function ShortcutSettingsDialog({
  open: dialogOpen,
  shortcut,
  onSave,
  onCancel,
}: ShortcutSettingsDialogProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [ctrl, setCtrl] = useState(shortcut.ctrl)
  const [option, setOption] = useState(shortcut.option)
  const [command, setCommand] = useState(shortcut.command)
  const [hotkey, setHotkey] = useState(shortcut.hotkey)
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    if (dialogOpen) {
      setCtrl(shortcut.ctrl)
      setOption(shortcut.option)
      setCommand(shortcut.command)
      setHotkey(shortcut.hotkey)
      setShowError(false)
    }
    // Reset only when dialog opens; omitting shortcut from deps is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen])

  const hasModifier = ctrl || option || command
  const hasHotkey = hotkey.trim().length > 0
  const dirty =
    ctrl !== shortcut.ctrl ||
    option !== shortcut.option ||
    command !== shortcut.command ||
    hotkey !== shortcut.hotkey
  const canSave = hasModifier && hasHotkey && dirty

  const handleSave = () => {
    if (!canSave) {
      setShowError(true)
      return
    }
    onSave({ ctrl, option, command, hotkey })
  }

  const previewCaps: string[] = []
  if (ctrl) previewCaps.push('^')
  if (option) previewCaps.push('⌥')
  if (command) previewCaps.push('⌘')
  if (hasHotkey) previewCaps.push(hotkey)

  return (
    <Dialog
      open={dialogOpen}
      onClose={onCancel}
      maxWidth='xs'
      fullWidth
      slotProps={{ paper: { sx: dialogPaperSx(isDark) } }}
    >
      <DialogTitle
        sx={{
          padding: '14px 18px 12px',
          fontSize: 14,
          fontWeight: 600,
          borderBottom: `0.5px solid ${theme.palette.divider}`,
        }}
      >
        Global Shortcut — Toggle Visible
      </DialogTitle>
      <DialogContent
        sx={{
          padding: '16px 18px 4px !important',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Restart-required notice */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '9px',
            p: '9px 11px',
            backgroundColor: isDark
              ? 'rgba(255,180,80,0.08)'
              : 'rgba(180,120,0,0.06)',
            border: `0.5px solid ${isDark ? 'rgba(255,180,80,0.30)' : 'rgba(180,120,0,0.22)'}`,
            borderRadius: '8px',
          }}
        >
          <InfoOutlinedIcon
            sx={{
              fontSize: 14,
              mt: '1px',
              flexShrink: 0,
              color: isDark ? '#f5c46b' : '#a87a00',
            }}
          />
          <Typography
            sx={{
              lineHeight: 1.5,
              color: isDark ? '#f5c46b' : '#8a6300',
              fontSize: '11.5px',
            }}
          >
            Changing the global shortcut takes effect after restarting
            RightCheat.
          </Typography>
        </Box>

        {/* Live preview */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            p: '16px 12px',
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.025)'
              : 'rgba(255,255,255,0.35)',
            border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)'}`,
            borderRadius: '10px',
            boxShadow: !isDark ? 'inset 0 1px 0 rgba(255,255,255,0.5)' : 'none',
          }}
        >
          <Typography
            sx={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            Preview
          </Typography>
          {previewCaps.length > 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {previewCaps.map((c, i) => (
                <Keycap key={i} big active>
                  {c}
                </Keycap>
              ))}
            </Box>
          ) : (
            <Typography
              sx={{ fontSize: 13, color: 'text.secondary', p: '7px 0' }}
            >
              Not set
            </Typography>
          )}
        </Box>

        {/* Modifiers */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.01em',
              color: 'text.secondary',
              display: 'block',
            }}
          >
            Modifiers
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              p: '4px',
              backgroundColor: isDark
                ? 'rgba(0,0,0,0.15)'
                : 'rgba(255,255,255,0.45)',
              border: `0.5px solid ${theme.palette.divider}`,
              borderRadius: '9px',
            }}
          >
            <ShortcutCheckbox
              checked={ctrl}
              onToggle={() => {
                setCtrl((v) => !v)
                setShowError(false)
              }}
              symbol='^'
              label='Control'
            />
            <ShortcutCheckbox
              checked={option}
              onToggle={() => {
                setOption((v) => !v)
                setShowError(false)
              }}
              symbol='⌥'
              label='Option'
            />
            <ShortcutCheckbox
              checked={command}
              onToggle={() => {
                setCommand((v) => !v)
                setShowError(false)
              }}
              symbol='⌘'
              label='Command'
            />
          </Box>
          {showError && !hasModifier && (
            <Typography
              sx={{
                fontSize: 10.5,
                color: theme.palette.error.main,
                mt: '2px',
              }}
            >
              Please check at least one of ^ ⌥ ⌘.
            </Typography>
          )}
        </Box>

        {/* Hotkey */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.01em',
              color: 'text.secondary',
              display: 'block',
            }}
          >
            Hotkey
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HotkeyInput
              value={hotkey}
              onChange={(v) => {
                setHotkey(v)
                setShowError(false)
              }}
              invalid={showError && !hasHotkey}
            />
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
              Type a key to set it
            </Typography>
          </Box>
          <Typography
            sx={{ fontSize: 10.5, color: 'text.disabled', lineHeight: 1.4 }}
          >
            A single character — letters (A–Z, a–z) or digits (0–9) only.
          </Typography>
          {showError && !hasHotkey && (
            <Typography
              sx={{
                fontSize: 10.5,
                color: theme.palette.error.main,
                mt: '2px',
              }}
            >
              Please enter a hotkey character.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          padding: '12px 16px 14px',
          backgroundColor: isDark
            ? 'rgba(255,255,255,0.018)'
            : 'rgba(255,255,255,0.30)',
          borderTop: `0.5px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={onCancel}
          sx={{
            borderRadius: '7px',
            padding: '5px 16px',
            fontSize: 12,
            fontWeight: 600,
            minWidth: 78,
            textTransform: 'none',
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.75)',
            border: `0.5px solid ${theme.palette.divider}`,
            color: 'text.primary',
            '&:hover': {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.10)'
                : 'rgba(255,255,255,0.95)',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!canSave}
          sx={{
            borderRadius: '7px',
            padding: '5px 16px',
            fontSize: 12,
            fontWeight: 600,
            minWidth: 78,
            textTransform: 'none',
            backgroundColor: isDark ? '#64b4ff' : '#0071e3',
            border: '0.5px solid transparent',
            color: '#fff',
            boxShadow: !isDark ? 'inset 0 1px 0 rgba(255,255,255,0.5)' : 'none',
            '&:hover': {
              backgroundColor: isDark ? '#7cc0ff' : '#1a82eb',
            },
            '&.Mui-disabled': {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.04)',
              border: `0.5px solid ${theme.palette.divider}`,
              color: 'text.disabled',
              boxShadow: 'none',
            },
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

type LogSettingsDialogProps = {
  open: boolean
  settings: LogSettings
  effectiveDir: string
  onSave: (newSettings: LogSettings, newEffectiveDir: string) => void
  onCancel: () => void
}

function LogSettingsDialog({
  open: dialogOpen,
  settings,
  effectiveDir,
  onSave,
  onCancel,
}: LogSettingsDialogProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [dirInput, setDirInput] = useState<string | null>(settings.output_dir)
  const [localEffectiveDir, setLocalEffectiveDir] =
    useState<string>(effectiveDir)
  const [maxSizeMBInput, setMaxSizeMBInput] = useState<string>(
    String(Math.round(settings.max_file_size / (1024 * 1024))),
  )
  const [rotationInput, setRotationInput] = useState<string>(
    String(settings.rotation_count),
  )

  useEffect(() => {
    if (dialogOpen) {
      setDirInput(settings.output_dir)
      setLocalEffectiveDir(effectiveDir)
      // Rounding is safe because validation enforces integer-MB values.
      setMaxSizeMBInput(
        String(Math.round(settings.max_file_size / (1024 * 1024))),
      )
      setRotationInput(String(settings.rotation_count))
    }
    // Reset to parent's values only when the dialog opens.
    // Omitting settings/effectiveDir from deps is intentional: including them
    // would overwrite in-progress edits whenever the parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen])

  const parsedMaxSize = parseInt(maxSizeMBInput, 10)
  const parsedRotation = parseInt(rotationInput, 10)
  const isMaxSizeValid =
    !isNaN(parsedMaxSize) && parsedMaxSize >= 1 && parsedMaxSize <= 100
  const isRotationValid =
    !isNaN(parsedRotation) && parsedRotation >= 1 && parsedRotation <= 20

  const dirty =
    isMaxSizeValid &&
    isRotationValid &&
    (dirInput !== settings.output_dir ||
      parsedMaxSize * 1024 * 1024 !== settings.max_file_size ||
      parsedRotation !== settings.rotation_count)

  const handleDirPick = async () => {
    const picked = await openOsDialog({ directory: true, multiple: false })
    if (typeof picked === 'string') {
      setDirInput(picked)
      setLocalEffectiveDir(picked)
    }
  }

  const handleSave = () => {
    if (!dirty) return
    onSave(
      {
        output_dir: dirInput,
        max_file_size: parsedMaxSize * 1024 * 1024,
        rotation_count: parsedRotation,
      },
      localEffectiveDir,
    )
  }

  return (
    <Dialog
      open={dialogOpen}
      onClose={onCancel}
      maxWidth='xs'
      fullWidth
      slotProps={{ paper: { sx: dialogPaperSx(isDark) } }}
    >
      <DialogTitle
        sx={{
          padding: '14px 18px 12px',
          fontSize: 14,
          fontWeight: 600,
          borderBottom: `0.5px solid ${theme.palette.divider}`,
        }}
      >
        Log Settings
      </DialogTitle>
      <DialogContent
        sx={{
          padding: '14px 18px 6px !important',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Restart-required notice */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '9px',
            p: '9px 11px',
            backgroundColor: isDark
              ? 'rgba(255,180,80,0.08)'
              : 'rgba(180,120,0,0.06)',
            border: `0.5px solid ${isDark ? 'rgba(255,180,80,0.30)' : 'rgba(180,120,0,0.22)'}`,
            borderRadius: '8px',
          }}
        >
          <InfoOutlinedIcon
            sx={{
              fontSize: 14,
              mt: '1px',
              flexShrink: 0,
              color: isDark ? '#f5c46b' : '#a87a00',
            }}
          />
          <Typography
            sx={{
              lineHeight: 1.5,
              color: isDark ? '#f5c46b' : '#8a6300',
              fontSize: '11.5px',
            }}
          >
            Log settings only take effect after restarting RightCheat.
          </Typography>
        </Box>

        {/* Output Directory */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.01em',
              color: 'text.secondary',
              display: 'block',
            }}
          >
            Output Directory
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Tooltip title='Choose directory'>
              <IconButton
                size='small'
                onClick={handleDirPick}
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '7px',
                  flexShrink: 0,
                  border: `0.5px solid ${isDark ? 'rgba(100,180,255,0.18)' : 'rgba(0,113,227,0.14)'}`,
                  backgroundColor: isDark
                    ? 'rgba(100,180,255,0.10)'
                    : 'rgba(0,113,227,0.07)',
                  color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.primary.main,
                  },
                }}
              >
                <FolderOutlinedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <Box
              title={localEffectiveDir}
              sx={{
                flex: 1,
                minWidth: 0,
                backgroundColor: isDark
                  ? 'rgba(0,0,0,0.25)'
                  : 'rgba(255,255,255,0.9)',
                border: `0.5px solid ${theme.palette.divider}`,
                borderRadius: '7px',
                px: '10px',
                py: '6px',
                boxShadow: isDark ? 'none' : 'inset 0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <Typography
                component='span'
                dir='ltr'
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '11.5px',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  // direction:rtl + U+200E: see DB path display above for explanation.
                  direction: 'rtl',
                }}
              >
                {'‎' + localEffectiveDir}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Max File Size + Rotation Count */}
        <Box
          sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
        >
          <NumberInputField
            label='Max File Size'
            suffix='MB'
            value={maxSizeMBInput}
            onChange={setMaxSizeMBInput}
            error={maxSizeMBInput !== '' && !isMaxSizeValid}
            hint={
              maxSizeMBInput !== '' && !isMaxSizeValid
                ? '1 to 100 MB'
                : undefined
            }
          />
          <NumberInputField
            label='Rotation Count'
            suffix='files'
            value={rotationInput}
            onChange={setRotationInput}
            error={rotationInput !== '' && !isRotationValid}
            hint={
              rotationInput !== '' && !isRotationValid
                ? '1 to 20 files'
                : undefined
            }
          />
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          padding: '12px 16px 14px',
          backgroundColor: isDark
            ? 'rgba(255,255,255,0.018)'
            : 'rgba(255,255,255,0.30)',
          borderTop: `0.5px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={onCancel}
          sx={{
            borderRadius: '7px',
            padding: '5px 16px',
            fontSize: 12,
            fontWeight: 600,
            minWidth: 78,
            textTransform: 'none',
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.75)',
            border: `0.5px solid ${theme.palette.divider}`,
            color: 'text.primary',
            '&:hover': {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.10)'
                : 'rgba(255,255,255,0.95)',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!dirty}
          sx={{
            borderRadius: '7px',
            padding: '5px 16px',
            fontSize: 12,
            fontWeight: 600,
            minWidth: 78,
            textTransform: 'none',
            backgroundColor: isDark ? '#64b4ff' : '#0071e3',
            border: '0.5px solid transparent',
            color: '#fff',
            boxShadow: !isDark ? 'inset 0 1px 0 rgba(255,255,255,0.5)' : 'none',
            '&:hover': {
              backgroundColor: isDark ? '#7cc0ff' : '#1a82eb',
            },
            '&.Mui-disabled': {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.04)',
              border: `0.5px solid ${theme.palette.divider}`,
              color: 'text.disabled',
              boxShadow: 'none',
            },
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
