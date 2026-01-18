'use client'

import { useEffect } from 'react'

import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'

import { Event } from '@/common'
import { CheatSheet } from '@/components/organisms/CheatSheet'

const changeWindowVisible = async () => {
  const window = getCurrentWindow()
  if (await window.isVisible()) {
    await window.hide()
  } else {
    await window.show()
    await window.setFocus()
  }
}

export default function Home() {
  useEffect(() => {
    let unlisten: (() => void) | null = null

    const setupListener = async () => {
      // アプリケーション初期化時に一度だけ全スペース表示を設定
      try {
        const window = getCurrentWindow()
        await window.setVisibleOnAllWorkspaces(true)
      } catch (error) {
        console.error('Failed to set visible on all workspaces:', error)
      }

      unlisten = await listen<{}>(Event.WINDOW_VISIABLE_TOGGLE, () => {
        ;(async () => {
          await changeWindowVisible()
        })()
      })
    }

    setupListener()

    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  }, [])

  return <CheatSheet />
}
