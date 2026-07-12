'use client'
import { scaledPx } from '@/utils/css'
import { Box, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { AddRowButton } from '@/components/atoms/AddRowButton'
import { SaveIcon } from '@/components/atoms/icons'
import { FooterButton } from '@/components/molecules/FooterButton'

type Props = {
  isShortcuts: boolean
  editDirty: boolean
  isSaving: boolean
  onAddCommand: () => void
  onAddGroup: () => void
  onCancel: () => void
  onSave: () => void
}

export function EditModeFooter({
  isShortcuts,
  editDirty,
  isSaving,
  onAddCommand,
  onAddGroup,
  onCancel,
  onSave,
}: Props) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        flexShrink: 0,
        borderTop: `0.5px solid ${theme.palette.divider}`,
        background: theme.palette.ui.footerBg,
      }}
    >
      {/* Add ボタン行 */}
      <Box sx={{ p: '10px 12px 8px', display: 'flex', gap: '6px' }}>
        <AddRowButton
          label={isShortcuts ? 'Add shortcut' : 'Add command'}
          onClick={onAddCommand}
        />
        <AddRowButton
          label='Add group'
          onClick={onAddGroup}
          icon={<SaveIcon />}
        />
      </Box>

      {/* Cancel/Save 行 */}
      <Box
        sx={{
          borderTop: `0.5px solid ${theme.palette.divider}`,
          p: '10px 14px 12px',
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
    </Box>
  )
}
