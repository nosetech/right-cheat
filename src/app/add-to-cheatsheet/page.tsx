'use client'
import { scaledPx } from '@/utils/css'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Box, MenuItem, Select, TextField } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import { Event } from '@/common'
import {
  WINDOW_ACTION_FOOTER_HEIGHT,
  WindowActionFooter,
} from '@/components/molecules/WindowActionFooter'
import { WindowHeader } from '@/components/molecules/WindowHeader'
import { TYPE_META } from '@/components/organisms/edit-cheatsheets/meta'
import { useNotificationContext } from '@/context/NotificationContext'
import { useWindowCloseShortcuts } from '@/hooks/useWindowCloseShortcuts'
import { FONT_CODE } from '@/theme/fonts'
import {
  CheatSheetAPI,
  CheatSheetData,
  CheatSheetSummary,
  isCommandGroupData,
} from '@/types/api/CheatSheet'

const LAYOUT_OPTIONS: { value: string; label: string }[] = [
  { value: 'inherit', label: 'Inherit (sheet default)' },
  { value: 'inline', label: 'inline' },
  { value: 'stacked', label: 'stacked' },
  { value: 'command_only', label: 'command_only' },
]

type GroupOption = {
  id: number
  name: string
}

/** clipboard_history ウィンドウから受け取る初期化ペイロード */
type AddToCheatSheetInitPayload = {
  text: string
}

/**
 * クリップボード履歴のエントリを既存チートシートのコマンドとして登録する
 * 別ウィンドウ（label: add_to_cheatsheet）。対象は command / application タイプの
 * シートのみ。Add 成功時は clipboard_history ウィンドウへ通知して閉じる。
 */
