'use client'
import { Box, TextField } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useEffect, useRef, useState } from 'react'

import { EditDialog } from '@/components/molecules/EditDialog'
import { FooterButton } from '@/components/molecules/FooterButton'
import { EditGroupData } from '@/types/edit/EditBlock'

type Props = {
  group: EditGroupData | null
  isNew: boolean
  onSave: (name: string) => void
  onCancel: () => void
}

export function GroupEditDialog({ group, isNew, onSave, onCancel }: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [name, setName] = useState(group?.group ?? '')
  const canSave = name.trim().length > 0
  const title = isNew ? 'Add Group' : 'Rename Group'

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
      if (e.key === 'Enter' && name.trim().length > 0 && !e.isComposing) {
        e.stopPropagation()
        onSave(name.trim())
      }
    }
    document.addEventListener('keydown', h, true)
    return () => document.removeEventListener('keydown', h, true)
  }, [name, onCancel, onSave])

  return (
    <EditDialog width={400} onClose={onCancel}>
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
      <Box sx={{ p: '16px 18px 4px' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <Box
            sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary' }}
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
        <FooterButton
          primary
          disabled={!canSave}
          onClick={() => onSave(name.trim())}
        >
          Save
        </FooterButton>
      </Box>
    </EditDialog>
  )
}
