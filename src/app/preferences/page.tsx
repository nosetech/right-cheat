'use client'

import { scaledPx } from '@/utils/css'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  CheckIcon,
  StepperInput,
  ThemedSwitch,
  ThemeToggle,
} from '@/components/atoms'
import { WindowHeader } from '@/components/molecules/WindowHeader'
import { DialogVariant, RcDialog } from '@/components/organisms/RcDialog'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import { useThemeStore } from '@/hooks/useThemeStore'
import { useWindowCloseShortcuts } from '@/hooks/useWindowCloseShortcuts'
import {
  CLIPBOARD_CHARS_LOWER_BOUND,
  CLIPBOARD_CHARS_UPPER_BOUND,
  CLIPBOARD_ITEMS_LOWER_BOUND,
  CLIPBOARD_ITEMS_UPPER_BOUND,
  ClipboardSettings,
  ClipboardSettingsAPI,
} from '@/types/api/ClipboardSettings'
import { DbSettings, DbSettingsAPI } from '@/types/api/DbSettings'
import {
  GlobalShortcutAPI,
  isSameShortcut,
  ShortcutDef,
} from '@/types/api/GlobalShortcut'
import { LogSettings, LogSettingsAPI } from '@/types/api/LogSettings'
import { WindowAPI } from '@/types/api/Window'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { open as openOsDialog } from '@tauri-apps/plugin-dialog'
import { debug, error } from '@tauri-apps/plugin-log'
import { relaunch } from '@tauri-apps/plugin-process'

// Fallback values matching backend defaults (log_settings.rs).
// Overwritten immediately by GET_LOG_SETTINGS on mount.
const DEFAULT_MAX_FILE_SIZE_BYTES = 1_048_576
const DEFAULT_ROTATION_COUNT = 3

