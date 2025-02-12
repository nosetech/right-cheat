'use client'
import { TextFieldWithClipboard } from '@/components/molecules/TextFieldWithClipboard'
import { Box, Stack } from '@mui/system'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { register } from '@tauri-apps/plugin-global-shortcut'
import { useState } from 'react'
import styles from './page.module.css'

export default function Home() {
  const [command, setCommand] = useState<string>('git fetch -p')

  const registerShortcut = async () => {
    await register('Command+Shift+L', (event) => {
      if (event.state === 'Pressed') {
        console.log('Shortcut triggered')
        changeWindowVisible()
      }
    })
  }
  registerShortcut()

  const changeWindowVisible = async () => {
    const window = getCurrentWindow()
    if (await window.isVisible()) {
      window.hide()
    } else {
      window.show()
      window.setFocus()
    }
  }

  return (
    <main className={styles.main}>
      <Stack alignItems='center' spacing={2}>
        <Box
          width='100%'
          display='flex'
          alignItems='center'
          justifyContent='center'
          sx={{ backgroundColor: '#ffffff' }}
        >
          <TextFieldWithClipboard
            value={command}
            clipboardProps={{ value: command, size: 'small' }}
          />
        </Box>
      </Stack>
    </main>
  )
}
