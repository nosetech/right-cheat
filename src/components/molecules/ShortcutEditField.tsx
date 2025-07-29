'use client'

import { EditButton } from '@/components/atoms/EditButton'
import { SettingsButton } from '@/components/atoms/SettingsButton'
import { grey } from '@/theme/color'
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'

export type ShortcutEditFieldProps = {
  shortcutName: string
}

export const ShortcutEditField = (props: ShortcutEditFieldProps) => {
  const { shortcutName, ...remainProps } = props

  const [editMode, setEditMode] = useState<boolean>(false)

  const onSettingsClick = () => {
    setEditMode(true)
  }

  const onEditClick = () => {
    setEditMode(false)
  }

  return (
    <Stack direction='row' alignItems='center' {...remainProps}>
      <Typography variant='h3'>{shortcutName} : </Typography>
      <Stack
        direction='row'
        height='40px'
        padding={1}
        spacing={1}
        alignItems='center'
      >
        {editMode === false ? (
          <>
            <Box
              p={1}
              sx={{
                border: '1px solid',
                borderRadius: '8px',
                borderColor: grey[300],
              }}
            >
              <Typography variant='body1'>^ ⌥ ⇧ ⌘ R</Typography>
            </Box>
            <SettingsButton onClick={onSettingsClick} size='small' />
          </>
        ) : (
          <>
            <FormGroup row={true}>
              <FormControlLabel control={<Checkbox />} label='^' />
              <FormControlLabel control={<Checkbox />} label='⌥' />
              <FormControlLabel control={<Checkbox />} label='⇧' />
              <FormControlLabel control={<Checkbox />} label='⌘' />
            </FormGroup>
            <Box width='60px'>
              <TextField size='small' variant='outlined' label='hotkey' />
            </Box>
            <EditButton onClick={onEditClick} size='small' />
          </>
        )}
      </Stack>
    </Stack>
  )
}