export default function Page() {
  const theme = useTheme()

  const [shortcutDialogOpen, setShortcutDialogOpen] = useState<boolean>(false)
  const [
    clipboardHistoryShortcutDialogOpen,
    setClipboardHistoryShortcutDialogOpen,
  ] = useState<boolean>(false)
  const [confirmActions, setConfirmActionsState] = useState<boolean>(true)

  const { getConfirmActions, setConfirmActions } = usePreferencesStore()
  const {
    themeMode,
    setThemeMode: setStoredThemeMode,
    isLoading,
  } = useThemeStore()

  const [toggleVisibleShortcut, setToggleVisibleShortcut] =
    useState<ShortcutDef>()
  const [clipboardHistoryShortcut, setClipboardHistoryShortcut] =
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

  // Fallback values matching backend defaults (clipboard_settings.rs).
  // Overwritten immediately by GET_CLIPBOARD_SETTINGS on mount.
  const [clipboardSettings, setClipboardSettingsState] =
    useState<ClipboardSettings>({
      monitoring_enabled: true,
      min_chars: 2,
      max_chars: 200,
      max_items: 100,
      clear_on_quit: false,
    })

  // ── RcDialog state ──────────────────────────────────────────
  const [rcDialog, setRcDialog] = useState<{
    open: boolean
    variant: DialogVariant
    title: string
    message: string
    isYesNo: boolean
  }>({
    open: false,
    variant: 'information',
    title: '',
    message: '',
    isYesNo: false,
  })
  const rcDialogResolve = useRef<((yes: boolean) => void) | null>(null)

  const showRcInfo = useCallback(
    (title: string, msg: string): Promise<void> =>
      new Promise((resolve) => {
        rcDialogResolve.current = () => resolve()
        setRcDialog({
          open: true,
          variant: 'information',
          title,
          message: msg,
          isYesNo: false,
        })
      }),
    [],
  )

  const showRcError = useCallback(
    (title: string, msg: string): Promise<void> =>
      new Promise((resolve) => {
        rcDialogResolve.current = () => resolve()
        setRcDialog({
          open: true,
          variant: 'error',
          title,
          message: msg,
          isYesNo: false,
        })
      }),
    [],
  )

  const showRcConfirm = useCallback(
    (variant: DialogVariant, title: string, msg: string): Promise<boolean> =>
      new Promise((resolve) => {
        rcDialogResolve.current = resolve
        setRcDialog({ open: true, variant, title, message: msg, isYesNo: true })
      }),
    [],
  )

  const resolveDialog = useCallback((result: boolean) => {
    setRcDialog((prev) => ({ ...prev, open: false }))
    rcDialogResolve.current?.(result)
    rcDialogResolve.current = null
  }, [])

  const handleRcDialogOk = useCallback(
    () => resolveDialog(true),
    [resolveDialog],
  )
  const handleRcDialogYes = useCallback(
    () => resolveDialog(true),
    [resolveDialog],
  )
  const handleRcDialogNo = useCallback(
    () => resolveDialog(false),
    [resolveDialog],
  )
  // ────────────────────────────────────────────────────────────

  // Esc でウィンドウを閉じる（この画面に Cancel ボタンはない）。
  // ダイアログ表示中は MUI Dialog が Esc を処理して stopPropagation するため、
  // window までは伝播せずウィンドウは閉じない。
  useWindowCloseShortcuts({
    onCancel: () => void getCurrentWindow().close(),
  })

  useEffect(() => {
    ;(async () => {
      try {
        const confirmActionsValue = await getConfirmActions()
        setConfirmActionsState(confirmActionsValue)
      } catch (err) {
        error(`[preferences] Error getting confirm_actions: ${err}`)
      }

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
          await showRcError(
            'Preferences',
            'Failed to get global shortcut settings',
          )
        }
      } catch (err) {
        error(
          `[preferences] Error getting toggle visible shortcut settings: ${err}`,
        )
        await showRcError(
          'Preferences',
          'Failed to get global shortcut settings',
        )
      }

      try {
        const response = await invoke<string>(
          GlobalShortcutAPI.GET_CLIPBOARD_HISTORY_SHORTCUT_SETTINGS,
        )
        debug(
          `[preferences] invoke '${GlobalShortcutAPI.GET_CLIPBOARD_HISTORY_SHORTCUT_SETTINGS}' response=${response}`,
        )
        const res_json = JSON.parse(response)
        if (res_json.status === 'success') {
          const shortcut: ShortcutDef = res_json.message
          setClipboardHistoryShortcut(shortcut)
        } else {
          error(
            `[preferences] Failed to get clipboard history shortcut settings: ${res_json.message}`,
          )
          await showRcError(
            'Preferences',
            'Failed to get global shortcut settings',
          )
        }
      } catch (err) {
        error(
          `[preferences] Error getting clipboard history shortcut settings: ${err}`,
        )
        await showRcError(
          'Preferences',
          'Failed to get global shortcut settings',
        )
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
        await showRcError('Preferences', 'Failed to get log settings')
      }

      try {
        const settings = await invoke<ClipboardSettings>(
          ClipboardSettingsAPI.GET_CLIPBOARD_SETTINGS,
        )
        debug(
          `[preferences] invoke '${ClipboardSettingsAPI.GET_CLIPBOARD_SETTINGS}' response=${JSON.stringify(settings)}`,
        )
        setClipboardSettingsState(settings)
      } catch (err) {
        error(`[preferences] Error getting clipboard settings: ${err}`)
        await showRcError(
          'Preferences',
          'Failed to get clipboard history settings',
        )
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
        await showRcError('Preferences', 'Failed to get DB settings')
      }
    })()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showRestartConfirmationDialog = async () => {
    const shouldRestart = await showRcConfirm(
      'confirmation',
      'Restart Confirmation',
      'A restart is required to apply the settings.\nDo you want to restart now?',
    )

    if (shouldRestart) {
      if (process.env.NODE_ENV === 'production') {
        await relaunch()
      } else {
        debug('[preferences] Relaunch skipped in development mode.')
      }
    } else {
      debug('[preferences] User cancelled the restart.')
      await showRcInfo(
        'Settings Saved',
        'Settings saved.\nThey will take effect on the next launch.',
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
        await showRcError(
          'Preferences',
          'Failed to save global shortcut settings',
        )
      }
    } catch (err) {
      error(`[preferences] Error setting shortcut: ${err}`)
      await showRcError(
        'Preferences',
        'Failed to save global shortcut settings',
      )
    }

    if (saved) {
      await showRestartConfirmationDialog()
    }
  }

  const handleClipboardHistoryShortcutSave = async (shortcut: ShortcutDef) => {
    setClipboardHistoryShortcutDialogOpen(false)
    let saved = false
    try {
      const response = await invoke<string>(
        GlobalShortcutAPI.SET_CLIPBOARD_HISTORY_SHORTCUT_SETTINGS,
        { shortcut },
      )
      debug(
        `[preferences] invoke '${GlobalShortcutAPI.SET_CLIPBOARD_HISTORY_SHORTCUT_SETTINGS}' response=${response}`,
      )
      const res_json = JSON.parse(response)
      if (res_json.status === 'success') {
        setClipboardHistoryShortcut(shortcut)
        saved = true
      } else {
        error(
          `[preferences] Failed to set clipboard history shortcut settings: ${res_json.message}`,
        )
        await showRcError(
          'Preferences',
          'Failed to save global shortcut settings',
        )
      }
    } catch (err) {
      error(`[preferences] Error setting clipboard history shortcut: ${err}`)
      await showRcError(
        'Preferences',
        'Failed to save global shortcut settings',
      )
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
      await showRcError('Preferences', 'Failed to save theme settings')
      return
    }

    try {
      const response = await invoke<string>(WindowAPI.NOTIFY_THEME_CHANGED)
      debug(
        `[preferences] invoke '${WindowAPI.NOTIFY_THEME_CHANGED}' response=${response}`,
      )
    } catch (err) {
      error(`[preferences] Error notifying theme change: ${err}`)
      await showRcError('Preferences', 'Failed to apply theme change')
    }
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
        await showRcError('Preferences', 'Failed to save log settings')
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
      await showRcError('Preferences', `Failed to save DB settings.\n${err}`)
    }
    if (saved) {
      const shouldRestart = await showRcConfirm(
        'warning',
        'Restart Confirmation',
        'The existing DB file will not be moved automatically.\nPlease copy it to the new location manually before restarting.\n\nDo you want to restart now?',
      )
      if (shouldRestart) {
        if (process.env.NODE_ENV === 'production') {
          await relaunch()
        } else {
          debug('[preferences] Relaunch skipped in development mode.')
        }
      } else {
        debug('[preferences] User cancelled the restart.')
        await showRcInfo(
          'Settings Saved',
          'Settings saved.\nThey will take effect on the next launch.',
        )
      }
    }
  }

  const handleConfirmActionsChange = async (enabled: boolean) => {
    setConfirmActionsState(enabled)
    try {
      await setConfirmActions(enabled)
      debug(`[preferences] confirm_actions set to ${enabled}`)
    } catch (err) {
      error(`[preferences] Error setting confirm_actions: ${err}`)
      await showRcError(
        'Preferences',
        'Failed to save confirm before actions setting',
      )
      setConfirmActionsState(!enabled)
    }
  }

  // 即時保存・即時反映（Saveボタンや確認ダイアログは設けない）。
  // 失敗時は変更前の値に戻す。
  const applyClipboardSettings = async (next: ClipboardSettings) => {
    const prev = clipboardSettings
    setClipboardSettingsState(next)
    try {
      await invoke(ClipboardSettingsAPI.SET_CLIPBOARD_SETTINGS, {
        settings: next,
      })
      debug(
        `[preferences] invoke '${ClipboardSettingsAPI.SET_CLIPBOARD_SETTINGS}' succeeded: ${JSON.stringify(next)}`,
      )
    } catch (err) {
      error(`[preferences] Error setting clipboard settings: ${err}`)
      await showRcError(
        'Preferences',
        'Failed to save clipboard history settings',
      )
      setClipboardSettingsState(prev)
    }
  }

  const handleClipboardMonitoringChange = (enabled: boolean) =>
    applyClipboardSettings({
      ...clipboardSettings,
      monitoring_enabled: enabled,
    })

  const handleMinCharsChange = (value: number) =>
    // 最小文字数が最大文字数を超えた場合は、最大文字数を同じ値まで引き上げる
    applyClipboardSettings({
      ...clipboardSettings,
      min_chars: value,
      max_chars: Math.max(clipboardSettings.max_chars, value),
    })

  const handleMaxCharsChange = (value: number) =>
    applyClipboardSettings({ ...clipboardSettings, max_chars: value })

  const handleMaxItemsChange = (value: number) =>
    applyClipboardSettings({ ...clipboardSettings, max_items: value })

  const handleClearOnQuitChange = (enabled: boolean) =>
    applyClipboardSettings({ ...clipboardSettings, clear_on_quit: enabled })

  const handleOpenLatestLog = async () => {
    try {
      await invoke(LogSettingsAPI.OPEN_LATEST_LOG_FILE)
      debug(
        `[preferences] invoke '${LogSettingsAPI.OPEN_LATEST_LOG_FILE}' succeeded`,
      )
    } catch (err) {
      error(`[preferences] Error opening latest log file: ${err}`)
      await showRcError('Preferences', 'Failed to open log file')
    }
  }

  const isDark = theme.palette.mode === 'dark'

  return (
    <>
      <WindowHeader title='Preferences' />
      <Box
        sx={{
          p: '4px 20px 16px',
          display: 'flex',
          flexDirection: 'column',
          // body ではなくこの Box をスクロールコンテナにして、
          // チートシート画面（ネイティブスクロールバー）と同じ見た目に合わせる。
          // ネイティブのサムは背景より暗い黒系半透明のため同じ色を指定する。
          height: `calc(100vh - ${TITLEBAR_HEIGHT}px)`,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: isDark
            ? 'rgba(0,0,0,0.55) transparent'
            : 'rgba(0,0,0,0.5) transparent',
        }}
      >
        {/* Clipboard History */}
        <Box sx={{ py: '12px' }}>
          <Typography
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.sectionHeader),
              fontWeight: 600,
              letterSpacing: '0.01em',
              mb: '10px',
              color: 'text.primary',
            }}
          >
            Clipboard History
          </Typography>
          <Box sx={{ pl: '14px', py: '8px' }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                p: '12px 14px',
                backgroundColor: theme.palette.glass.panel,
                border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)'}`,
                borderRadius: '10px',
                boxShadow: isDark
                  ? 'none'
                  : 'inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              {/* Row: Clipboard monitoring on/off */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <PrefRowLabel
                  label='Clipboard monitoring'
                  description='Watch the system clipboard and record new copies automatically.'
                />
                <ThemedSwitch
                  checked={clipboardSettings.monitoring_enabled}
                  onChange={(e) =>
                    handleClipboardMonitoringChange(e.target.checked)
                  }
                />
              </Box>

              <Divider
                sx={{
                  borderBottomWidth: '0.5px',
                  opacity: clipboardSettings.monitoring_enabled ? 1 : 0.4,
                  transition: 'opacity 0.14s',
                }}
              />

              {/* Rows below are disabled while monitoring is off */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  opacity: clipboardSettings.monitoring_enabled ? 1 : 0.4,
                  pointerEvents: clipboardSettings.monitoring_enabled
                    ? 'auto'
                    : 'none',
                  transition: 'opacity 0.14s',
                }}
              >
                {/* Row: Minimum characters to save */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <PrefRowLabel
                    label='Minimum characters to save'
                    description='Copies shorter than this are ignored and not saved to history.'
                  />
                  <StepperInput
                    value={clipboardSettings.min_chars}
                    min={CLIPBOARD_CHARS_LOWER_BOUND}
                    max={CLIPBOARD_CHARS_UPPER_BOUND}
                    suffix='chars'
                    onChange={handleMinCharsChange}
                  />
                </Box>

                <Divider sx={{ borderBottomWidth: '0.5px' }} />

                {/* Row: Maximum characters to save */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <PrefRowLabel
                    label='Maximum characters to save'
                    description={`Copies longer than this are truncated to the first ${clipboardSettings.max_chars} characters.`}
                  />
                  <StepperInput
                    value={clipboardSettings.max_chars}
                    min={Math.max(
                      CLIPBOARD_CHARS_LOWER_BOUND,
                      clipboardSettings.min_chars,
                    )}
                    max={CLIPBOARD_CHARS_UPPER_BOUND}
                    suffix='chars'
                    onChange={handleMaxCharsChange}
                  />
                </Box>

                <Divider sx={{ borderBottomWidth: '0.5px' }} />

                {/* Row: Max history entries */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <PrefRowLabel
                    label='Max history entries'
                    description='The oldest entries are removed once this limit is reached.'
                  />
                  <StepperInput
                    value={clipboardSettings.max_items}
                    min={CLIPBOARD_ITEMS_LOWER_BOUND}
                    max={CLIPBOARD_ITEMS_UPPER_BOUND}
                    suffix='items'
                    onChange={handleMaxItemsChange}
                  />
                </Box>

                <Divider sx={{ borderBottomWidth: '0.5px' }} />

                {/* Row: Clear history on quit */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <PrefRowLabel
                    label='Clear history on quit'
                    description='Erase all saved clipboard history when the application exits.'
                  />
                  <ThemedSwitch
                    checked={clipboardSettings.clear_on_quit}
                    onChange={(e) => handleClearOnQuitChange(e.target.checked)}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mx: '-20px', borderBottomWidth: '0.5px' }} />

        {/* Global Shortcut */}
        <Box sx={{ py: '12px' }}>
          <Typography
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.sectionHeader),
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
                sx={{
                  fontSize: scaledPx(theme.custom.fontSize.label),
                  fontWeight: 500,
                  color: 'text.primary',
                }}
              >
                Toggle Visible
              </Typography>
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontSize: scaledPx(theme.custom.fontSize.label),
                }}
              >
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
                    fontSize: scaledPx(theme.custom.fontSize.body),
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
                      border: `0.5px solid ${alpha(theme.palette.accent.main, isDark ? 0.18 : 0.14)}`,
                      backgroundColor: alpha(
                        theme.palette.accent.main,
                        isDark ? 0.1 : 0.07,
                      ),
                      color: theme.palette.text.disabled,
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main,
                      },
                    }}
                  >
                    <SettingsOutlinedIcon sx={{ fontSize: '14px' }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
          <Box sx={{ pl: '14px', py: '8px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Typography
                sx={{
                  fontSize: scaledPx(theme.custom.fontSize.label),
                  fontWeight: 500,
                  color: 'text.primary',
                }}
              >
                Clipboard History
              </Typography>
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontSize: scaledPx(theme.custom.fontSize.label),
                }}
              >
                :
              </Typography>
              {clipboardHistoryShortcut && (
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
                    fontSize: scaledPx(theme.custom.fontSize.body),
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
                      clipboardHistoryShortcut.ctrl && '^',
                      clipboardHistoryShortcut.option && '⌥',
                      clipboardHistoryShortcut.command && '⌘',
                      clipboardHistoryShortcut.hotkey,
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
                    disabled={!clipboardHistoryShortcut}
                    onClick={() => setClipboardHistoryShortcutDialogOpen(true)}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '7px',
                      border: `0.5px solid ${alpha(theme.palette.accent.main, isDark ? 0.18 : 0.14)}`,
                      backgroundColor: alpha(
                        theme.palette.accent.main,
                        isDark ? 0.1 : 0.07,
                      ),
                      color: theme.palette.text.disabled,
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main,
                      },
                    }}
                  >
                    <SettingsOutlinedIcon sx={{ fontSize: '14px' }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mx: '-20px', borderBottomWidth: '0.5px' }} />

        {/* Theme */}
        <Box sx={{ py: '12px' }}>
          <Typography
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.sectionHeader),
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
        <Box sx={{ py: '12px' }}>
          <Typography
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.sectionHeader),
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
                backgroundColor: theme.palette.glass.panel,
                border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)'}`,
                borderRadius: '10px',
                boxShadow: isDark
                  ? 'none'
                  : 'inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              {/* Confirm before actions */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: '6px',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RowDot />
                  <Typography
                    sx={{
                      fontSize: scaledPx(theme.custom.fontSize.label),
                      color: 'text.primary',
                    }}
                  >
                    Confirm before actions
                  </Typography>
                </Box>
                <ThemedSwitch
                  checked={confirmActions}
                  onChange={(e) => handleConfirmActionsChange(e.target.checked)}
                />
              </Box>

              <Divider sx={{ borderBottomWidth: '0.5px' }} />

              {/* CheatSheet DB section */}
              <Box sx={{ py: '6px' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    mb: '8px',
                  }}
                >
                  <RowDot />
                  <Typography
                    sx={{
                      fontSize: scaledPx(theme.custom.fontSize.label),
                      color: 'text.primary',
                    }}
                  >
                    CheatSheet DB
                  </Typography>
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
                        border: `0.5px solid ${alpha(theme.palette.accent.main, isDark ? 0.18 : 0.14)}`,
                        backgroundColor: alpha(
                          theme.palette.accent.main,
                          isDark ? 0.1 : 0.07,
                        ),
                        color: theme.palette.text.disabled,
                        '&:hover': {
                          borderColor: theme.palette.primary.main,
                          color: theme.palette.primary.main,
                        },
                      }}
                    >
                      <InsertDriveFileOutlinedIcon sx={{ fontSize: '14px' }} />
                    </IconButton>
                  </Tooltip>
                  <Box
                    title={effectiveDbPath}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      backgroundColor: theme.palette.glass.field,
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
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: scaledPx(theme.custom.fontSize.captionSm),
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'text.primary',
                      }}
                    >
                      {effectiveDbPath}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ borderBottomWidth: '0.5px' }} />

              {/* Log section */}
              <Box sx={{ py: '6px' }}>
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
                    <Typography
                      sx={{
                        fontSize: scaledPx(theme.custom.fontSize.label),
                        color: 'text.primary',
                      }}
                    >
                      Log
                    </Typography>
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
                          border: `0.5px solid ${alpha(theme.palette.accent.main, isDark ? 0.18 : 0.14)}`,
                          backgroundColor: alpha(
                            theme.palette.accent.main,
                            isDark ? 0.1 : 0.07,
                          ),
                          color: theme.palette.text.disabled,
                          '&:hover': {
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                          },
                        }}
                      >
                        <ArticleOutlinedIcon sx={{ fontSize: '13px' }} />
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
                          border: `0.5px solid ${alpha(theme.palette.accent.main, isDark ? 0.18 : 0.14)}`,
                          backgroundColor: alpha(
                            theme.palette.accent.main,
                            isDark ? 0.1 : 0.07,
                          ),
                          color: theme.palette.text.disabled,
                          '&:hover': {
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                          },
                        }}
                      >
                        <SettingsOutlinedIcon sx={{ fontSize: '13px' }} />
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
          label='Toggle Visible'
          shortcut={toggleVisibleShortcut}
          conflictShortcut={clipboardHistoryShortcut}
          onSave={handleShortcutSave}
          onCancel={() => setShortcutDialogOpen(false)}
        />
      )}
      {clipboardHistoryShortcut && (
        <ShortcutSettingsDialog
          open={clipboardHistoryShortcutDialogOpen}
          label='Clipboard History'
          shortcut={clipboardHistoryShortcut}
          conflictShortcut={toggleVisibleShortcut}
          onSave={handleClipboardHistoryShortcutSave}
          onCancel={() => setClipboardHistoryShortcutDialogOpen(false)}
        />
      )}
      {rcDialog.isYesNo ? (
        <RcDialog
          open={rcDialog.open}
          variant={rcDialog.variant}
          title={rcDialog.title}
          message={rcDialog.message}
          onYes={handleRcDialogYes}
          onNo={handleRcDialogNo}
        />
      ) : (
        <RcDialog
          open={rcDialog.open}
          variant={rcDialog.variant}
          title={rcDialog.title}
          message={rcDialog.message}
          onOk={handleRcDialogOk}
        />
      )}
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────

