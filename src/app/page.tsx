'use client'
import { CommandField } from '@/components/molecules/CommandField'
import { Box, Stack } from '@mui/system'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { register } from '@tauri-apps/plugin-global-shortcut'
import styles from './page.module.css'

export default function Home() {
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
    <main className={styles.main} tabIndex={-1}>
      <Stack alignItems='center' spacing={2} tabIndex={-1}>
        <Box
          width='100%'
          display='flex'
          alignItems='center'
          justifyContent='center'
          sx={{ backgroundColor: '#ffffff' }}
        >
          <Stack spacing={2} width='300px'>
            <CommandField description='planの実行' command='terraforom plan' />
            <CommandField description='planの適用' command='terraform apply' />
            <CommandField
              description='refresh(実環境の内容をTFファイルに反映)の実行'
              command='terraform apply -refresh-only'
            />
            <CommandField
              description='フォーマットの実行'
              command='terraform fmt -recursive'
            />
          </Stack>
        </Box>
      </Stack>
    </main>
  )
}
