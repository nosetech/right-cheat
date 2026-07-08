'use client'
import { scaledPx } from '@/utils/css'
import { useCallback, useEffect, useState } from 'react'

import { Box, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { save } from '@tauri-apps/plugin-dialog'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import {
  AlertCircleIcon,
  CheckIcon,
  FileIcon,
  MinusIcon,
  UploadIcon,
} from '@/components/atoms/icons'
import { FooterButton } from '@/components/molecules/FooterButton'
import { WindowTitleBar } from '@/components/molecules/WindowTitleBar'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { FONT_CODE } from '@/theme/fonts'
import { CheatSheetAPI, CheatSheetTitleData } from '@/types/api/CheatSheet'

type ResultKind = 'success' | 'error'

type SheetInfo = {
  title: string
  checked: boolean
}

function ExportCheckbox({
  checked,
  indeterminate,
  onChange,
  size = 18,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange?: () => void
  size?: number
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accentSolid = theme.palette.accent.main
  const active = checked || !!indeterminate

  return (
    <Box
      role='checkbox'
      aria-checked={indeterminate ? 'mixed' : checked}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        onChange?.()
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onChange?.()
        }
      }}
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '4px',
        background: active ? accentSolid : 'transparent',
        border: `1.5px solid ${
          active
            ? accentSolid
            : isDark
              ? 'rgba(255,255,255,0.35)'
              : 'rgba(0,0,0,0.32)'
        }`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 0.12s, border-color 0.12s',
        '&:hover': {
          boxShadow: active
            ? `0 0 0 6px ${alpha(theme.palette.accent.main, 0.1)}`
            : `0 0 0 6px ${isDark ? 'rgba(255,255,255,0.04)' : alpha(theme.palette.accent.main, 0.06)}`,
          borderColor: active
            ? accentSolid
            : isDark
              ? 'rgba(255,255,255,0.55)'
              : 'rgba(0,0,0,0.55)',
        },
      }}
    >
      {indeterminate ? (
        <MinusIcon
          size={Math.round(size * 0.62)}
          strokeWidth={3.5}
          color={theme.palette.onAccent}
        />
      ) : checked ? (
        <CheckIcon
          size={Math.round(size * 0.7)}
          strokeWidth={3.2}
          color={theme.palette.onAccent}
        />
      ) : null}
    </Box>
  )
}

function ExportRow({
  sheet,
  onToggle,
  isLast,
}: {
  sheet: SheetInfo
  onToggle: () => void
  isLast: boolean
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        cursor: 'pointer',
        background: 'transparent',
        borderBottom: isLast
          ? 'none'
          : `0.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
        transition: 'background 0.1s',
        userSelect: 'none',
        '&:hover': {
          background: theme.palette.glass.field,
        },
      }}
    >
      <ExportCheckbox checked={sheet.checked} onChange={onToggle} size={16} />
      <Typography
        sx={{
          flex: 1,
          minWidth: 0,
          fontSize: scaledPx(theme.custom.fontSize.label),
          fontWeight: sheet.checked ? 500 : 400,
          color: sheet.checked
            ? theme.palette.text.primary
            : theme.palette.text.secondary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          transition: 'color 0.12s',
        }}
      >
        {sheet.title}
      </Typography>
    </Box>
  )
}

function ResultModal({
  kind,
  path,
  count,
  onClose,
}: {
  kind: ResultKind
  path: string
  count: number
  onClose: () => void
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const ok = kind === 'success'
  const accentSolid = theme.palette.accent.main

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        background: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(50,50,80,0.18)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
        animation: 'rcFadeIn 0.14s ease-out',
        '@keyframes rcFadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
      }}
    >
      <Box
        sx={{
          width: 320,
          background: isDark ? 'rgba(28,34,48,0.98)' : 'rgba(252,253,255,0.98)',
          backdropFilter: 'blur(40px) saturate(180%)',
          borderRadius: '12px',
          border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)'}`,
          boxShadow: isDark
            ? '0 24px 64px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.06)'
            : '0 24px 64px rgba(0,0,50,0.22), 0 0 0 0.5px rgba(255,255,255,0.7)',
          padding: '20px 18px 14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          animation: 'rcPop 0.18s ease-out',
          '@keyframes rcPop': {
            from: { opacity: 0, transform: 'scale(0.94)' },
            to: { opacity: 1, transform: 'scale(1)' },
          },
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: ok
              ? isDark
                ? 'rgba(40,200,120,0.18)'
                : 'rgba(40,180,100,0.14)'
              : 'rgba(255,107,107,0.16)',
            border: `0.5px solid ${
              ok
                ? isDark
                  ? 'rgba(40,200,120,0.45)'
                  : 'rgba(40,180,100,0.40)'
                : 'rgba(255,107,107,0.45)'
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {ok ? (
            <CheckIcon
              size={22}
              strokeWidth={2.6}
              color={theme.palette.positive.main}
            />
          ) : (
            <AlertCircleIcon
              size={22}
              strokeWidth={2.4}
              color={theme.palette.danger.text}
            />
          )}
        </Box>

        <Typography
          sx={{
            fontSize: scaledPx(13.5),
            fontWeight: 600,
            color: theme.palette.text.primary,
            textAlign: 'center',
          }}
        >
          {ok ? 'Export complete' : 'Export failed'}
        </Typography>

        {ok && (
          <>
            <Typography
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.captionSm),
                color: theme.palette.text.secondary,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              {count} {count === 1 ? 'cheatsheet was' : 'cheatsheets were'}{' '}
              written to disk
            </Typography>
            <Box
              sx={{
                fontFamily: FONT_CODE,
                fontSize: scaledPx(theme.custom.fontSize.hint),
                color: theme.palette.text.primary,
                background: isDark ? 'rgba(0,0,0,0.30)' : 'rgba(0,0,0,0.04)',
                border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)'}`,
                borderRadius: '6px',
                padding: '6px 10px',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                alignSelf: 'stretch',
                textAlign: 'center',
              }}
            >
              {path}
            </Box>
          </>
        )}

        <Box
          component='button'
          onClick={onClose}
          sx={{
            marginTop: '4px',
            background: accentSolid,
            color: theme.palette.onAccent,
            border: 'none',
            borderRadius: '7px',
            padding: '6px 22px',
            fontFamily: theme.typography.fontFamily,
            fontSize: scaledPx(theme.custom.fontSize.dialogMessage),
            fontWeight: 600,
            cursor: 'pointer',
            alignSelf: 'stretch',
            transition: 'filter 0.14s',
            '&:hover': { filter: 'brightness(1.08)' },
          }}
        >
          OK
        </Box>
      </Box>
    </Box>
  )
}

