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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
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
  InputAdornment,
  Stack,
  TextField,
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
  const [logDialogOpen, setLogDialogOpen] = useState<boolean>(false)

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

          <Divider sx={{ borderBottomWidth: '0.5px' }} />

          {/* Log section */}
          <Box>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RowDot />
                <Typography variant='body2'>Log</Typography>
                <Chip
                  label='Restart Required'
                  size='small'
                  sx={{
                    height: 18,
                    fontSize: '9.5px',
                    fontFamily: 'monospace',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
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
                    sx={{ color: 'text.secondary' }}
                  >
                    <ArticleOutlinedIcon sx={{ fontSize: 14 }} />
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
                      border: `0.5px solid ${theme.palette.divider}`,
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.055)'
                        : theme.palette.background.paper,
                      color: 'text.secondary',
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        color: 'primary.main',
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
              <LogSummaryRow label='Output Directory' value={effectiveLogDir} />
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
      </Stack>

      <LogSettingsDialog
        open={logDialogOpen}
        settings={logSettings}
        effectiveDir={effectiveLogDir}
        onSave={handleLogSettingsSave}
        onCancel={() => setLogDialogOpen(false)}
      />
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

function LogSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}
    >
      <Typography
        variant='caption'
        sx={{
          flexShrink: 0,
          width: 110,
          fontWeight: 500,
          color: 'text.secondary',
        }}
      >
        {label}
      </Typography>
      <Typography
        variant='caption'
        title={value}
        sx={{
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
    <Dialog open={dialogOpen} onClose={onCancel} maxWidth='xs' fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Log Settings</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            variant='caption'
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
        <Box>
          <Typography
            variant='caption'
            sx={{ display: 'block', mb: '6px', fontWeight: 500 }}
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
                  border: `0.5px solid ${theme.palette.divider}`,
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.055)'
                    : theme.palette.background.paper,
                  '&:hover': { borderColor: theme.palette.primary.main },
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
              }}
            >
              <Typography
                component='span'
                dir='ltr'
                variant='caption'
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '11.5px',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  // rtl makes the path truncate from the left so the deepest
                  // part of the path is always visible. dir='ltr' ensures
                  // screen readers announce it left-to-right.
                  direction: 'rtl',
                  unicodeBidi: 'bidi-override',
                  textAlign: 'left',
                }}
              >
                {localEffectiveDir}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Max File Size + Rotation Count */}
        <Box
          sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
        >
          <TextField
            size='small'
            type='number'
            label='Max File Size'
            value={maxSizeMBInput}
            onChange={(e) => setMaxSizeMBInput(e.target.value)}
            error={maxSizeMBInput !== '' && !isMaxSizeValid}
            helperText={
              maxSizeMBInput !== '' && !isMaxSizeValid ? '1 to 100 MB' : ' '
            }
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
              '& .MuiInputBase-root': {
                fontFamily: 'monospace',
                fontSize: '12px',
              },
            }}
          />
          <TextField
            size='small'
            type='number'
            label='Rotation Count'
            value={rotationInput}
            onChange={(e) => setRotationInput(e.target.value)}
            error={rotationInput !== '' && !isRotationValid}
            helperText={
              rotationInput !== '' && !isRotationValid ? '1 to 20 files' : ' '
            }
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
              '& .MuiInputBase-root': {
                fontFamily: 'monospace',
                fontSize: '12px',
              },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!dirty} variant='contained'>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
