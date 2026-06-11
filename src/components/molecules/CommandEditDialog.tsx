'use client'
import { Box, MenuItem, Select, TextField } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useEffect, useRef, useState } from 'react'

import { EditDialog } from '@/components/molecules/EditDialog'
import { FooterButton } from '@/components/molecules/FooterButton'
import { CommandLayout } from '@/types/api/CheatSheet'
import { EditCommandData, GroupOption } from '@/types/edit/EditBlock'

export type CommandDialogSaveData = {
  description: string
  commandText: string
  key: string
  layout: string
  targetGroupEditId: string | null
}

type Props = {
  kind: 'command' | 'shortcut'
  item: EditCommandData | null
  initialGroupEditId: string | null
  groups: GroupOption[]
  isNew: boolean
  onSave: (data: CommandDialogSaveData) => void
  onCancel: () => void
}

const LAYOUT_OPTIONS: { value: string; label: string }[] = [
  { value: 'inherit', label: 'Inherit (sheet default)' },
  { value: 'inline', label: 'inline' },
  { value: 'stacked', label: 'stacked' },
  { value: 'command_only', label: 'command_only' },
]

export function CommandEditDialog({
  kind,
  item,
  initialGroupEditId,
  groups,
  isNew,
  onSave,
  onCancel,
}: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const isShortcut = kind === 'shortcut'

  const [groupEditId, setGroupEditId] = useState<string>(
    initialGroupEditId ?? '',
  )
  const [description, setDescription] = useState(item?.description ?? '')
  const [commandText, setCommandText] = useState(
    isShortcut ? '' : (item?.command ?? ''),
  )
  const [key, setKey] = useState(isShortcut ? (item?.command ?? '') : '')
  const [layout, setLayout] = useState<string>(
    !isShortcut && item?.layout ? item.layout : 'inherit',
  )

  const descRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setTimeout(() => descRef.current?.focus(), 80)
  }, [])

  // Esc でキャンセル（編集モードは維持）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
    }
    document.addEventListener('keydown', h, true)
    return () => document.removeEventListener('keydown', h, true)
  }, [onCancel])

  const canSave = isShortcut
    ? key.trim().length > 0
    : commandText.trim().length > 0
  const title = isShortcut
    ? isNew
      ? 'Add Shortcut'
      : 'Edit Shortcut'
    : isNew
      ? 'Add Command'
      : 'Edit Command'

  const handleSave = () => {
    if (!canSave) return
    onSave({
      description,
      commandText,
      key,
      layout,
      targetGroupEditId: groupEditId || null,
    })
  }

  return (
    <EditDialog width={460} onClose={onCancel}>
      {/* ヘッダー */}
      <Box
        sx={{
          px: '18px',
          pt: '16px',
          pb: '12px',
          borderBottom: `0.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <Box sx={{ fontSize: '14px', fontWeight: 600, color: 'text.primary' }}>
          {title}
        </Box>
      </Box>

      {/* フォーム */}
      <Box
        sx={{
          p: '16px 18px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Group */}
        <FieldRow label='Group'>
          <Select
            value={groupEditId}
            onChange={(e) => setGroupEditId(e.target.value)}
            size='small'
            sx={{ fontSize: '13px' }}
            displayEmpty
          >
            <MenuItem value=''>
              <em>None — Top level</em>
            </MenuItem>
            {groups.map((g) => (
              <MenuItem key={g.editId} value={g.editId}>
                {g.name}
              </MenuItem>
            ))}
          </Select>
        </FieldRow>

        {/* Description */}
        <FieldRow label='Description'>
          <TextField
            inputRef={descRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isShortcut
                ? 'e.g. Move to next completion candidate'
                : 'e.g. Show trade history'
            }
            size='small'
            fullWidth
            sx={{ fontSize: '13px' }}
          />
        </FieldRow>

        {/* Key (shortcut) or Command (command) */}
        {isShortcut ? (
          <FieldRow
            label='Key'
            hint='Single keystroke or sequence (e.g. ^p, K, ⌘F).'
          >
            <TextField
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder='e.g. ^p'
              size='small'
              fullWidth
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSave && !e.nativeEvent.isComposing)
                  handleSave()
              }}
            />
          </FieldRow>
        ) : (
          <>
            <FieldRow label='Command' hint='Multi-line allowed.'>
              <TextField
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                placeholder='e.g. python -m tool.collect trade list'
                multiline
                rows={5}
                fullWidth
                sx={{
                  '& textarea': {
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    fontSize: '12px',
                  },
                }}
              />
            </FieldRow>
            <FieldRow label='Layout'>
              <Select
                value={layout}
                onChange={(e) => setLayout(e.target.value as CommandLayout)}
                size='small'
                sx={{ fontSize: '13px' }}
              >
                {LAYOUT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FieldRow>
          </>
        )}
      </Box>

      {/* フッター */}
      <Box
        sx={{
          p: '12px 16px 14px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          background: isDark
            ? 'rgba(255,255,255,0.018)'
            : 'rgba(255,255,255,0.30)',
          borderTop: `0.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <FooterButton onClick={onCancel}>Cancel</FooterButton>
        <FooterButton primary disabled={!canSave} onClick={handleSave}>
          Save
        </FooterButton>
      </Box>
    </EditDialog>
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
          fontSize: '11px',
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
            fontSize: '10.5px',
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
