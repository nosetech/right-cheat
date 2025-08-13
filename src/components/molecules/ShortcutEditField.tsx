'use client'

import { EditButton } from '@/components/atoms/EditButton'
import { SettingsButton } from '@/components/atoms/SettingsButton'
import { grey } from '@/theme/color'
import { ShortcutDef } from '@/types/api/GlobalShortcut'
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useEffect, useState } from 'react'

export type ShortcutEditFieldProps = {
  shortcutName: string
  shortcut: ShortcutDef
  callback: (
    ctrlKey: boolean,
    optionKey: boolean,
    commandKey: boolean,
    hotKey: string,
  ) => void
}

export const ShortcutEditField = (props: ShortcutEditFieldProps) => {
  const { shortcutName, shortcut, callback, ...remainProps } = props

  const theme = useTheme()

  const [ctrlKey, setCtrlKey] = useState<boolean>(shortcut.ctrl)
  const [optionKey, setOptionKey] = useState<boolean>(shortcut.option)
  const [commandKey, setCommandKey] = useState<boolean>(shortcut.command)
  const [hotKey, setHotKey] = useState<string>(shortcut.hotkey)
  const [valid, setValid] = useState<boolean>(true)

  const [editMode, setEditMode] = useState<boolean>(false)

  useEffect(() => {
    setCtrlKey(shortcut.ctrl)
    setOptionKey(shortcut.option)
    setCommandKey(shortcut.command)
    setHotKey(shortcut.hotkey)
  }, [shortcut])

  const onSettingsClick = () => {
    setEditMode(true)
  }

  const onEditClick = () => {
    if (ctrlKey || optionKey || commandKey) {
      setValid(true)
      callback(ctrlKey, optionKey, commandKey, hotKey)
      setEditMode(false)
    } else {
      setValid(false)
    }
  }

  const getShortcutStr = () => {
    let shortcutStr = ctrlKey ? '^ ' : ''
    shortcutStr += optionKey ? '⌥ ' : ''
    shortcutStr += commandKey ? '⌘ ' : ''
    shortcutStr += hotKey

    return shortcutStr
  }

  const handleCtrlKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCtrlKey(event.target.checked)
  }

  const handleOptionKeyChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setOptionKey(event.target.checked)
  }

  const handleCommandKeyChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setCommandKey(event.target.checked)
  }

  const handleHotKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // 数字もしくはアルファベットのみ入力可能にする。アルファベットは大文字に揃える。
    if (!isNaN(Number(event.key))) {
      setHotKey(event.key)
    } else if (/^[a-zA-Z]$/.test(event.key)) {
      setHotKey(event.key.toUpperCase())
    }
  }

  return (
    <Stack>
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
                <Typography variant='body1'>{getShortcutStr()}</Typography>
              </Box>
              <SettingsButton onClick={onSettingsClick} size='small' />
            </>
          ) : (
            <>
              <FormGroup row={true}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={ctrlKey}
                      onChange={handleCtrlKeyChange}
                    />
                  }
                  label='^'
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={optionKey}
                      onChange={handleOptionKeyChange}
                    />
                  }
                  label='⌥'
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={commandKey}
                      onChange={handleCommandKeyChange}
                    />
                  }
                  label='⌘'
                />
              </FormGroup>
              <Box width='60px'>
                <TextField
                  size='small'
                  variant='outlined'
                  label='hotkey'
                  value={hotKey}
                  onKeyDown={handleHotKeyDown}
                />
              </Box>
              <EditButton onClick={onEditClick} size='small' />
            </>
          )}
        </Stack>
      </Stack>
      {editMode == true && valid == false && (
        <Typography variant='body1' color={theme.palette.alert.main}>
          ^ ⌥ ⌘ のいずれか1つはチェックしてください。
        </Typography>
      )}
    </Stack>
  )
}
