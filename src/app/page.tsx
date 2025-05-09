'use client'

import { CheatSheet } from '@/components/organisms/CheatSheet'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    listen<{}>('window_visible_change', () => {
      ;(async () => {
        changeWindowVisible()
      })()
    })
  }, [])

  const changeWindowVisible = async () => {
    const window = getCurrentWindow()
    if (await window.isVisible()) {
      window.hide()
    } else {
      window.show()
      window.setFocus()
    }
  }

  return <CheatSheet />
}
