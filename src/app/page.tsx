'use client'

import { useEffect } from 'react'

import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { error } from '@tauri-apps/plugin-log'

import { Event } from '@/common'
import { CheatSheet } from '@/components/organisms/CheatSheet'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'

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
  const { getVisibleOnAllWorkspacesSettings } = usePreferencesStore()

  useEffect(() => {
    let unlisten: (() => void) | null = null

    const setupListener = async () => {
      // アプリケーション初期化時に設定ファイルから取得した値を使用
      try {
        const window = getCurrentWindow()
        const visibleOnAllWorkspaces = await getVisibleOnAllWorkspacesSettings()
        await window.setVisibleOnAllWorkspaces(visibleOnAllWorkspaces)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        error(`[page] Failed to set visible on all workspaces: ${errorMessage}`)
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
  }, [getVisibleOnAllWorkspacesSettings])

  return <CheatSheet />
}
