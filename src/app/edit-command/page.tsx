'use client'
import { useEffect, useRef, useState } from 'react'

import { Box, MenuItem, Select, TextField } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

import { Event } from '@/common'
import { FooterButton } from '@/components/molecules/FooterButton'
import { WindowTitleBar } from '@/components/molecules/WindowTitleBar'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { CommandLayout } from '@/types/api/CheatSheet'
import {
  EditCommandInitPayload,
  EditCommandSavePayload,
} from '@/types/edit/EditWindow'

const LAYOUT_OPTIONS: { value: string; label: string }[] = [
  { value: 'inherit', label: 'Inherit (sheet default)' },
  { value: 'inline', label: 'inline' },
  { value: 'stacked', label: 'stacked' },
  { value: 'command_only', label: 'command_only' },
]

const FOOTER_HEIGHT = 60

export default function EditCommandPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [initPayload, setInitPayload] = useState<EditCommandInitPayload | null>(
    null,
  )
  const [groupEditId, setGroupEditId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [commandText, setCommandText] = useState('')
  const [key, setKey] = useState('')
  const [layout, setLayout] = useState<string>('inherit')

  const descRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const win = getCurrentWebviewWindow()

    const setup = async () => {
      await win.once<EditCommandInitPayload>(
        Event.EDIT_COMMAND_INIT,
        (event) => {
          const payload = event.payload
          setInitPayload(payload)
          setGroupEditId(payload.initialGroupEditId ?? '')
          setDescription(payload.item?.description ?? '')
          if (payload.kind === 'shortcut') {
            setKey(payload.item?.command ?? '')
            setCommandText('')
          } else {
            setCommandText(payload.item?.command ?? '')
            setKey('')
          }
          setLayout(
            payload.kind !== 'shortcut' && payload.item?.layout
              ? payload.item.layout
              : 'inherit',
          )
          setTimeout(() => descRef.current?.focus(), 80)
        },
      )
      await win.emitTo('main', Event.EDIT_COMMAND_READY, {})
    }

    setup()
  }, [])

  const isShortcut = initPayload?.kind === 'shortcut'
  const isNew = initPayload?.isNew ?? true
  const groups = initPayload?.groups ?? []

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

  const handleSave = async () => {
    if (!canSave || !initPayload) return
    const win = getCurrentWebviewWindow()
    const payload: EditCommandSavePayload = {
      _editId: initPayload.item?._editId ?? crypto.randomUUID(),
      dbId: initPayload.item?.id,
      isNew,
      description,
      commandText,
      key,
      layout,
      targetGroupEditId: groupEditId || null,
    }
    await win.emitTo('main', Event.EDIT_COMMAND_SAVE, payload)
    await win.destroy()
  }

  const handleCancel = async () => {
    await getCurrentWebviewWindow().destroy()
  }

  if (!initPayload) {
    return null
  }

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
      <WindowTitleBar title={title} />

      <Box
        sx={{
          px: '18px',
          pt: '12px',
          pb: `${FOOTER_HEIGHT + 12}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          overflowY: 'auto',
        }}
      >
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

      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${FOOTER_HEIGHT}px`,
          p: '10px 16px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          background: isDark
            ? 'rgba(255,255,255,0.018)'
            : 'rgba(255,255,255,0.30)',
          borderTop: `0.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <FooterButton onClick={handleCancel}>Cancel</FooterButton>
        <FooterButton primary disabled={!canSave} onClick={handleSave}>
          Save
        </FooterButton>
      </Box>
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
