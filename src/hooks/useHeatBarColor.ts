import { useEffect, useState } from 'react'

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { error as logError } from '@tauri-apps/plugin-log'

import { Event } from '@/common'
import { DEFAULT_HEAT_BAR_COLOR, HeatBarColorId } from '@/constants/heatPalette'
import {
  ClipboardSettings,
  ClipboardSettingsAPI,
} from '@/types/api/ClipboardSettings'

/**
 * Clipboard History ウィンドウ用に Heat bar color 設定を取得・購読するフック。
 * Preferences 側での変更は `CLIPBOARD_SETTINGS_CHANGED` イベント経由で
 * 再起動不要・即時反映される（ウィンドウ間はバックエンド経由の emit/listen で通知する制約）。
 */
export function useHeatBarColor(): HeatBarColorId {
  const [heatBarColor, setHeatBarColor] = useState<HeatBarColorId>(
    DEFAULT_HEAT_BAR_COLOR,
  )

  useEffect(() => {
    let cancelled = false

    invoke<ClipboardSettings>(ClipboardSettingsAPI.GET_CLIPBOARD_SETTINGS)
      .then((settings) => {
        if (!cancelled) setHeatBarColor(settings.heat_bar_color)
      })
      .catch((err) => {
        logError(
          `[useHeatBarColor] Failed to load clipboard settings: ${String(err)}`,
        )
      })

    const unlisten = listen<ClipboardSettings>(
      Event.CLIPBOARD_SETTINGS_CHANGED,
      (event) => {
        setHeatBarColor(event.payload.heat_bar_color)
      },
    )

    return () => {
      cancelled = true
      unlisten.then((fn) => fn())
    }
  }, [])

  return heatBarColor
}
