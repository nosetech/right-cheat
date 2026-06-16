'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

import { invoke } from '@tauri-apps/api/core'
import {
  currentMonitor,
  getCurrentWindow,
  LogicalSize,
} from '@tauri-apps/api/window'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import { useNotificationContext } from '@/context/NotificationContext'
import { WindowSizeAPI, WindowSizeSettings } from '@/types/api/WindowSize'

// setSize/setResizable は macOS の NSWindow 状態を変更するため WKWebView が
// first responder を失うことがある。
// 1. native イベント（styleMask 変更通知など）が処理されるまで 50ms 待機する
// 2. setFocus() でウィンドウのキーステータスを復元する
// 3. blur() → focus() で WKWebView の native first responder を強制的に再取得する
//    focus() 単独では document.activeElement がすでに対象要素の場合 no-op になり
//    WKWebView の native first responder が復元されないため blur() が必要
// 4. document.activeElement は 50ms 待機後に読む。
//    呼び出し側が事前に取得した値を渡すと、その後の DOM 変化（dropdown input
//    アンマウントなど）で body に戻り target=null になる race condition が生じる。
//    50ms 待機中に SheetSwitchButton の restoreFocusAfterClose（setTimeout=0）が
//    先に完了してトリガーボタンにフォーカスを移すため、その後に読めば正しい要素が得られる。
const restoreFocusAfterWindowOp = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 50))
  await getCurrentWindow().setFocus()

  const currentActive = document.activeElement as HTMLElement | null
  const target =
    currentActive &&
    currentActive !== document.body &&
    document.body.contains(currentActive)
      ? currentActive
      : null

  if (target) {
    target.blur()
    target.focus()
  }
}

