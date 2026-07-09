'use client'
import { scaledPx } from '@/utils/css'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Box, TextField } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

import { Event } from '@/common'
import { FooterButton } from '@/components/molecules/FooterButton'
import { WindowTitleBar } from '@/components/molecules/WindowTitleBar'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { useWindowCloseShortcuts } from '@/hooks/useWindowCloseShortcuts'
import {
  EditGroupInitPayload,
  EditGroupSavePayload,
} from '@/types/edit/EditWindow'

const FOOTER_HEIGHT = 60

export default function EditGroupPage() {
  const theme = useTheme()

  const [initPayload, setInitPayload] = useState<EditGroupInitPayload | null>(
    null,
  )
  const [name, setName] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const win = getCurrentWebviewWindow()

    const setup = async () => {
      await win.once<EditGroupInitPayload>(Event.EDIT_GROUP_INIT, (event) => {
        const payload = event.payload
        setInitPayload(payload)
        setName(payload.group?.group ?? '')
        setTimeout(() => inputRef.current?.focus(), 80)
      })
      await win.emitTo('main', Event.EDIT_GROUP_READY, {})
    }

    setup()
  }, [])

  const isNew = initPayload?.isNew ?? true
  const canSave = name.trim().length > 0
  const title = isNew ? 'Add Group' : 'Rename Group'

  const handleSave = useCallback(async () => {
    if (!canSave || !initPayload) return
    const win = getCurrentWebviewWindow()
    const payload: EditGroupSavePayload = {
      _editId: initPayload.group?._editId ?? crypto.randomUUID(),
      isNew,
      name: name.trim(),
    }
    await win.emitTo('main', Event.EDIT_GROUP_SAVE, payload)
    await win.destroy()
  }, [canSave, initPayload, isNew, name])

  const handleCancel = async () => {
    await getCurrentWebviewWindow().destroy()
  }

  // Cmd+S で Save / Esc で Cancel と同じ動作（ウィンドウを閉じる）をする
  useWindowCloseShortcuts({
    enabled: !!initPayload,
    onSave: () => void handleSave(),
    onCancel: () => void handleCancel(),
  })

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
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <Box
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.captionSm),
              fontWeight: 600,
              color: 'text.secondary',
            }}
          >
            Group Name
          </Box>
          <TextField
            inputRef={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. Inspection Commands'
            size='small'
            fullWidth
          />
        </Box>
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
          background: theme.palette.ui.footerBg,
          borderTop: `0.5px solid ${theme.palette.ui.borderSubtle}`,
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
