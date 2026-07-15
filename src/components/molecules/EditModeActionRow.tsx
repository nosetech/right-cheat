'use client'
import { scaledPx } from '@/utils/css'
import { Box, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { FooterButton } from '@/components/molecules/FooterButton'

type Props = {
  editDirty: boolean
  isSaving: boolean
  onCancel: () => void
  onSave: () => void
}

/**
 * 編集モードフッターの Cancel / Save 行。
 * 変更状態表示（Unsaved changes / No changes）と Cancel / Save ボタンを
 * EditModeFooter と ClipboardHistoryFooter で共有する。
 */
export function EditModeActionRow({
  editDirty,
  isSaving,
  onCancel,
  onSave,
}: Props) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          minHeight: '18px',
        }}
      >
        {editDirty ? (
          <Box
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.captionSm),
              color: 'text.secondary',
              fontStyle: 'italic',
            }}
          >
            Unsaved changes
          </Box>
        ) : (
          <Box
            sx={{
              fontSize: scaledPx(theme.custom.fontSize.captionSm),
              color: 'text.disabled',
            }}
          >
            No changes
          </Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {isSaving && <CircularProgress size={14} />}
        <FooterButton onClick={onCancel} disabled={isSaving}>
          Cancel
        </FooterButton>
        <FooterButton
          primary
          disabled={!editDirty || isSaving}
          onClick={onSave}
        >
          Save
        </FooterButton>
      </Box>
    </Box>
  )
}
