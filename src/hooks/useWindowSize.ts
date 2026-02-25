'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

import { invoke } from '@tauri-apps/api/core'
import {
  currentMonitor,
  getCurrentWindow,
  LogicalSize,
} from '@tauri-apps/api/window'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import { WindowSizeAPI, WindowSizeSettings } from '@/types/api/WindowSize'

export const useWindowSize = (
  selectedTitle: string,
  inputPath: string | undefined,
) => {
  const [isPinned, setIsPinned] = useState(false)
  // 保存済みの論理ピクセルサイズ。null のときはピン留めなし
  const savedSizeRef = useRef<WindowSizeSettings | null>(null)
  // プログラムによる setSize 実行中フラグ（onResized の再帰スナップバックを防ぐ）
  const isProgrammaticResizeRef = useRef(false)
  const unlistenRef = useRef<(() => void) | null>(null)

  // チートシート切り替え時: 保存済みサイズを取得してウィンドウに適用
  useEffect(() => {
    if (!selectedTitle || !inputPath) {
      setIsPinned(false)
      savedSizeRef.current = null
      return
    }

    let cancelled = false

    const loadAndApply = async () => {
      try {
        debug(`[useWindowSize] loadAndApply 開始: title="${selectedTitle}"`)
        const savedSize = await invoke<WindowSizeSettings | null>(
          WindowSizeAPI.GET_CHEAT_SHEET_WINDOW_SIZE,
          { inputPath, title: selectedTitle },
        )
        if (cancelled) return

        savedSizeRef.current = savedSize
        setIsPinned(savedSize !== null)

        if (savedSize) {
          debug(
            `[useWindowSize] setSize: ${savedSize.width}x${savedSize.height} for "${selectedTitle}"`,
          )
          isProgrammaticResizeRef.current = true
          try {
            const win = getCurrentWindow()
            await win.setSize(
              new LogicalSize(savedSize.width, savedSize.height),
            )
          } finally {
            isProgrammaticResizeRef.current = false
          }
        }
        debug(`[useWindowSize] loadAndApply 完了: title="${selectedTitle}"`)
      } catch (e) {
        if (!cancelled) {
          logError(`ウィンドウサイズの読み込みに失敗しました: ${e}`)
        }
      }
    }

    loadAndApply()

    return () => {
      cancelled = true
      savedSizeRef.current = null
      setIsPinned(false)
    }
  }, [selectedTitle, inputPath])

  // ウィンドウリサイズイベント: ピン留め状態なら保存済みサイズに戻す（ロック）
  useEffect(() => {
    if (!selectedTitle || !inputPath) return

    let active = true

    const setupListener = async () => {
      const win = getCurrentWindow()
      const unlisten = await win.onResized(async () => {
        if (!active) return
        if (isProgrammaticResizeRef.current) {
          debug(
            `[useWindowSize] onResized スキップ（プログラムによるリサイズ中）`,
          )
          return
        }
        if (!savedSizeRef.current) {
          debug(`[useWindowSize] onResized: ピン留めなし、スキップ`)
          return
        }
        // ピン留め中: 保存済みサイズに戻す
        debug(
          `[useWindowSize] onResized: ピン留め中のためサイズをロック: ${savedSizeRef.current.width}x${savedSizeRef.current.height}`,
        )
        isProgrammaticResizeRef.current = true
        try {
          await win.setSize(
            new LogicalSize(
              savedSizeRef.current.width,
              savedSizeRef.current.height,
            ),
          )
        } finally {
          isProgrammaticResizeRef.current = false
        }
      })

      // cleanup がすでに実行されていた場合はリスナーを即時解除
      if (!active) {
        unlisten()
        return
      }
      unlistenRef.current = unlisten
    }

    setupListener()

    return () => {
      active = false
      if (unlistenRef.current) {
        unlistenRef.current()
        unlistenRef.current = null
      }
    }
  }, [selectedTitle, inputPath])

  // ピン留めのトグル（PushPin クリック時）
  const togglePin = useCallback(async () => {
    if (!selectedTitle || !inputPath) return

    if (savedSizeRef.current) {
      // ピン留め中 → 解除（保存済みサイズを削除）
      debug(`[useWindowSize] ピン留め解除: title="${selectedTitle}"`)
      try {
        await invoke(WindowSizeAPI.SAVE_CHEAT_SHEET_WINDOW_SIZE, {
          inputPath,
          title: selectedTitle,
          windowSize: null,
        })
        savedSizeRef.current = null
        setIsPinned(false)
        debug(`[useWindowSize] ピン留め解除完了: title="${selectedTitle}"`)
      } catch (e) {
        logError(`ウィンドウサイズの削除に失敗しました: ${e}`)
      }
    } else {
      // 未ピン留め → ピン留め（現在のサイズを論理ピクセルで保存）
      debug(`[useWindowSize] ピン留め: title="${selectedTitle}"`)
      try {
        const win = getCurrentWindow()
        const [size, monitor] = await Promise.all([
          win.innerSize(),
          currentMonitor().catch(() => null),
        ])
        const scaleFactor = monitor?.scaleFactor ?? 1.0
        const logicalWidth = Math.round(size.width / scaleFactor)
        const logicalHeight = Math.round(size.height / scaleFactor)
        debug(
          `[useWindowSize] ピン留めサイズ: ${logicalWidth}x${logicalHeight} (物理: ${size.width}x${size.height}, scaleFactor: ${scaleFactor})`,
        )
        await invoke(WindowSizeAPI.SAVE_CHEAT_SHEET_WINDOW_SIZE, {
          inputPath,
          title: selectedTitle,
          windowSize: { width: logicalWidth, height: logicalHeight },
        })
        savedSizeRef.current = { width: logicalWidth, height: logicalHeight }
        setIsPinned(true)
        debug(`[useWindowSize] ピン留め完了: title="${selectedTitle}"`)
      } catch (e) {
        logError(`ウィンドウサイズの保存に失敗しました: ${e}`)
      }
    }
  }, [selectedTitle, inputPath])

  return { isPinned, togglePin }
}
