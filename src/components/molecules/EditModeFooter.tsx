'use client'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { AddRowButton } from '@/components/atoms/AddRowButton'
import { SaveIcon } from '@/components/atoms/icons'
import { EditModeActionRow } from '@/components/molecules/EditModeActionRow'

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
        }}
      >
        <EditModeActionRow
          editDirty={editDirty}
          isSaving={isSaving}
          onCancel={onCancel}
          onSave={onSave}
        />
      </Box>
    </Box>
  )
}
