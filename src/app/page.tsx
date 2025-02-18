'use client'
import { defaultTheme } from '@/theme/default'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'

import { CommandField } from '@/components/molecules/CommandField'
import { Stack } from '@mui/system'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { register } from '@tauri-apps/plugin-global-shortcut'

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
    <ThemeProvider theme={defaultTheme}>
      <CssBaseline />
      <main>
        <Stack padding={1} spacing={1} width='400px'>
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
      </main>
    </ThemeProvider>
  )
}
