'use client'

import { useEffect } from 'react'

import { listen } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'

import { Event } from '@/common'
import { CheatSheet } from '@/components/organisms/CheatSheet'
import { FOCUS_FALLBACK_ID } from '@/constants/focus'

// バックエンド（toggle_cheatsheet_windows_visible）が全チートシートウィンドウの
// 現在の表示状態を集約して決定した目標状態を受け取り、その通りに適用する。
// 各ウィンドウが自分の表示状態だけを見て独立にトグルすると、ウィンドウごとに
// 表示/非表示がバラバラになり得るため、必ずバックエンドから渡された値に従う。
const setWindowVisible = async (visible: boolean) => {
  const window = getCurrentWindow()
  if (visible) {
    await window.show()
    await window.setFocus()
  } else {
    await window.hide()
  }
}

export default function Home() {
  useEffect(() => {
    let cancelled = false
    let unlistenToggle: (() => void) | null = null
    let unlistenFocused: (() => void) | null = null

    const setupListener = async () => {
      if (cancelled) return
      unlistenToggle = await listen<boolean>(
        Event.WINDOW_VISIABLE_TOGGLE,
        (event) => {
          ;(async () => {
            await setWindowVisible(event.payload)
          })()
        },
      )
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
      //
      // 【重要】WINDOW_FOCUSED は「自ウィンドウ宛」に emit_to されるため、
      // 必ず webview スコープの listen（getCurrentWebviewWindow().listen）で
      // 購読する。グローバル listen（@tauri-apps/api/event）はターゲット指定に
      // 関係なく全ウィンドウの emit を受信するため、複数チートシートウィンドウ
      // 環境では他ウィンドウ宛の WINDOW_FOCUSED も拾ってしまい、各ウィンドウが
      // setFocus() でフォーカスを奪い合う無限ループ（再描画の繰り返し）になる。
      unlistenFocused = await getCurrentWebviewWindow().listen<{}>(
        Event.WINDOW_FOCUSED,
        async () => {
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
          } else {
            // フォーカス可能な要素が無い場合（編集モード突入直後など activeElement が
            // body に戻っているケース）でも、ルートに常設したフォールバック要素へ
            // フォーカスして WKWebView の native first responder を取り戻す。
            document.getElementById(FOCUS_FALLBACK_ID)?.focus()
          }
        },
      )
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
  }, [])

  return <CheatSheet />
}
