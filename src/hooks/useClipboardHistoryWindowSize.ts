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
import { restoreFocusAfterWindowOp } from '@/utils/windowFocus'

/**
 * Clipboard History ウィンドウのサイズのピン留め（保存・復元）を管理するフック。
 *
 * チートシートウィンドウの {@link useWindowSize} と同等だが、保存先は
 * チートシートの DB ではなく設定ファイル（tauri-plugin-store）で、単一ウィンドウの
 * ため対象タイトルを持たない。
 *
 * - マウント時: 保存済みサイズがあれば適用してリサイズ不可にする
 * - ピン留め時: 現在のウィンドウサイズ（論理ピクセル）を保存し `setResizable(false)`
 * - ピン留め解除時: 保存値を削除し `setResizable(true)`
 * - 編集モード中はピン留めでもサイズ変更を許容し、終了時にピン留めサイズへ戻す
 */
export const useClipboardHistoryWindowSize = (editMode = false) => {
  const [isPinned, setIsPinned] = useState(false)
  const { showError } = useNotificationContext() ?? {}
  const savedSizeRef = useRef<WindowSizeSettings | null>(null)
  const isResizableRef = useRef<boolean | null>(null)

  // マウント時に保存済みサイズを読み込み、あれば適用する
  useEffect(() => {
    let cancelled = false

    const loadAndApply = async () => {
      try {
        const savedSize = await invoke<WindowSizeSettings | null>(
          WindowSizeAPI.GET_CLIPBOARD_HISTORY_WINDOW_SIZE,
        )
        if (cancelled) return

        savedSizeRef.current = savedSize
        setIsPinned(savedSize !== null)

        const win = getCurrentWindow()
        if (savedSize) {
          debug(
            `[useClipboardHistoryWindowSize] setSize: ${savedSize.width}x${savedSize.height}`,
          )
          await win.setSize(new LogicalSize(savedSize.width, savedSize.height))
          await win.setResizable(false)
          isResizableRef.current = false
        } else {
          await win.setResizable(true)
          isResizableRef.current = true
        }
        await restoreFocusAfterWindowOp()
      } catch (e) {
        if (!cancelled) {
          logError(
            `[useClipboardHistoryWindowSize] Failed to load window size: ${e}`,
          )
          showError?.('Failed to load window size')
        }
      }
    }

    loadAndApply()

    return () => {
      cancelled = true
    }
  }, [showError])

  // 編集モードの切り替えに応じてリサイズ可否を制御する。
  // 編集モード中は常にリサイズ可、終了時はピン留め状態へ戻す。
  const prevEditModeRef = useRef(editMode)
  useEffect(() => {
    if (prevEditModeRef.current === editMode) return
    prevEditModeRef.current = editMode

    const win = getCurrentWindow()
    const savedSize = savedSizeRef.current
    const shouldBeResizable = editMode ? true : savedSize === null
    const shouldRestoreSize = !editMode && savedSize !== null

    if (isResizableRef.current === shouldBeResizable && !shouldRestoreSize)
      return
    ;(async () => {
      try {
        if (shouldRestoreSize && savedSize) {
          debug(
            `[useClipboardHistoryWindowSize] editMode end: restore pinned size ${savedSize.width}x${savedSize.height}`,
          )
          await win.setSize(new LogicalSize(savedSize.width, savedSize.height))
        }
        if (isResizableRef.current !== shouldBeResizable) {
          debug(
            `[useClipboardHistoryWindowSize] editMode=${editMode}: setResizable(${shouldBeResizable})`,
          )
          await win.setResizable(shouldBeResizable)
          isResizableRef.current = shouldBeResizable
        }
        await restoreFocusAfterWindowOp()
      } catch (e) {
        logError(
          `[useClipboardHistoryWindowSize] Failed to toggle resizable: ${e}`,
        )
      }
    })()
  }, [editMode])

  const togglePin = useCallback(async () => {
    const win = getCurrentWindow()

    if (savedSizeRef.current) {
      debug('[useClipboardHistoryWindowSize] Unpinning')
      try {
        await invoke(WindowSizeAPI.SAVE_CLIPBOARD_HISTORY_WINDOW_SIZE, {
          windowSize: null,
        })
      } catch (e) {
        logError(`[useClipboardHistoryWindowSize] Failed to unpin: ${e}`)
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
        logError(`[useClipboardHistoryWindowSize] Failed to unpin: ${e}`)
        showError?.('Failed to unpin')
        return
      }

      await restoreFocusAfterWindowOp()
    } else {
      debug('[useClipboardHistoryWindowSize] Pinning')

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
      } catch (e) {
        logError(`[useClipboardHistoryWindowSize] Failed to get size: ${e}`)
        showError?.('Failed to get window size')
        return
      }

      try {
        await invoke(WindowSizeAPI.SAVE_CLIPBOARD_HISTORY_WINDOW_SIZE, {
          windowSize: { width: logicalWidth, height: logicalHeight },
        })
      } catch (e) {
        logError(`[useClipboardHistoryWindowSize] Failed to save size: ${e}`)
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
        logError(`[useClipboardHistoryWindowSize] Failed to save pin: ${e}`)
        showError?.('Failed to save pin')
        return
      }

      await restoreFocusAfterWindowOp()
    }
  }, [showError])

  return { isPinned, togglePin }
}
