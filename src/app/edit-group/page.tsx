'use client'
import { scaledPx } from '@/utils/css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Box, TextField } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

import { Event } from '@/common'
import {
  WINDOW_ACTION_FOOTER_HEIGHT,
  WindowActionFooter,
} from '@/components/molecules/WindowActionFooter'
import { WindowHeader } from '@/components/molecules/WindowHeader'
import { useWindowCloseShortcuts } from '@/hooks/useWindowCloseShortcuts'
import {
  EditGroupInitPayload,
  EditGroupSavePayload,
} from '@/types/edit/EditWindow'

export default function EditGroupPage() {
  const theme = useTheme()

  const [initPayload, setInitPayload] = useState<EditGroupInitPayload | null>(
    null,
  )
  const [name, setName] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  // 呼び出し元チートシートウィンドウのラベル（複数ウィンドウ対応）。
  // クエリパラメータ `parent` で受け取り、READY / SAVE の emit 先に使う。
  // 未指定時は後方互換で 'main'。
  const parentLabel = useMemo(() => {
    if (typeof window === 'undefined') return 'main'
    return new URLSearchParams(window.location.search).get('parent') || 'main'
  }, [])

  useEffect(() => {
    const win = getCurrentWebviewWindow()

    const setup = async () => {
      await win.once<EditGroupInitPayload>(Event.EDIT_GROUP_INIT, (event) => {
        const payload = event.payload
        setInitPayload(payload)
        setName(payload.group?.group ?? '')
        setTimeout(() => inputRef.current?.focus(), 80)
      })
      await win.emitTo(parentLabel, Event.EDIT_GROUP_READY, {})
    }

    setup()
  }, [parentLabel])

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
    await win.emitTo(parentLabel, Event.EDIT_GROUP_SAVE, payload)
    await win.destroy()
  }, [canSave, initPayload, isNew, name, parentLabel])

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
      <WindowHeader title={title} />

      <Box
        sx={{
          px: '18px',
          pt: '12px',
          pb: `${WINDOW_ACTION_FOOTER_HEIGHT + 12}px`,
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

      <WindowActionFooter
        onCancel={handleCancel}
        onSave={handleSave}
        canSave={canSave}
      />
    </>
  )
}
