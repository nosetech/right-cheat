'use client'
import { useCallback, useEffect, useState } from 'react'

import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { save } from '@tauri-apps/plugin-dialog'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import { FooterButton } from '@/components/molecules/FooterButton'
import { WindowTitleBar } from '@/components/molecules/WindowTitleBar'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
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
  const accentSolid = isDark ? '#64b4ff' : '#0071e3'
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
            ? `0 0 0 6px ${isDark ? 'rgba(100,180,255,0.10)' : 'rgba(0,113,227,0.10)'}`
            : `0 0 0 6px ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,113,227,0.06)'}`,
          borderColor: active
            ? accentSolid
            : isDark
              ? 'rgba(255,255,255,0.55)'
              : 'rgba(0,0,0,0.55)',
        },
      }}
    >
      {indeterminate ? (
        <svg
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          viewBox='0 0 24 24'
          fill='none'
          stroke='#fff'
          strokeWidth='3.5'
          strokeLinecap='round'
        >
          <line x1='5' y1='12' x2='19' y2='12' />
        </svg>
      ) : checked ? (
        <svg
          width={Math.round(size * 0.7)}
          height={Math.round(size * 0.7)}
          viewBox='0 0 24 24'
          fill='none'
          stroke='#fff'
          strokeWidth='3.2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <polyline points='20 6 9 17 4 12' />
        </svg>
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
          background: isDark
            ? 'rgba(255,255,255,0.045)'
            : 'rgba(255,255,255,0.55)',
        },
      }}
    >
      <ExportCheckbox checked={sheet.checked} onChange={onToggle} size={16} />
      <Typography
        sx={{
          flex: 1,
          minWidth: 0,
          fontSize: '13px',
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
  const accentSolid = isDark ? '#64b4ff' : '#0071e3'

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
            <svg
              width='22'
              height='22'
              viewBox='0 0 24 24'
              fill='none'
              stroke={isDark ? '#3ddc97' : '#1a9a5c'}
              strokeWidth='2.6'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <polyline points='20 6 9 17 4 12' />
            </svg>
          ) : (
            <svg
              width='22'
              height='22'
              viewBox='0 0 24 24'
              fill='none'
              stroke='#ff6b6b'
              strokeWidth='2.4'
              strokeLinecap='round'
            >
              <circle cx='12' cy='12' r='10' />
              <line x1='12' y1='8' x2='12' y2='13' />
              <line x1='12' y1='16.5' x2='12.01' y2='16.5' />
            </svg>
          )}
        </Box>

        <Typography
          sx={{
            fontSize: '13.5px',
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
                fontSize: '11px',
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
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: '10.5px',
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
            color: '#fff',
            border: 'none',
            borderRadius: '7px',
            padding: '6px 22px',
            fontFamily: theme.typography.fontFamily,
            fontSize: '12.5px',
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
  const accentSolid = isDark ? '#64b4ff' : '#0071e3'

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
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'

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
                fontSize: '12.5px',
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
              {allOn ? 'Deselect All' : 'Select All'}
            </Typography>
            <Typography
              sx={{ fontSize: '10.5px', color: theme.palette.text.secondary }}
            >
              {selectedSheets.length} of {total} selected
            </Typography>
          </Box>
          {/* count pill */}
          <Box
            sx={{
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: '10px',
              color: noneOn
                ? isDark
                  ? 'rgba(255,255,255,0.25)'
                  : 'rgba(0,0,0,0.28)'
                : accentSolid,
              background: noneOn
                ? isDark
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(0,0,0,0.05)'
                : isDark
                  ? 'rgba(100,180,255,0.12)'
                  : 'rgba(0,113,227,0.10)',
              border: `0.5px solid ${
                noneOn
                  ? isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.06)'
                  : isDark
                    ? 'rgba(100,180,255,0.28)'
                    : 'rgba(0,113,227,0.22)'
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
                fontSize: '12px',
                color: theme.palette.text.secondary,
              }}
            >
              Loading...
            </Typography>
          ) : sheets.length === 0 ? (
            <Typography
              sx={{
                padding: '16px',
                fontSize: '12px',
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
            background: isDark
              ? 'rgba(255,255,255,0.018)'
              : 'rgba(255,255,255,0.30)',
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
            <svg
              width='12'
              height='12'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              style={{
                color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)',
                flexShrink: 0,
              }}
            >
              <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
              <polyline points='14 2 14 8 20 8' />
            </svg>
            <Typography
              sx={{ fontSize: '11px', color: theme.palette.text.secondary }}
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
                <svg
                  width='11'
                  height='11'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.4'
                >
                  <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
                  <polyline points='17 8 12 3 7 8' />
                  <line x1='12' y1='3' x2='12' y2='15' />
                </svg>
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