export const useWindowSize = (selectedTitle: string, editMode = false) => {
  const [isPinned, setIsPinned] = useState(false)
  const { showError } = useNotificationContext() ?? {}
  const savedSizeRef = useRef<WindowSizeSettings | null>(null)
  const isResizableRef = useRef<boolean | null>(null)

  useEffect(() => {
    if (!selectedTitle) {
      setIsPinned(false)
      savedSizeRef.current = null
      if (isResizableRef.current !== true) {
        getCurrentWindow()
          .setResizable(true)
          .then(() => {
            isResizableRef.current = true
            return restoreFocusAfterWindowOp()
          })
          .catch((e) => logError(`Failed to call setResizable: ${e}`))
      }
      return
    }

    let cancelled = false

    const loadAndApply = async () => {
      debug(
        `[useWindowSize] loadAndApply started: title="${selectedTitle}", activeElement=${document.activeElement?.tagName}`,
      )
      try {
        const savedSize = await invoke<WindowSizeSettings | null>(
          WindowSizeAPI.GET_CHEAT_SHEET_WINDOW_SIZE,
          { title: selectedTitle },
        )
        if (cancelled) return

        savedSizeRef.current = savedSize
        setIsPinned(savedSize !== null)

        const win = getCurrentWindow()
        let windowOpPerformed = false
        if (savedSize) {
          debug(
            `[useWindowSize] setSize: ${savedSize.width}x${savedSize.height} for "${selectedTitle}"`,
          )
          await win.setSize(new LogicalSize(savedSize.width, savedSize.height))
          windowOpPerformed = true
          if (isResizableRef.current !== false) {
            debug(
              `[useWindowSize] Setting window non-resizable: "${selectedTitle}"`,
            )
            await win.setResizable(false)
            isResizableRef.current = false
          }
        } else {
          if (isResizableRef.current !== true) {
            debug(
              `[useWindowSize] Setting window resizable: "${selectedTitle}"`,
            )
            await win.setResizable(true)
            isResizableRef.current = true
            windowOpPerformed = true
          }
        }

        if (windowOpPerformed) {
          debug(
            `[useWindowSize] Restoring focus, starting: activeElement=${document.activeElement?.tagName}`,
          )
          await restoreFocusAfterWindowOp()
          debug(
            `[useWindowSize] Focus restored: activeElement=${document.activeElement?.tagName}`,
          )
        } else {
          await restoreFocusAfterWindowOp()
        }
        debug(`[useWindowSize] loadAndApply complete: title="${selectedTitle}"`)
      } catch (e) {
        if (!cancelled) {
          logError(`Failed to load window size: ${e}`)
          showError?.('Failed to load window size')
        }
      }
    }

    loadAndApply()

    return () => {
      cancelled = true
      savedSizeRef.current = null
      setIsPinned(false)
    }
  }, [selectedTitle, showError])

  // 編集モードの切り替えに応じてリサイズ可否を制御する。
  // 編集モード中はピン留め（非リサイズ）でもウィンドウサイズを変更できるようにし、
  // 編集モード終了時はピン留め状態に応じてリサイズ可否を元に戻す。
  const prevEditModeRef = useRef(editMode)
  useEffect(() => {
    if (prevEditModeRef.current === editMode) return
    prevEditModeRef.current = editMode
    if (!selectedTitle) return

    const win = getCurrentWindow()
    // 編集モード中は常にリサイズ可。終了時はピン留めなら非リサイズに戻す。
    const shouldBeResizable = editMode ? true : savedSizeRef.current === null

    if (isResizableRef.current === shouldBeResizable) return
    ;(async () => {
      try {
        debug(
          `[useWindowSize] editMode=${editMode}: setResizable(${shouldBeResizable})`,
        )
        await win.setResizable(shouldBeResizable)
        isResizableRef.current = shouldBeResizable
        await restoreFocusAfterWindowOp()
      } catch (e) {
        logError(`[useWindowSize] Failed to toggle resizable: ${e}`)
      }
    })()
  }, [editMode, selectedTitle])

  const togglePin = useCallback(async () => {
    if (!selectedTitle) return

    debug(
      `[useWindowSize] togglePin started: activeElement=${document.activeElement?.tagName}`,
    )
    const win = getCurrentWindow()

    if (savedSizeRef.current) {
      debug(`[useWindowSize] Unpinning: title="${selectedTitle}"`)

      try {
        await invoke(WindowSizeAPI.SAVE_CHEAT_SHEET_WINDOW_SIZE, {
          title: selectedTitle,
          windowSize: null,
        })
      } catch (e) {
        logError(`Failed to delete window size: ${e}`)
        showError?.('Failed to unpin')
        return
      }

      const prevSavedSize = savedSizeRef.current
      savedSizeRef.current = null
      setIsPinned(false)
      try {
        await win.setResizable(true)
        isResizableRef.current = true
      } catch (e) {
        savedSizeRef.current = prevSavedSize
        setIsPinned(true)
        logError(`Failed to call setResizable: ${e}`)
        showError?.('Failed to unpin')
        return
      }

      await restoreFocusAfterWindowOp()
      debug(`[useWindowSize] Unpin complete: title="${selectedTitle}"`)
    } else {
      debug(`[useWindowSize] Pinning: title="${selectedTitle}"`)

      let logicalWidth: number
      let logicalHeight: number
      try {
        const [size, monitor] = await Promise.all([
          win.innerSize(),
          currentMonitor().catch(() => null),
        ])
        const scaleFactor = monitor?.scaleFactor ?? 1.0
        logicalWidth = Math.round(size.width / scaleFactor)
        logicalHeight = Math.round(size.height / scaleFactor)
        debug(
          `[useWindowSize] Pin size: ${logicalWidth}x${logicalHeight} (physical: ${size.width}x${size.height}, scaleFactor: ${scaleFactor})`,
        )
      } catch (e) {
        logError(`Failed to get window size: ${e}`)
        showError?.('Failed to get window size')
        return
      }

      try {
        await invoke(WindowSizeAPI.SAVE_CHEAT_SHEET_WINDOW_SIZE, {
          title: selectedTitle,
          windowSize: { width: logicalWidth, height: logicalHeight },
        })
      } catch (e) {
        logError(`Failed to save window size: ${e}`)
        showError?.('Failed to save window size')
        return
      }

      savedSizeRef.current = { width: logicalWidth, height: logicalHeight }
      setIsPinned(true)
      try {
        await win.setResizable(false)
        isResizableRef.current = false
      } catch (e) {
        savedSizeRef.current = null
        setIsPinned(false)
        logError(`Failed to call setResizable: ${e}`)
        showError?.('Failed to save pin')
        return
      }

      await restoreFocusAfterWindowOp()
      debug(`[useWindowSize] Pin complete: title="${selectedTitle}"`)
    }
  }, [selectedTitle, showError])

  return { isPinned, togglePin }
}
