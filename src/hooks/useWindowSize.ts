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

export const useWindowSize = (selectedTitle: string) => {
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

  const temporaryUnpin = useCallback(
    async (minWidth = 0, minHeight = 0): Promise<boolean> => {
      if (!savedSizeRef.current) return false

      const win = getCurrentWindow()
      try {
        await win.setResizable(true)
        isResizableRef.current = true

        const [size, monitor] = await Promise.all([
          win.innerSize(),
          currentMonitor().catch(() => null),
        ])
        const scaleFactor = monitor?.scaleFactor ?? 1.0
        const logicalWidth = Math.round(size.width / scaleFactor)
        const logicalHeight = Math.round(size.height / scaleFactor)

        if (logicalWidth < minWidth || logicalHeight < minHeight) {
          await win.setSize(
            new LogicalSize(
              Math.max(logicalWidth, minWidth),
              Math.max(logicalHeight, minHeight),
            ),
          )
        }

        await restoreFocusAfterWindowOp()
        debug(
          `[useWindowSize] temporaryUnpin: resizable=true, size=>=( ${minWidth}x${minHeight})`,
        )
        return true
      } catch (e) {
        logError(`[useWindowSize] temporaryUnpin failed: ${e}`)
        return false
      }
    },
    [],
  )

  const restorePin = useCallback(async (): Promise<void> => {
    if (!savedSizeRef.current) return

    const win = getCurrentWindow()
    try {
      await win.setSize(
        new LogicalSize(
          savedSizeRef.current.width,
          savedSizeRef.current.height,
        ),
      )
      await win.setResizable(false)
      isResizableRef.current = false
      await restoreFocusAfterWindowOp()
      debug(
        `[useWindowSize] restorePin: size=${savedSizeRef.current.width}x${savedSizeRef.current.height}, resizable=false`,
      )
    } catch (e) {
      logError(`[useWindowSize] restorePin failed: ${e}`)
    }
  }, [])

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

  return { isPinned, togglePin, temporaryUnpin, restorePin }
}
