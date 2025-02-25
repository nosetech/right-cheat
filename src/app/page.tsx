'use client'
import { defaultTheme } from '@/theme/default'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'

import { CheatSheet } from '@/components/organisms/CheatSheet'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { register } from '@tauri-apps/plugin-global-shortcut'

export default function Home() {
  const registerShortcut = async () => {
    await register('Command+Shift+L', (event) => {
      if (event.state === 'Pressed') {
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
        <CheatSheet />
      </main>
    </ThemeProvider>
  )
}
