'use client'

import { useEffect } from 'react'

import { listen } from '@tauri-apps/api/event'
import {
  cursorPosition,
  getCurrentWindow,
  LogicalPosition,
  monitorFromPoint,
  primaryMonitor,
  type WebviewWindow,
} from '@tauri-apps/api/window'

import { Event } from '@/common'
import { CheatSheet } from '@/components/organisms/CheatSheet'

const fallbackToPrimaryMonitor = async (window: WebviewWindow) => {
  try {
    const primaryMon = await primaryMonitor()
    if (primaryMon) {
      // プライマリモニター中央に配置
      const centerX =
        primaryMon.position.x +
        primaryMon.size.width / primaryMon.scaleFactor / 2
      const centerY =
        primaryMon.position.y +
        primaryMon.size.height / primaryMon.scaleFactor / 2

      const windowSize = await window.outerSize()
      const logicalSize = windowSize.toLogical(primaryMon.scaleFactor)

      const windowX = centerX - logicalSize.width / 2
      const windowY = centerY - logicalSize.height / 2

      await window.setPosition(new LogicalPosition(windowX, windowY))
    }
    await window.show()
    await window.setFocus()
  } catch (error) {
    console.error('Fallback to primary monitor failed:', error)
    // 最終フォールバック: 位置変更せずに表示
    await window.show()
    await window.setFocus()
  }
}

const changeWindowVisible = async () => {
  const window = getCurrentWindow()
  if (await window.isVisible()) {
    await window.hide()
  } else {
    try {
      // カーソル位置を取得
      const cursorPos = await cursorPosition()

      // カーソルがあるモニターを検出
      const targetMonitor = await monitorFromPoint(cursorPos.x, cursorPos.y)

      if (targetMonitor) {
        // モニターの中央座標を計算（DPIスケーリングを考慮）
        const centerX =
          targetMonitor.position.x +
          targetMonitor.size.width / targetMonitor.scaleFactor / 2
        const centerY =
          targetMonitor.position.y +
          targetMonitor.size.height / targetMonitor.scaleFactor / 2

        // ウィンドウサイズを取得して中央配置のための位置を計算
        const windowSize = await window.outerSize()
        const logicalSize = windowSize.toLogical(targetMonitor.scaleFactor)

        const windowX = centerX - logicalSize.width / 2
        const windowY = centerY - logicalSize.height / 2

        // ウィンドウを移動
        await window.setPosition(new LogicalPosition(windowX, windowY))

        // ウィンドウを表示してフォーカス
        await window.show()
        await window.setFocus()
      } else {
        // モニター検出失敗時のフォールバック
        console.warn(
          'Failed to detect monitor from cursor position, using primary monitor',
        )
        await fallbackToPrimaryMonitor(window)
      }
    } catch (error) {
      // エラー時のフォールバック処理
      console.error('Error positioning window:', error)
      await fallbackToPrimaryMonitor(window)
    }
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
