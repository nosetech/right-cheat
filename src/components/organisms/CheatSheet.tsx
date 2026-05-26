'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

import PushPin from '@mui/icons-material/PushPin'
import PushPinOutlined from '@mui/icons-material/PushPinOutlined'
import { Alert, Box, Grid, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Stack } from '@mui/system'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { debug } from '@tauri-apps/plugin-log'

import { Event } from '@/common'
import { CommandField } from '@/components/molecules/CommandField'
import { CommandFieldGroup } from '@/components/molecules/CommandFieldGroup'
import {
  SheetSwitchButton,
  SheetSwitchButtonHandle,
} from '@/components/molecules/SheetSwitchButton'
import { ShortcutField } from '@/components/molecules/ShortcutField'
import { ShortcutGroup } from '@/components/molecules/ShortcutGroup'
import { WindowTitleBar } from '@/components/molecules/WindowTitleBar'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { useCheatSheetLoader } from '@/hooks/useCheatSheetLoader'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useWindowSize } from '@/hooks/useWindowSize'
import {
  CheatSheetAPI,
  CheatSheetData,
  CheatSheetTitleData,
  CommandListItem,
  isCommandGroupData,
} from '@/types/api/CheatSheet'

export const CheatSheet = () => {
  const [cheatSheetTitles, setCheatSheetTitles] = useState<
    CheatSheetTitleData | undefined
  >()
  const [selectCheatSheet, setCheatSheet] = useState<string>('')

  const [cheatSheetData, setCheatSheetData] = useState<CheatSheetData>()
  const [errorMessage, setErrorMessage] = useState<string>()

  const [reloading, setReloading] = useState<boolean>(false)

  const theme = useTheme()

  const { isPinned, togglePin } = useWindowSize(selectCheatSheet)

  const commandFieldRefs = useRef<Array<HTMLDivElement | null>>([])
  const pinButtonRef = useRef<HTMLButtonElement>(null)
  const sheetSwitchRef = useRef<SheetSwitchButtonHandle>(null)

  const { loadCheatSheetTitles, loadCheatSheetData } = useCheatSheetLoader({
    setCheatSheetTitles,
    setCheatSheet,
    setErrorMessage,
  })

  useEffect(() => {
    let cancelled = false
    let unlisten: (() => void) | undefined
    ;(async () => {
      unlisten = await listen<{}>(Event.RELOAD_CHEAT_SHEET, () => {
        ;(async () => {
          setReloading(true)
          setCheatSheet('')
          await loadCheatSheetTitles()
          setReloading(false)
        })()
      })
      if (cancelled) {
        unlisten()
        unlisten = undefined
        return
      }

      await invoke<string>(CheatSheetAPI.RELOAD_CHEAT_SHEET).then(
        (response) => {
          debug(
            `[CheatSheet] Reload cheat sheet: '${CheatSheetAPI.RELOAD_CHEAT_SHEET}' response=${response}`,
          )
        },
      )

      await loadCheatSheetTitles()
    })()

    return () => {
      cancelled = true
      unlisten?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCheatSheetTitles])

  useEffect(() => {
    ;(async () => {
      if (selectCheatSheet !== '') {
        const data = await loadCheatSheetData(selectCheatSheet)
        setCheatSheetData(data)
      } else {
        setCheatSheetData(undefined)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectCheatSheet, loadCheatSheetData])

  const isKeyboardShortcutEnabled = cheatSheetData?.type !== 'shortcut'

  const flatCommandCount = useMemo(() => {
    if (!cheatSheetData || cheatSheetData.type === 'shortcut') return 0
    return cheatSheetData.commandlist.reduce(
      (acc, item) =>
        acc + (isCommandGroupData(item) ? item.commandlist.length : 1),
      0,
    )
  }, [cheatSheetData])

  const flatStartIndices = useMemo(() => {
    if (!cheatSheetData) return []
    let acc = 0
    return cheatSheetData.commandlist.map((item) => {
      const start = acc
      acc += isCommandGroupData(item) ? item.commandlist.length : 1
      return start
    })
  }, [cheatSheetData])

  useKeyboardShortcuts({
    onPKey: async () => {
      if (selectCheatSheet) {
        await togglePin()
        pinButtonRef.current?.focus()
      }
    },
    onNumberKey: (index) => {
      if (isKeyboardShortcutEnabled && index < flatCommandCount) {
        const targetElement = commandFieldRefs.current[index]
        if (targetElement) {
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
      sheetSwitchRef.current?.open()
      debug('[CheatSheet] 0 key: opened sheet switch dropdown')
    },
  })

  return (
    <>
      {/* ドラッグ領域（透明） */}
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
      {/* 視覚タイトルバー */}
      <WindowTitleBar
        title={selectCheatSheet || 'RightCheat'}
        rightControls={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SheetSwitchButton
              ref={sheetSwitchRef}
              titles={cheatSheetTitles?.title ?? []}
              selected={selectCheatSheet}
              onSelect={(value) => setCheatSheet(value)}
            />
            <IconButton
              ref={pinButtonRef}
              onClick={selectCheatSheet ? togglePin : undefined}
              size='small'
              disabled={!selectCheatSheet}
              title={isPinned ? 'Unpin (p)' : 'Pin (p)'}
              sx={{
                opacity: selectCheatSheet ? 1 : 0.3,
                color: isPinned
                  ? theme.palette.accent.main
                  : theme.palette.text.disabled,
                p: '4px',
              }}
            >
              {isPinned ? (
                <PushPin sx={{ fontSize: 13 }} />
              ) : (
                <PushPinOutlined sx={{ fontSize: 13 }} />
              )}
            </IconButton>
          </Box>
        }
      />
      {/* メインコンテンツ */}
      <Stack padding={1} sx={{ position: 'relative' }}>
        {errorMessage ? (
          <Alert
            severity='error'
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {errorMessage}
          </Alert>
        ) : reloading === false &&
          cheatSheetTitles !== undefined &&
          cheatSheetTitles.title.length === 0 ? (
          <Alert severity='info'>
            No cheat sheets registered.
            <br />
            Use [File] - [Import from JSON...] to import a cheat sheet.
          </Alert>
        ) : (
          <>
            {cheatSheetData?.type === 'shortcut' ? (
              <Grid container spacing={1} p={1} width='100%'>
                {cheatSheetData?.commandlist.map(
                  (item: CommandListItem, index) => {
                    if (isCommandGroupData(item)) {
                      return (
                        <Grid key={index} size={{ xs: 12 }}>
                          <ShortcutGroup
                            group={item.group}
                            commandlist={item.commandlist}
                          />
                        </Grid>
                      )
                    }
                    return (
                      <Grid key={index} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                        <ShortcutField
                          m={0.5}
                          description={item.description ?? ''}
                          command={item.command}
                        />
                      </Grid>
                    )
                  },
                )}
              </Grid>
            ) : (
              <Stack paddingY={1} spacing={1} width='100%'>
                {cheatSheetData?.commandlist.map(
                  (item: CommandListItem, index) => {
                    const flatIndex = flatStartIndices[index]
                    const mode =
                      cheatSheetData.type === 'application' ? 'execute' : 'copy'
                    if (isCommandGroupData(item)) {
                      return (
                        <Box key={index} pt={1}>
                          <CommandFieldGroup
                            key={index}
                            group={item.group}
                            commandlist={item.commandlist}
                            startIndex={flatIndex}
                            mode={mode}
                            cheatSheetLayout={cheatSheetData.layout}
                            commandFieldRefs={commandFieldRefs}
                          />
                        </Box>
                      )
                    }
                    return (
                      <CommandField
                        key={index}
                        ref={(el) => {
                          commandFieldRefs.current[flatIndex] = el
                        }}
                        description={item.description}
                        command={item.command}
                        numberHint={
                          flatIndex < 9 ? (flatIndex + 1).toString() : undefined
                        }
                        mode={mode}
                        layout={
                          item.layout ?? cheatSheetData.layout ?? 'inline'
                        }
                      />
                    )
                  },
                )}
              </Stack>
            )}
          </>
        )}
      </Stack>
    </>
  )
}