export default function ExportPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accentSolid = theme.palette.accent.main

  const [sheets, setSheets] = useState<SheetInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<ResultKind | null>(null)
  const [savedPath, setSavedPath] = useState('')
  const [exporting, setExporting] = useState(false)

  const selectedSheets = sheets.filter((s) => s.checked)
  const total = sheets.length
  const allOn = selectedSheets.length === total && total > 0
  const noneOn = selectedSheets.length === 0
  const indeterm = !allOn && !noneOn

  useEffect(() => {
    ;(async () => {
      try {
        const response = await invoke<string>(CheatSheetAPI.GET_CHEAT_TITLES)
        debug(`[export] GET_CHEAT_TITLES response=${response}`)
        const parsed: CheatSheetTitleData = JSON.parse(response)
        setSheets(
          (parsed.title ?? []).map((t) => ({ title: t, checked: true })),
        )
      } catch (e) {
        logError(`[export] Failed to load titles: ${e}`)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Esc で Cancel と同じ動作（ウィンドウを閉じる）をする
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // IME 変換中の Esc（変換キャンセル）ではウィンドウを閉じない
      if (e.key === 'Escape' && !e.isComposing) {
        e.preventDefault()
        void getCurrentWindow().close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const toggleAll = useCallback(() => {
    const next = !allOn
    setSheets((prev) => prev.map((s) => ({ ...s, checked: next })))
  }, [allOn])

  const toggleOne = useCallback((title: string) => {
    setSheets((prev) =>
      prev.map((s) => (s.title === title ? { ...s, checked: !s.checked } : s)),
    )
  }, [])

  const onExport = async () => {
    if (noneOn || exporting) return
    setExporting(true)
    try {
      const path = await save({
        defaultPath: 'right-cheat-export.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (!path) {
        setExporting(false)
        return
      }
      await invoke(CheatSheetAPI.EXPORT_TO_JSON, {
        jsonPath: path,
        titles: selectedSheets.map((s) => s.title),
      })
      setSavedPath(path)
      setResult('success')
    } catch (e) {
      logError(`[export] export_to_json error: ${e}`)
      setResult('error')
    } finally {
      setExporting(false)
    }
  }

  const onClose = async () => {
    await getCurrentWindow().close()
  }

  const panelBorder = isDark
    ? 'rgba(255,255,255,0.10)'
    : 'rgba(255,255,255,0.75)'
  const divider = theme.palette.divider

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
      <WindowTitleBar title='Export Cheatsheets' />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: `calc(100vh - ${TITLEBAR_HEIGHT}px)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Select-all toggle row */}
        <Box
          onClick={toggleAll}
          sx={{
            margin: '14px 14px 0',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: isDark
              ? 'rgba(255,255,255,0.035)'
              : 'rgba(255,255,255,0.45)',
            border: `0.5px solid ${panelBorder}`,
            borderRadius: '8px',
            boxShadow: isDark ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.6)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <ExportCheckbox
            checked={allOn}
            indeterminate={indeterm}
            onChange={toggleAll}
          />
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
            }}
          >
            <Typography
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.dialogMessage),
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
              {allOn ? 'Deselect All' : 'Select All'}
            </Typography>
            <Typography
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.hint),
                color: theme.palette.text.secondary,
              }}
            >
              {selectedSheets.length} of {total} selected
            </Typography>
          </Box>
          {/* count pill */}
          <Box
            sx={{
              fontFamily: FONT_CODE,
              fontSize: scaledPx(10),
              color: noneOn ? theme.palette.text.disabled : accentSolid,
              background: noneOn
                ? theme.palette.surface.hover
                : alpha(theme.palette.accent.main, isDark ? 0.12 : 0.1),
              border: `0.5px solid ${
                noneOn
                  ? theme.palette.divider
                  : alpha(theme.palette.accent.main, isDark ? 0.28 : 0.22)
              }`,
              padding: '2px 8px',
              borderRadius: '999px',
              letterSpacing: '0.04em',
              transition: 'all 0.14s',
            }}
          >
            {selectedSheets.length}
          </Box>
        </Box>

        {/* Cheatsheet list */}
        <Box
          sx={{
            margin: '10px 14px 0',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: isDark
              ? 'rgba(255,255,255,0.12) transparent'
              : 'rgba(0,0,0,0.12) transparent',
            border: `0.5px solid ${panelBorder}`,
            borderRadius: '8px',
            background: isDark ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.25)',
            boxShadow: isDark ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        >
          {loading ? (
            <Typography
              sx={{
                padding: '16px',
                fontSize: scaledPx(theme.custom.fontSize.body),
                color: theme.palette.text.secondary,
              }}
            >
              Loading...
            </Typography>
          ) : sheets.length === 0 ? (
            <Typography
              sx={{
                padding: '16px',
                fontSize: scaledPx(theme.custom.fontSize.body),
                color: theme.palette.text.secondary,
              }}
            >
              No cheat sheets
            </Typography>
          ) : (
            sheets.map((s, i) => (
              <ExportRow
                key={s.title}
                sheet={s}
                onToggle={() => toggleOne(s.title)}
                isLast={i === sheets.length - 1}
              />
            ))
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            flexShrink: 0,
            borderTop: `0.5px solid ${divider}`,
            padding: '10px 16px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            background: theme.palette.ui.footerBg,
          }}
        >
          {/* Summary text */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '18px',
            }}
          >
            <FileIcon
              size={12}
              style={{
                color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)',
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.captionSm),
                color: theme.palette.text.secondary,
              }}
            >
              {noneOn ? (
                <Box
                  component='span'
                  sx={{
                    color: isDark
                      ? 'rgba(255,255,255,0.25)'
                      : 'rgba(0,0,0,0.28)',
                  }}
                >
                  Select at least one cheatsheet
                </Box>
              ) : (
                <>
                  <Box
                    component='strong'
                    sx={{ color: theme.palette.text.primary, fontWeight: 600 }}
                  >
                    {selectedSheets.length}
                  </Box>
                  {selectedSheets.length === 1 ? ' cheatsheet' : ' cheatsheets'}
                </>
              )}
            </Typography>
          </Box>

          {/* Buttons */}
          <Box sx={{ display: 'flex', gap: '8px' }}>
            <FooterButton onClick={onClose}>Cancel</FooterButton>
            <FooterButton
              onClick={onExport}
              primary
              disabled={noneOn || exporting}
            >
              <Box
                component='span'
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <UploadIcon size={11} strokeWidth={2.4} />
                {exporting ? 'Exporting...' : 'Export'}
              </Box>
            </FooterButton>
          </Box>
        </Box>

        {/* Result modal */}
        {result && (
          <ResultModal
            kind={result}
            path={savedPath}
            count={selectedSheets.length}
            onClose={async () => {
              setResult(null)
              if (result === 'success') {
                await onClose()
              }
            }}
          />
        )}
      </Box>
    </>
  )
}
