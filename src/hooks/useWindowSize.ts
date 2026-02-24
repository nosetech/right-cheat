'use client'
import { useCallback, useEffect, useRef } from 'react'

import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

import { WindowSizeAPI, WindowSizeSettings } from '@/types/api/WindowSize'

const DEBOUNCE_DELAY_MS = 500

export const useWindowSize = (
  selectedTitle: string,
  inputPath: string | undefined,
) => {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unlistenRef = useRef<(() => void) | null>(null)

  const applyWindowSize = useCallback(async (title: string, path: string) => {
    try {
      const settings = await invoke<WindowSizeSettings>(
        WindowSizeAPI.GET_CHEAT_SHEET_WINDOW_SIZE,
        { inputPath: path, title },
      )
      const win = getCurrentWindow()
      await win.setSize({
        type: 'Physical',
        width: settings.width,
        height: settings.height,
      })
    } catch (e) {
      // サイズ取得・適用に失敗しても動作を継続する
    }
  }, [])

  const saveWindowSize = useCallback(async (title: string, path: string) => {
    try {
      const win = getCurrentWindow()
      const size = await win.outerSize()
      await invoke(WindowSizeAPI.SAVE_CHEAT_SHEET_WINDOW_SIZE, {
        inputPath: path,
        title,
        width: size.width,
        height: size.height,
      })
    } catch (e) {
      // 保存失敗時は無視
    }
  }, [])

  // チートシート切り替え時にウィンドウサイズを復元
  useEffect(() => {
    if (!selectedTitle || !inputPath) return
    applyWindowSize(selectedTitle, inputPath)
  }, [selectedTitle, inputPath, applyWindowSize])

  // ウィンドウリサイズを監視してデバウンス付きで保存
  useEffect(() => {
    if (!selectedTitle || !inputPath) return

    let active = true

    const setupListener = async () => {
      const win = getCurrentWindow()
      const unlisten = await win.onResized(() => {
        if (!active) return
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }
        debounceTimerRef.current = setTimeout(() => {
          saveWindowSize(selectedTitle, inputPath)
        }, DEBOUNCE_DELAY_MS)
      })
      unlistenRef.current = unlisten
    }

    setupListener()

    return () => {
      active = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (unlistenRef.current) {
        unlistenRef.current()
        unlistenRef.current = null
      }
    }
  }, [selectedTitle, inputPath, saveWindowSize])
}
