'use client'

import { useEffect } from 'react'

import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'

import { Event } from '@/common'
import { CheatSheet } from '@/components/organisms/CheatSheet'

export default function Home() {
  useEffect(() => {
    listen<{}>(Event.WINDOW_VISIABLE_TOGGLE, () => {
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
