import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { error } from '@tauri-apps/plugin-log'
import { useEffect, useState } from 'react'

import {
  FontSizeAPI,
  FontSizeEvent,
  type FontSizeSettings,
} from '@/types/api/FontSize'

const DEFAULT_FONT_SIZE_SETTINGS: FontSizeSettings = {
  level: 2,
  scale: 1.0,
}

export const useFontSize = () => {
  const [fontSizeSettings, setFontSizeSettings] = useState<FontSizeSettings>(
    DEFAULT_FONT_SIZE_SETTINGS,
  )

  useEffect(() => {
    // Load initial font size settings
    const loadFontSizeSettings = async () => {
      try {
        const settings = await invoke<FontSizeSettings>(
          FontSizeAPI.GET_FONT_SIZE_SETTINGS,
        )
        setFontSizeSettings(settings)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        error(
          `[useFontSize] Failed to load font size settings: ${errorMessage}`,
        )
      }
    }

    loadFontSizeSettings()

    // Listen for font size changes
    const unlisten = listen<FontSizeSettings>(
      FontSizeEvent.FONT_SIZE_CHANGED,
      (event) => {
        setFontSizeSettings(event.payload)
      },
    )

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  const increaseFontSize = async () => {
    try {
      const newSettings = await invoke<FontSizeSettings>(
        FontSizeAPI.INCREASE_FONT_SIZE,
      )
      setFontSizeSettings(newSettings)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      error(`[useFontSize] Failed to increase font size: ${errorMessage}`)
    }
  }

  const decreaseFontSize = async () => {
    try {
      const newSettings = await invoke<FontSizeSettings>(
        FontSizeAPI.DECREASE_FONT_SIZE,
      )
      setFontSizeSettings(newSettings)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      error(`[useFontSize] Failed to decrease font size: ${errorMessage}`)
    }
  }

  const resetFontSize = async () => {
    try {
      const newSettings = await invoke<FontSizeSettings>(
        FontSizeAPI.RESET_FONT_SIZE,
      )
      setFontSizeSettings(newSettings)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      error(`[useFontSize] Failed to reset font size: ${errorMessage}`)
    }
  }

  return {
    fontSizeSettings,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
  }
}
