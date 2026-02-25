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

// setSize/setResizable は macOS の NSWindow 状態を変更するため WKWebView が
// first responder を失うことがある。
// 1. native イベント（styleMask 変更通知など）が処理されるまで 50ms 待機する
// 2. setFocus() でウィンドウのキーステータスを復元する
// 3. blur() → focus() で WKWebView の native first responder を強制的に再取得する
//    focus() 単独では document.activeElement がすでに対象要素の場合 no-op になり
//    WKWebView の native first responder が復元されないため blur() が必要
// 4. macOS WebKit では <button> クリックでは document.activeElement が変わらないため
//    focused が document.body の場合は input[type="text"] をフォールバックとして使う
const restoreFocusAfterWindowOp = async (
  focused: HTMLElement | null,
): Promise<void> => {
  // native イベントの後処理が完了するまで待ってから setFocus を呼ぶ
  await new Promise<void>((resolve) => setTimeout(resolve, 50))
  await getCurrentWindow().setFocus()

  const target =
    focused && focused !== document.body && document.body.contains(focused)
      ? focused
      : null

  if (target) {
    target.blur()
    target.focus()
  }
}

export const useWindowSize = (
  selectedTitle: string,
  inputPath: string | undefined,
) => {
  const [isPinned, setIsPinned] = useState(false)
  // 保存済みの論理ピクセルサイズ。null のときはピン留めなし
  const savedSizeRef = useRef<WindowSizeSettings | null>(null)
  // ウィンドウの実際のリサイズ可否状態を追跡（null = 不明）
  // 変化がある場合のみ setResizable を呼ぶことで副作用を最小化する。
  const isResizableRef = useRef<boolean | null>(null)

  // チートシート切り替え時: 保存済みサイズを取得してウィンドウに適用し、
  // ピン留め状態に応じてリサイズ可否を設定する
  useEffect(() => {
    if (!selectedTitle || !inputPath) {
      setIsPinned(false)
      savedSizeRef.current = null
      if (isResizableRef.current !== true) {
        // ピン留め状態（非リサイズ可）から選択解除（ESC など）に遷移する場合、
        // setResizable(true) で WKWebView が first responder を失うため復元が必要
        const focused = document.activeElement as HTMLElement | null
        getCurrentWindow()
          .setResizable(true)
          .then(() => {
            isResizableRef.current = true
            return restoreFocusAfterWindowOp(focused)
          })
          .catch((e) => logError(`setResizable に失敗しました: ${e}`))
      }
      return
    }

    let cancelled = false

    const loadAndApply = async () => {
      // await の前にフォーカスを取得する。invoke 待機中の React 再レンダリングや
      // setSize/setResizable による WKWebView first responder 消失でフォーカスが
      // 失われることがあるため、処理完了後に復元する。
      // WebKit では button クリック時にフォーカスが document.body になることがあるが、
      // その場合も setFocus() だけは必ず呼んで WKWebView の first responder を復元する。
      const focusedAtStart = document.activeElement as HTMLElement | null
      debug(
        `[useWindowSize] loadAndApply 開始: title="${selectedTitle}", activeElement=${focusedAtStart?.tagName}`,
      )
      try {
        const savedSize = await invoke<WindowSizeSettings | null>(
          WindowSizeAPI.GET_CHEAT_SHEET_WINDOW_SIZE,
          { inputPath, title: selectedTitle },
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
              `[useWindowSize] ウィンドウをリサイズ不可に設定: "${selectedTitle}"`,
            )
            await win.setResizable(false)
            isResizableRef.current = false
          }
        } else {
          if (isResizableRef.current !== true) {
            debug(
              `[useWindowSize] ウィンドウをリサイズ可能に設定: "${selectedTitle}"`,
            )
            await win.setResizable(true)
            isResizableRef.current = true
            windowOpPerformed = true
          }
        }

        if (windowOpPerformed) {
          debug(
            `[useWindowSize] フォーカス復元開始: activeElement=${document.activeElement?.tagName}`,
          )
          await restoreFocusAfterWindowOp(focusedAtStart)
          debug(
            `[useWindowSize] フォーカス復元完了: activeElement=${document.activeElement?.tagName}`,
          )
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

  // ピン留めのトグル（PushPin クリック時）
  const togglePin = useCallback(async () => {
    if (!selectedTitle || !inputPath) return

    // await の前にフォーカスを取得する。setResizable で WKWebView が
    // first responder を失うため、処理後に復元する。
    // macOS WebKit では button クリックでは document.activeElement が変わらないため、
    // focusedBeforePin が document.body になる場合も setFocus() は必ず呼ぶ。
    const focusedBeforePin = document.activeElement as HTMLElement | null
    debug(
      `[useWindowSize] togglePin 開始: activeElement=${focusedBeforePin?.tagName}`,
    )
    const win = getCurrentWindow()

    if (savedSizeRef.current) {
      // ピン留め中 → 解除（保存済みサイズを削除してリサイズ可能に戻す）
      debug(`[useWindowSize] ピン留め解除: title="${selectedTitle}"`)
      try {
        await invoke(WindowSizeAPI.SAVE_CHEAT_SHEET_WINDOW_SIZE, {
          inputPath,
          title: selectedTitle,
          windowSize: null,
        })
        savedSizeRef.current = null
        setIsPinned(false)
        await win.setResizable(true)
        isResizableRef.current = true
        await restoreFocusAfterWindowOp(focusedBeforePin)
        debug(`[useWindowSize] ピン留め解除完了: title="${selectedTitle}"`)
      } catch (e) {
        logError(`ウィンドウサイズの削除に失敗しました: ${e}`)
      }
    } else {
      // 未ピン留め → ピン留め（現在のサイズを論理ピクセルで保存してリサイズ不可に）
      debug(`[useWindowSize] ピン留め: title="${selectedTitle}"`)
      try {
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
        await win.setResizable(false)
        isResizableRef.current = false
        await restoreFocusAfterWindowOp(focusedBeforePin)
        debug(`[useWindowSize] ピン留め完了: title="${selectedTitle}"`)
      } catch (e) {
        logError(`ウィンドウサイズの保存に失敗しました: ${e}`)
      }
    }
  }, [selectedTitle, inputPath])

  return { isPinned, togglePin }
}
