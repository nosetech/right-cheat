'use client'

import { useEffect } from 'react'

import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { error } from '@tauri-apps/plugin-log'

import { Event } from '@/common'
import { CheatSheet } from '@/components/organisms/CheatSheet'
import { useNotificationContext } from '@/context/NotificationContext'
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
  const { showError } = useNotificationContext() ?? {}

  useEffect(() => {
    let cancelled = false
    let unlistenToggle: (() => void) | null = null
    let unlistenFocused: (() => void) | null = null

    const setupListener = async () => {
      // アプリケーション初期化時に設定ファイルから取得した値を使用
      try {
        const window = getCurrentWindow()
        const visibleOnAllWorkspaces = await getVisibleOnAllWorkspacesSettings()
        if (cancelled) return
        await window.setVisibleOnAllWorkspaces(visibleOnAllWorkspaces)
      } catch (err) {
        if (cancelled) return
        const errorMessage = err instanceof Error ? err.message : String(err)
        error(`[page] Failed to set visible on all workspaces: ${errorMessage}`)
        showError?.('全ワークスペース表示設定の初期化に失敗しました')
      }

      if (cancelled) return
      unlistenToggle = await listen<{}>(Event.WINDOW_VISIABLE_TOGGLE, () => {
        ;(async () => {
          await changeWindowVisible()
        })()
      })
      // cleanup が先に実行された場合は即座に解除
      if (cancelled) {
        unlistenToggle()
        unlistenToggle = null
        return
      }

      // Command+Tab などでアプリがアクティブになった際、WKWebView が
      // キーボードの first responder を取得できない場合がある。
      // Rust 側の WindowEvent::Focused(true) を検知して emit された
      // イベントを受け取り、WKWebView のフォーカスを復元する。
      unlistenFocused = await listen<{}>(Event.WINDOW_FOCUSED, async () => {
        const focused = document.activeElement as HTMLElement | null
        // Rust の WindowEvent::Focused(true) 検知後に emit されるため、
        // native イベントの後処理は完了済み。useWindowSize.ts の
        // restoreFocusAfterWindowOp() と異なり待機は不要。
        await getCurrentWindow().setFocus()
        if (
          focused &&
          focused !== document.body &&
          document.body.contains(focused)
        ) {
          focused.blur()
          focused.focus()
        }
      })
      if (cancelled) {
        unlistenFocused()
        unlistenFocused = null
      }
    }

    setupListener()

    return () => {
      cancelled = true
      if (unlistenToggle) {
        unlistenToggle()
      }
      if (unlistenFocused) {
        unlistenFocused()
      }
    }
  }, [getVisibleOnAllWorkspacesSettings, showError])

  return <CheatSheet />
}
