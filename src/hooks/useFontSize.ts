import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
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
      } catch (error) {
        console.error('Failed to load font size settings:', error)
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
    } catch (error) {
      console.error('Failed to increase font size:', error)
    }
  }

  const decreaseFontSize = async () => {
    try {
      const newSettings = await invoke<FontSizeSettings>(
        FontSizeAPI.DECREASE_FONT_SIZE,
      )
      setFontSizeSettings(newSettings)
    } catch (error) {
      console.error('Failed to decrease font size:', error)
    }
  }

  const resetFontSize = async () => {
    try {
      const newSettings = await invoke<FontSizeSettings>(
        FontSizeAPI.RESET_FONT_SIZE,
      )
      setFontSizeSettings(newSettings)
    } catch (error) {
      console.error('Failed to reset font size:', error)
    }
  }

  return {
    fontSizeSettings,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
  }
}
