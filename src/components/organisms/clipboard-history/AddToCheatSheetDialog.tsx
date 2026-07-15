'use client'
import { scaledPx } from '@/utils/css'
import { useEffect, useRef, useState } from 'react'

import { Box, Dialog, MenuItem, Select, TextField } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import { FooterButton } from '@/components/molecules/FooterButton'
import { TYPE_META } from '@/components/organisms/edit-cheatsheets/meta'
import { useNotificationContext } from '@/context/NotificationContext'
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

type Props = {
  open: boolean
  /** 履歴エントリのテキスト（Command フィールドの初期値） */
  text: string
  onCancel: () => void
  /** 追加成功時に対象シートのタイトルを通知する */
  onAdded: (sheetTitle: string) => void
}

/**
 * クリップボード履歴のエントリを既存チートシートのコマンドとして登録する
 * ダイアログ。対象は command / application タイプのシートのみ。
 */
export function AddToCheatSheetDialog({
  open,
  text,
  onCancel,
  onAdded,
}: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { showError } = useNotificationContext() ?? {}

  const [sheets, setSheets] = useState<CheatSheetSummary[]>([])
  const [sheetTitle, setSheetTitle] = useState('')
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [groupId, setGroupId] = useState('')
  const [description, setDescription] = useState('')
  const [commandText, setCommandText] = useState('')
  const [layout, setLayout] = useState('inherit')
  const [isAdding, setIsAdding] = useState(false)

  const descRef = useRef<HTMLInputElement>(null)

  // ダイアログを開いたときに状態を初期化し、対象シート一覧を取得する
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setDescription('')
    setCommandText(text)
    setLayout('inherit')
    setGroupId('')
    ;(async () => {
      try {
        const summaries = await invoke<CheatSheetSummary[]>(
          CheatSheetAPI.LIST_CHEAT_SHEET_SUMMARIES,
        )
        if (cancelled) return
        // shortcut シートはコピー可能なコマンドを持たないため対象外
        const targets = summaries.filter((s) => s.sheet_type !== 'shortcut')
        setSheets(targets)
        setSheetTitle(targets[0]?.title ?? '')
        setTimeout(() => descRef.current?.focus(), 80)
      } catch (err) {
        logError(
          `[AddToCheatSheetDialog] Failed to load cheat sheet summaries: ${String(err)}`,
        )
        showError?.('Failed to load cheat sheets')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, text, showError])

  // 対象シートの変更時にグループ一覧を取得する
  useEffect(() => {
    if (!open || !sheetTitle) {
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
        logError(
          `[AddToCheatSheetDialog] Failed to load groups: ${String(err)}`,
        )
        setGroups([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, sheetTitle])

  const canAdd = sheetTitle !== '' && commandText.trim().length > 0 && !isAdding

  const handleAdd = async () => {
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
        `[AddToCheatSheetDialog] added command to '${sheetTitle}' (group=${groupId || 'none'})`,
      )
      onAdded(sheetTitle)
    } catch (err) {
      logError(`[AddToCheatSheetDialog] Failed to add command: ${String(err)}`)
      showError?.(
        `Failed to add command: ${err instanceof Error ? err.message : String(err)}`,
      )
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby='add-to-cheatsheet-title'
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: isDark
              ? 'rgba(0,0,10,0.45)'
              : 'rgba(20,30,60,0.28)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          },
        },
        paper: {
          sx: {
            width: 420,
            maxWidth: 'calc(100% - 32px)',
            borderRadius: '14px',
            border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'}`,
            boxShadow: isDark
              ? '0 24px 64px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(255,255,255,0.10)'
              : '0 24px 64px rgba(0,0,50,0.30), 0 0 0 0.5px rgba(255,255,255,0.7)',
            overflow: 'hidden',
            m: 0,
          },
        },
      }}
    >
      {/* タイトル */}
      <Box
        id='add-to-cheatsheet-title'
        sx={{
          p: '16px 18px 0',
          fontSize: scaledPx(theme.custom.fontSize.dialogTitle),
          fontWeight: 600,
          color: 'text.primary',
          letterSpacing: '0.01em',
        }}
      >
        Add to Cheat Sheet
      </Box>

      {/* フィールド */}
      <Box
        sx={{
          p: '14px 18px 16px',
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

      {/* フッター */}
      <Box
        sx={{
          p: '12px 16px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
          background: theme.palette.glass.panel,
          borderTop: `0.5px solid ${theme.palette.divider}`,
        }}
      >
        <FooterButton onClick={onCancel} disabled={isAdding}>
          Cancel
        </FooterButton>
        <FooterButton primary disabled={!canAdd} onClick={handleAdd}>
          Add
        </FooterButton>
      </Box>
    </Dialog>
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