function PrefRowLabel({
  label,
  description,
}: {
  label: string
  description: string
}) {
  const theme = useTheme()
  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}
    >
      <RowDot />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          minWidth: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: scaledPx(theme.custom.fontSize.label),
            color: 'text.primary',
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: scaledPx(theme.custom.fontSize.captionSm),
            color: 'text.secondary',
          }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
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
  const theme = useTheme()
  return (
    <Box
      sx={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}
    >
      <Typography
        sx={{
          fontSize: scaledPx(theme.custom.fontSize.captionSm),
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
          fontSize: scaledPx(theme.custom.fontSize.captionSm),
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
          fontSize: scaledPx(theme.custom.fontSize.captionSm),
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
          backgroundColor: theme.palette.glass.field,
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
            fontSize: scaledPx(theme.custom.fontSize.body),
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
            fontSize: scaledPx(10),
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
            fontSize: scaledPx(theme.custom.fontSize.hint),
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
        fontSize: big
          ? scaledPx(theme.custom.fontSize.searchInput)
          : scaledPx(theme.custom.fontSize.body),
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
          ? alpha(theme.palette.accent.main, isDark ? 0.1 : 0.06)
          : hovered
            ? theme.palette.surface.hover
            : 'transparent',
        border: `0.5px solid ${
          checked
            ? alpha(theme.palette.accent.main, isDark ? 0.3 : 0.22)
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
          <CheckIcon size={11} strokeWidth={3} color={theme.palette.onAccent} />
        )}
      </Box>
      <Keycap active={checked}>{symbol}</Keycap>
      <Typography
        sx={{
          fontSize: scaledPx(theme.custom.fontSize.label),
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
        fontSize: scaledPx(theme.custom.fontSize.hotkeyChar),
        fontWeight: 600,
        color: 'text.primary',
        caretColor: theme.palette.primary.main,
        outline: 'none',
        boxShadow: focused
          ? `0 0 0 3px ${alpha(theme.palette.accent.main, isDark ? 0.13 : 0.1)}`
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
  /** ダイアログタイトルに表示する対象名（例: "Toggle Visible"） */
  label: string
  shortcut: ShortcutDef
  /** 重複を禁止するもう一方のショートカット（同一の組み合わせは保存不可） */
  conflictShortcut?: ShortcutDef
  onSave: (shortcut: ShortcutDef) => void
  onCancel: () => void
}

function ShortcutSettingsDialog({
  open: dialogOpen,
  label,
  shortcut,
  conflictShortcut,
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
  const isConflict =
    hasModifier &&
    hasHotkey &&
    conflictShortcut !== undefined &&
    isSameShortcut({ ctrl, option, command, hotkey }, conflictShortcut)
  const canSave = hasModifier && hasHotkey && dirty && !isConflict

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
          fontSize: scaledPx(theme.custom.fontSize.sectionHeader),
          fontWeight: 600,
          borderBottom: `0.5px solid ${theme.palette.divider}`,
        }}
      >
        Global Shortcut — {label}
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
            backgroundColor: theme.palette.amber.background,
            border: `0.5px solid ${theme.palette.amber.border}`,
            borderRadius: '8px',
          }}
        >
          <InfoOutlinedIcon
            sx={{
              fontSize: '14px',
              mt: '1px',
              flexShrink: 0,
              color: theme.palette.amber.text,
            }}
          />
          <Typography
            sx={{
              lineHeight: 1.5,
              color: theme.palette.amber.text,
              fontSize: scaledPx(theme.custom.fontSize.caption),
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
            backgroundColor: theme.palette.glass.panel,
            border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)'}`,
            borderRadius: '10px',
            boxShadow: !isDark ? 'inset 0 1px 0 rgba(255,255,255,0.5)' : 'none',
          }}
        >
          <Typography
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.hint),
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
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.label),
                color: 'text.secondary',
                p: '7px 0',
              }}
            >
              Not set
            </Typography>
          )}
        </Box>

        {/* Modifiers */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <Typography
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.captionSm),
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
                fontSize: scaledPx(theme.custom.fontSize.hint),
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
              fontSize: scaledPx(theme.custom.fontSize.captionSm),
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
            <Typography
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.caption),
                color: 'text.secondary',
              }}
            >
              Type a key to set it
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.hint),
              color: 'text.disabled',
              lineHeight: 1.4,
            }}
          >
            A single character — letters (A–Z, a–z) or digits (0–9) only.
          </Typography>
          {showError && !hasHotkey && (
            <Typography
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.hint),
                color: theme.palette.error.main,
                mt: '2px',
              }}
            >
              Please enter a hotkey character.
            </Typography>
          )}
          {isConflict && (
            <Typography
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.hint),
                color: theme.palette.error.main,
                mt: '2px',
              }}
            >
              This shortcut is already used by another action.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          padding: '12px 16px 14px',
          backgroundColor: theme.palette.ui.footerBg,
          borderTop: `0.5px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={onCancel}
          sx={{
            borderRadius: '7px',
            padding: '5px 16px',
            fontSize: scaledPx(theme.custom.fontSize.body),
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
            fontSize: scaledPx(theme.custom.fontSize.body),
            fontWeight: 600,
            minWidth: 78,
            textTransform: 'none',
            backgroundColor: theme.palette.accent.main,
            border: '0.5px solid transparent',
            color: theme.palette.onAccent,
            boxShadow: !isDark ? 'inset 0 1px 0 rgba(255,255,255,0.5)' : 'none',
            '&:hover': {
              backgroundColor: theme.palette.accentHover,
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
          fontSize: scaledPx(theme.custom.fontSize.sectionHeader),
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
            backgroundColor: theme.palette.amber.background,
            border: `0.5px solid ${theme.palette.amber.border}`,
            borderRadius: '8px',
          }}
        >
          <InfoOutlinedIcon
            sx={{
              fontSize: '14px',
              mt: '1px',
              flexShrink: 0,
              color: theme.palette.amber.text,
            }}
          />
          <Typography
            sx={{
              lineHeight: 1.5,
              color: theme.palette.amber.text,
              fontSize: scaledPx(theme.custom.fontSize.caption),
            }}
          >
            Log settings only take effect after restarting RightCheat.
          </Typography>
        </Box>

        {/* Output Directory */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <Typography
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.captionSm),
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
                <FolderOutlinedIcon sx={{ fontSize: '14px' }} />
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
                  fontSize: scaledPx(theme.custom.fontSize.caption),
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
          backgroundColor: theme.palette.ui.footerBg,
          borderTop: `0.5px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={onCancel}
          sx={{
            borderRadius: '7px',
            padding: '5px 16px',
            fontSize: scaledPx(theme.custom.fontSize.body),
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
            fontSize: scaledPx(theme.custom.fontSize.body),
            fontWeight: 600,
            minWidth: 78,
            textTransform: 'none',
            backgroundColor: theme.palette.accent.main,
            border: '0.5px solid transparent',
            color: theme.palette.onAccent,
            boxShadow: !isDark ? 'inset 0 1px 0 rgba(255,255,255,0.5)' : 'none',
            '&:hover': {
              backgroundColor: theme.palette.accentHover,
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