export default function AddToCheatSheetPage() {
  const theme = useTheme()
  const { showError } = useNotificationContext() ?? {}

  const [initialized, setInitialized] = useState(false)
  const [sheets, setSheets] = useState<CheatSheetSummary[]>([])
  const [sheetTitle, setSheetTitle] = useState('')
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [groupId, setGroupId] = useState('')
  const [description, setDescription] = useState('')
  const [commandText, setCommandText] = useState('')
  const [layout, setLayout] = useState('inherit')
  const [isAdding, setIsAdding] = useState(false)

  const descRef = useRef<HTMLInputElement>(null)

  // clipboard_history ウィンドウから履歴テキストを受け取り、対象シート一覧を取得する
  useEffect(() => {
    const win = getCurrentWebviewWindow()

    const setup = async () => {
      await win.once<AddToCheatSheetInitPayload>(
        Event.ADD_TO_CHEATSHEET_INIT,
        async (event) => {
          setCommandText(event.payload.text)
          try {
            const summaries = await invoke<CheatSheetSummary[]>(
              CheatSheetAPI.LIST_CHEAT_SHEET_SUMMARIES,
            )
            // shortcut シートはコピー可能なコマンドを持たないため対象外
            const targets = summaries.filter((s) => s.sheet_type !== 'shortcut')
            setSheets(targets)
            setSheetTitle(targets[0]?.title ?? '')
          } catch (err) {
            logError(
              `[AddToCheatSheet] Failed to load cheat sheet summaries: ${String(err)}`,
            )
            showError?.('Failed to load cheat sheets')
          }
          setInitialized(true)
          setTimeout(() => descRef.current?.focus(), 80)
        },
      )
      await win.emitTo('clipboard_history', Event.ADD_TO_CHEATSHEET_READY, {})
    }

    setup()
    // マウント時のみ実行する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 対象シートの変更時にグループ一覧を取得する
  useEffect(() => {
    if (!sheetTitle) {
      setGroups([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const response = await invoke<string>(CheatSheetAPI.GET_CHEAT_SHEET, {
          title: sheetTitle,
        })
        if (cancelled) return
        const data: CheatSheetData = JSON.parse(response)
        const groupOptions = (data.commandlist ?? [])
          .filter(isCommandGroupData)
          .filter((g) => g.id !== undefined)
          .map((g) => ({ id: g.id as number, name: g.group }))
        setGroups(groupOptions)
      } catch (err) {
        logError(`[AddToCheatSheet] Failed to load groups: ${String(err)}`)
        setGroups([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sheetTitle])

  const canAdd = sheetTitle !== '' && commandText.trim().length > 0 && !isAdding

  const handleAdd = useCallback(async () => {
    if (!canAdd) return
    setIsAdding(true)
    try {
      await invoke(CheatSheetAPI.ADD_COMMAND, {
        payload: {
          cheatsheet_title: sheetTitle,
          group_id: groupId === '' ? null : Number(groupId),
          description: description.trim() === '' ? null : description.trim(),
          command_text: commandText,
          layout: layout === 'inherit' ? null : layout,
        },
      })
      debug(
        `[AddToCheatSheet] added command to '${sheetTitle}' (group=${groupId || 'none'})`,
      )
      const win = getCurrentWebviewWindow()
      await win.emitTo('clipboard_history', Event.ADD_TO_CHEATSHEET_ADDED, {
        sheetTitle,
      })
      await win.destroy()
    } catch (err) {
      logError(`[AddToCheatSheet] Failed to add command: ${String(err)}`)
      showError?.(
        `Failed to add command: ${err instanceof Error ? err.message : String(err)}`,
      )
      setIsAdding(false)
    }
  }, [canAdd, sheetTitle, groupId, description, commandText, layout, showError])

  const handleCancel = useCallback(async () => {
    await getCurrentWebviewWindow().destroy()
  }, [])

  // Cmd+S で Add / Esc で Cancel（ウィンドウを閉じる）
  useWindowCloseShortcuts({
    onSave: () => void handleAdd(),
    onCancel: () => void handleCancel(),
  })

  if (!initialized) {
    return null
  }

  return (
    <>
      <WindowHeader title='Add to Cheat Sheet' />

      <Box
        sx={{
          px: '18px',
          pt: '12px',
          pb: `${WINDOW_ACTION_FOOTER_HEIGHT + 12}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          overflowY: 'auto',
        }}
      >
        <FieldRow
          label='Cheat Sheet'
          hint='Only Command / Application sheets can receive commands.'
        >
          <Select
            value={sheetTitle}
            onChange={(e) => {
              setSheetTitle(e.target.value)
              setGroupId('')
            }}
            size='small'
            sx={{ fontSize: scaledPx(theme.custom.fontSize.label) }}
            displayEmpty
          >
            {sheets.length === 0 && (
              <MenuItem value='' disabled>
                <em>No available cheat sheets</em>
              </MenuItem>
            )}
            {sheets.map((s) => (
              <MenuItem key={s.id} value={s.title}>
                {s.title} ({TYPE_META[s.sheet_type ?? 'command'].label})
              </MenuItem>
            ))}
          </Select>
        </FieldRow>

        <FieldRow label='Group'>
          <Select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            size='small'
            sx={{ fontSize: scaledPx(theme.custom.fontSize.label) }}
            displayEmpty
          >
            <MenuItem value=''>
              <em>None — Top level</em>
            </MenuItem>
            {groups.map((g) => (
              <MenuItem key={g.id} value={String(g.id)}>
                {g.name}
              </MenuItem>
            ))}
          </Select>
        </FieldRow>

        <FieldRow label='Description'>
          <TextField
            inputRef={descRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='e.g. Show trade history'
            size='small'
            fullWidth
            sx={{ fontSize: scaledPx(theme.custom.fontSize.label) }}
          />
        </FieldRow>

        <FieldRow label='Command' hint='Multi-line allowed.'>
          <TextField
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            multiline
            rows={5}
            fullWidth
            sx={{
              '& textarea': {
                fontFamily: FONT_CODE,
                fontSize: scaledPx(theme.custom.fontSize.body),
              },
            }}
          />
        </FieldRow>

        <FieldRow label='Layout'>
          <Select
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
            size='small'
            sx={{ fontSize: scaledPx(theme.custom.fontSize.label) }}
          >
            {LAYOUT_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FieldRow>
      </Box>

      <WindowActionFooter
        onCancel={handleCancel}
        onSave={handleAdd}
        canSave={canAdd}
        saveLabel='Add'
      />
    </>
  )
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  const theme = useTheme()
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <Box
        sx={{
          fontSize: scaledPx(theme.custom.fontSize.captionSm),
          fontWeight: 600,
          color: 'text.secondary',
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </Box>
      {children}
      {hint && (
        <Box
          sx={{
            fontSize: scaledPx(theme.custom.fontSize.hint),
            color: theme.palette.text.disabled,
            lineHeight: 1.4,
          }}
        >
          {hint}
        </Box>
      )}
    </Box>
  )
}
