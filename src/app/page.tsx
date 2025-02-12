'use client'
import { TextFieldWithClipboard } from '@/components/molecules/TextFieldWithClipboard'
import { Box, Stack } from '@mui/system'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { register } from '@tauri-apps/plugin-global-shortcut'
import styles from './page.module.css'

export default function Home() {
  const command = 'terraform plan'

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
          <TextFieldWithClipboard value={command} />
        </Box>
      </Stack>
    </main>
  )
}
